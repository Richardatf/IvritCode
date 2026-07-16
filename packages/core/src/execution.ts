import { parseProgram, type IvritProgram, type ParsedInstruction } from "@ivritcode/unicode";
import { StepLimitExceededError, UnsupportedModifierError } from "./errors.js";
import { applyLetter, getInstructionDefinition } from "./instructions.js";
import { makeZeroState, normalizeState, type IvritState } from "./state.js";
export type TraceMode = "none" | "summary" | "full";
export type HaltReason = "end-of-input" | "explicit-tav-dagesh";
export interface RegisterChange {
  readonly index: number;
  readonly before: number;
  readonly after: number;
}
export interface ExecutionStep {
  readonly step: number;
  readonly instruction: ParsedInstruction;
  readonly before?: IvritState;
  readonly after?: IvritState;
  readonly changedRegisters: readonly RegisterChange[];
  readonly alephOlamBefore: number;
  readonly alephOlamAfter: number;
  readonly halted: boolean;
  readonly notes: readonly string[];
}
export interface ExecutionContext {
  readonly engineVersion: string;
  readonly programName?: string;
  readonly currentStep: number;
  readonly maxSteps: number;
  readonly halted: boolean;
  readonly haltReason?: HaltReason;
  readonly deterministicSeed: number;
  readonly permissions: ReadonlySet<string>;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly strictModifiers: boolean;
  readonly debug: boolean;
  readonly programHash: string;
  readonly startedAt: string;
  readonly completedAt: string;
}
export interface PolicyDecision {
  readonly allowed: boolean;
  readonly reason?: string;
}
export interface ExecutionPolicy {
  allow(
    instruction: ParsedInstruction,
    state: IvritState,
    context: ExecutionContext,
  ): PolicyDecision;
}
export const defaultExecutionPolicy: ExecutionPolicy = { allow: () => ({ allowed: true }) };
export interface ExecutionOptions {
  readonly initialState?: IvritState;
  readonly maxSteps?: number;
  readonly trace?: TraceMode;
  readonly strictModifiers?: boolean;
  readonly programName?: string;
  readonly deterministicSeed?: number;
  readonly permissions?: ReadonlySet<string>;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly debug?: boolean;
  readonly policy?: ExecutionPolicy;
}
export interface ExecutionResult {
  readonly finalState: IvritState;
  readonly stepsExecuted: number;
  readonly halted: boolean;
  readonly haltReason: HaltReason;
  readonly trace: readonly ExecutionStep[];
  readonly context: ExecutionContext;
  readonly program: IvritProgram;
}
const hasDagesh = (instruction: ParsedInstruction) =>
  instruction.niqqud.some((mark) => mark.name === "Dagesh");
