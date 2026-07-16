export interface SourceLocation {
  filename?: string;
  line: number;
  column: number;
  offset: number;
}

export class IvritCodeError extends Error {
  constructor(message: string, readonly source?: SourceLocation) {
    super(source ? `${formatSource(source)} ${message}` : message);
    this.name = new.target.name;
  }
}

export class InvalidMachineStateError extends IvritCodeError {}
export class UnknownInstructionError extends IvritCodeError {}
export class MalformedUnicodeError extends IvritCodeError {}
export class InvalidModifierError extends IvritCodeError {}
export class UnsupportedModifierError extends IvritCodeError {}
export class ProgramStepLimitError extends IvritCodeError {}
export class LexiconLoadingError extends IvritCodeError {}
export class CliUsageError extends IvritCodeError {}

export function formatSource(source: SourceLocation): string {
  return `${source.filename ?? "<input>"}:${source.line}:${source.column}`;
}
