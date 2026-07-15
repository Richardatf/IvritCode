import { tokenize, assemble, run } from "ivritcode";

export type IvritRunOptions = {
  trace?: boolean;
  maxSteps?: number;
};

export function runIvrit(source: string, opts: IvritRunOptions = {}): string {
  const tokens = tokenize(source);
  const program = assemble(tokens);
  const out = run(program, { trace: !!opts.trace, maxSteps: opts.maxSteps ?? 20000 });
  return out.join("\n");
}