const programHash = (source: string) => {
  let hash = 2166136261;
  for (const character of source) {
    hash ^= character.codePointAt(0)!;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};
const contextFor = (
  program: IvritProgram,
  options: ExecutionOptions,
  currentStep: number,
  halted: boolean,
  haltReason?: HaltReason,
): ExecutionContext => {
  const now = new Date().toISOString();
  return {
    engineVersion: "1.0.0",
    ...(options.programName ? { programName: options.programName } : {}),
    currentStep,
    maxSteps: options.maxSteps ?? 10_000,
    halted,
    ...(haltReason ? { haltReason } : {}),
    deterministicSeed: options.deterministicSeed ?? 0,
    permissions: options.permissions ?? new Set(),
    metadata: options.metadata ?? {},
    strictModifiers: options.strictModifiers ?? false,
    debug: options.debug ?? false,
    programHash: programHash(program.normalizedSource),
    startedAt: now,
    completedAt: now,
  };
};
export function stepInstruction(
  state: IvritState,
  instruction: ParsedInstruction,
  options: Pick<ExecutionOptions, "strictModifiers"> = {},
): IvritState {
  if (options.strictModifiers) {
    const unsupported = instruction.niqqud.find(
      (mark) => !(instruction.letter === "ת" && mark.name === "Dagesh"),
    );
    if (unsupported)
      throw new UnsupportedModifierError(
        `${unsupported.name} is recognized, but ${getInstructionDefinition(instruction.letter).name} has no ${unsupported.name} behavior in strict mode.`,
        instruction.source,
        "Use permissive mode or remove the mark.",
      );
    if (instruction.cantillation.length)
      throw new UnsupportedModifierError(
        `${instruction.cantillation[0]!.name} is preserved but has no execution behavior in strict mode.`,
        instruction.source,
        "Use permissive mode to retain it as neutral.",
      );
  }
  return applyLetter(state, instruction.letter);
}
export function executeProgram(
  sourceOrProgram: string | IvritProgram,
  options: ExecutionOptions = {},
): ExecutionResult {
  const program =
      typeof sourceOrProgram === "string" ? parseProgram(sourceOrProgram) : sourceOrProgram,
    maxSteps = options.maxSteps ?? 10_000,
    traceMode = options.trace ?? "full";
  if (!Number.isInteger(maxSteps) || maxSteps < 0)
    throw new RangeError("maxSteps must be a non-negative integer.");
  let state = normalizeState(options.initialState ?? makeZeroState());
  const trace: ExecutionStep[] = [];
  let halted = false,
    haltReason: HaltReason = "end-of-input",
    steps = 0;
  for (const instruction of program.instructions) {
    if (steps >= maxSteps)
      throw new StepLimitExceededError(maxSteps, steps, state, trace, instruction);
    const baseContext = contextFor(program, options, steps, false);
    const decision = (options.policy ?? defaultExecutionPolicy).allow(
      instruction,
      state,
      baseContext,
    );
    if (!decision.allowed)
      throw new Error(
        `Execution policy denied ${instruction.letter}: ${decision.reason ?? "no reason supplied"}`,
      );
    const before = state,
      stateAfter = stepInstruction(state, instruction, options),
      explicit = instruction.letter === "ת" && hasDagesh(instruction),
      changes = before.flatMap((value, index) =>
        value === stateAfter[index] ? [] : [{ index, before: value, after: stateAfter[index]! }],
      );
    steps++;
    halted = explicit;
    haltReason = explicit ? "explicit-tav-dagesh" : "end-of-input";
    if (traceMode !== "none")
      trace.push({
        step: steps,
        instruction,
        ...(traceMode === "full" ? { before, after: stateAfter } : {}),
        changedRegisters: changes,
        alephOlamBefore: before[22]!,
        alephOlamAfter: stateAfter[22]!,
        halted: explicit,
        notes: [
          ...(instruction.niqqud.length
            ? [`Niqqud: ${instruction.niqqud.map((m) => m.name).join(", ")}`]
            : []),
          ...(instruction.cantillation.length
            ? [`Cantillation: ${instruction.cantillation.map((m) => m.name).join(", ")}`]
            : []),
          ...(explicit ? ["Explicit halt after sealed Tav checkpoint"] : []),
        ],
      });
    state = stateAfter;
    if (explicit) break;
  }
  if (!halted) halted = true;
  const context = contextFor(program, options, steps, halted, haltReason);
  return { finalState: state, stepsExecuted: steps, halted, haltReason, trace, context, program };
}
export function disassembleProgram(sourceOrProgram: string | IvritProgram): string {
  const program =
    typeof sourceOrProgram === "string" ? parseProgram(sourceOrProgram) : sourceOrProgram;
  return program.instructions
    .map((item, index) => {
      const definition = getInstructionDefinition(item.letter),
        marks = [...item.niqqud.map((m) => m.name), ...item.cantillation.map((m) => m.name)];
      return `${String(index).padStart(4, "0")}  ${item.source.raw}  ${definition.name.padEnd(7)}  op=${item.opcodeIndex.toString().padStart(2, "0")}  ${marks.length ? `[${marks.join(", ")}]  ` : ""}${definition.summary}  @ ${item.source.line}:${item.source.column}`;
    })
    .join("\n");
}
