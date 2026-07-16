import { HEBREW_LETTERS, LETTER_NAMES, type HebrewLetter } from "./alphabet.js";
import { ProgramStepLimitError, UnsupportedModifierError } from "./errors.js";
import type { ParsedInstruction } from "./instruction.js";
import { parseProgram, type IvritProgram } from "./parser.js";
import { makeZeroState, normalizeState, type IvritState } from "./state.js";
import { stepLetter } from "./vm.js";

export interface ExecutionContext {
  engineVersion: string;
  programName?: string;
  currentStep: number;
  maximumSteps: number;
  deterministicSeed?: number;
  permissionFlags: readonly string[];
  error?: string;
  metadata: Readonly<Record<string, unknown>>;
}

export interface ExecutionTrace {
  index: number;
  instruction: ParsedInstruction;
  before: number[];
  after: number[];
}

export interface RunResult {
  finalState: number[];
  trace: ExecutionTrace[];
  program: IvritProgram;
  context: ExecutionContext;
}

export interface ExecuteOptions {
  initialState?: IvritState;
  maxSteps?: number;
  strictModifiers?: boolean;
  filename?: string;
  programName?: string;
  deterministicSeed?: number;
}

export function stepInstruction(state: IvritState, instruction: ParsedInstruction, strictModifiers = false): number[] {
  const before = normalizeState(state);
  if (strictModifiers && instruction.niqqud.length > 0) {
    throw new UnsupportedModifierError(
      `${instruction.niqqud[0].name} is recognized but has no execution behavior in strict mode.`,
      instruction.source,
    );
  }
  return normalizeState(stepLetter(before, instruction.letter));
}

export function executeProgram(sourceOrProgram: string | IvritProgram, options: ExecuteOptions = {}): RunResult {
  const program = typeof sourceOrProgram === "string"
    ? parseProgram(sourceOrProgram, { filename: options.filename })
    : sourceOrProgram;
  const maximumSteps = options.maxSteps ?? 1000;
  if (!Number.isInteger(maximumSteps) || maximumSteps < 0) throw new RangeError("maxSteps must be a non-negative integer.");
  if (program.instructions.length > maximumSteps) {
    const instruction = program.instructions[maximumSteps];
    throw new ProgramStepLimitError(`Program requires more than the configured ${maximumSteps} steps.`, instruction?.source);
  }

  let current = normalizeState(options.initialState ?? makeZeroState());
  const trace: ExecutionTrace[] = [];
  for (const [index, instruction] of program.instructions.entries()) {
    const before = current.slice();
    current = stepInstruction(current, instruction, options.strictModifiers);
    trace.push({ index, instruction, before, after: current.slice() });
  }
  return {
    finalState: current,
    trace,
    program,
    context: {
      engineVersion: "1.0.0",
      programName: options.programName,
      currentStep: trace.length,
      maximumSteps,
      deterministicSeed: options.deterministicSeed,
      permissionFlags: [],
      metadata: {},
    },
  };
}

export function disassembleProgram(sourceOrProgram: string | IvritProgram): string {
  const program = typeof sourceOrProgram === "string" ? parseProgram(sourceOrProgram) : sourceOrProgram;
  return program.instructions.map((instruction, index) => {
    const marks = [...instruction.niqqud.map((m) => m.name), ...instruction.cantillation.map((m) => `U+${m.codePoint.toString(16).toUpperCase()}`)];
    const location = `${instruction.source.line}:${instruction.source.column}`;
    return `${String(index).padStart(4, "0")} ${instruction.letter} ${LETTER_NAMES[instruction.opcodeIndex]}${marks.length ? ` [${marks.join(", ")}]` : ""} @ ${location}`;
  }).join("\n");
}

export function instructionName(letter: HebrewLetter): string {
  return LETTER_NAMES[HEBREW_LETTERS.indexOf(letter)];
}
