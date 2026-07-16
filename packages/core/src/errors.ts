import type { ParsedInstruction, SourceLocation } from "@ivritcode/unicode";
export class IvritCodeError extends Error {
  constructor(
    message: string,
    readonly source?: SourceLocation,
    readonly suggestion?: string,
  ) {
    super(
      `${source ? `${source.filename ?? "<input>"}:${source.line}:${source.column}\n\n` : ""}${message}${suggestion ? `\n\n${suggestion}` : ""}`,
    );
    this.name = new.target.name;
  }
}
export class ParseError extends IvritCodeError {}
export class UnknownInstructionError extends IvritCodeError {}
export class InvalidStateError extends IvritCodeError {}
export class UnsupportedModifierError extends IvritCodeError {}
export class ExplicitHaltError extends IvritCodeError {}
export class CliUsageError extends IvritCodeError {}
export class ChavrutaRequestError extends IvritCodeError {}
export class ChavrutaResponseError extends IvritCodeError {}
export class StepLimitExceededError extends IvritCodeError {
  constructor(
    readonly maximumSteps: number,
    readonly currentStep: number,
    readonly partialState: readonly number[],
    readonly partialTrace: readonly unknown[],
    readonly lastInstruction?: ParsedInstruction,
  ) {
    super(
      `Maximum step count ${maximumSteps} exceeded at step ${currentStep}.`,
      lastInstruction?.source,
      "Increase maxSteps or shorten the program.",
    );
  }
}
