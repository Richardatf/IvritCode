#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeGates } from "@ivritcode/analysis";
import {
  ALEPH_OLAM_INDEX,
  HEBREW_LETTERS,
  base22ToHebrew,
  decimalToBase22,
  disassembleProgram,
  executeProgram,
  formatState,
  makeZeroState,
  parseProgram,
  stateToLetterStream,
  type IvritState,
  type TraceMode,
} from "@ivritcode/core";
import { analyzeLexicon, type LexiconData } from "@ivritcode/lexicon";
const usage = `IvritCode 1.0 — Hebrew symbolic computing\n\nUsage: ivritcode <run|check|trace|disassemble|gates|lexicon|convert|repl|info> [file]\nOptions: --format text|json|ndjson  --max-steps N  --strict`;
const option = (args: string[], name: string, fallback?: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
async function sourceFile(file: string) {
  return readFile(file, "utf8");
}
function serialize(value: unknown) {
  return JSON.stringify(
    value,
    (_key, item) =>
      item instanceof Set ? [...item] : typeof item === "bigint" ? item.toString() : item,
    2,
  );
}
async function lexiconData(): Promise<LexiconData> {
  const path = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../packages/lexicon/data/hebrew-lexicon.json",
  );
  return JSON.parse(await readFile(path, "utf8")) as LexiconData;
}
async function runFile(command: string, file: string, args: string[]) {
  const source = await sourceFile(file),
    program = parseProgram(source, { filename: file }),
    format = option(args, "--format", "text")!,
    maxSteps = Number(option(args, "--max-steps", "10000"));
  if (command === "check") {
    console.log(`✓ ${file}: ${program.instructions.length} valid instructions`);
    return;
  }
  if (command === "disassemble") {
    console.log(disassembleProgram(program));
    return;
  }
  if (command === "gates") {
    const result = analyzeGates(program);
    console.log(
      format === "json"
        ? serialize(result)
        : result.frequencies
            .map(
              (x) =>
                `${x.gate}\t${x.count}\t${x.occurrences.map((o) => o.startInstruction).join(",")}`,
            )
            .join("\n"),
    );
    return;
  }
  if (command === "lexicon") {
    const matches = analyzeLexicon(
      program.instructions.map((x) => x.letter).join(""),
      await lexiconData(),
    );
    if (format === "json") console.log(serialize(matches));
    else
      for (const kind of ["exact", "prefix", "candidate"] as const) {
        console.log(`\n${kind.toUpperCase()}`);
        for (const match of matches.filter((x) => x.kind === kind))
          console.log(`${match.text}\t${match.start}-${match.end}`);
      }
    return;
  }
  const result = executeProgram(program, {
    maxSteps,
    strictModifiers: args.includes("--strict"),
    trace: command === "trace" ? "full" : "summary",
    programName: file,
  });
  if (command === "trace") {
    if (format === "json") console.log(serialize(result));
    else if (format === "ndjson")
      result.trace.forEach((step) => console.log(serialize(step).replace(/\n\s*/g, "")));
    else
      result.trace.forEach((step) =>
        console.log(
          `${step.step.toString().padStart(4, "0")} ${step.instruction.source.raw} ${step.instruction.letter}  Δ ${step.changedRegisters.map((change) => `${change.index}:${change.before}→${change.after}`).join(" ") || "none"}${step.halted ? "  HALT" : ""}`,
        ),
      );
    return;
  }
  console.log(
    `Program       ${program.instructions.length} instructions\nHalt          ${result.haltReason}\nSteps         ${result.stepsExecuted}\nAleph Olam    ${result.finalState[ALEPH_OLAM_INDEX]}\nLetter stream ${stateToLetterStream(result.finalState)}\nState         ${formatState(result.finalState)}`,
  );
}
async function repl() {
  let state: IvritState = makeZeroState(),
    strict = false,
    trace: TraceMode = "summary";
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "ivritcode › ",
  });
  console.log("IvritCode REPL. :help for commands.");
  rl.prompt();
  rl.on("line", (line) => {
    try {
      if (line.startsWith(":")) {
        const [command, value] = line.split(/\s+/, 2);
        if (command === ":quit") {
          rl.close();
          return;
        }
        if (command === ":help")
          console.log(":state :reset :trace none|summary|full :strict :gates :seed <Hebrew> :quit");
        else if (command === ":state") console.log(formatState(state));
        else if (command === ":reset") state = makeZeroState();
        else if (command === ":strict") strict = !strict;
        else if (command === ":trace" && value) trace = value as TraceMode;
        else if (command === ":seed" && value) {
          const result = executeProgram(value, { initialState: state, trace });
          state = result.finalState;
        } else if (command === ":gates")
          console.log(analyzeGates(parseProgram(stateToLetterStream(state))).frequencies);
        else console.log("Unknown REPL command.");
      } else {
        const result = executeProgram(line, {
          initialState: state,
          strictModifiers: strict,
          trace,
        });
        state = result.finalState;
        console.log(`${stateToLetterStream(state)}  A∞=${state[22]}  ${result.haltReason}`);
      }
    } catch (error) {
      console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
    }
    rl.prompt();
  });
}
async function main() {
  const args = process.argv.slice(2),
    command = args[0];
  if (!command) {
    console.error(usage);
    process.exitCode = 2;
    return;
  }
  if (command === "info") {
    console.log(
      `IvritCode 1.0.0\n22 operators · 23 registers · Z₂₂\n${HEBREW_LETTERS.join("")}\nhttps://ivritcode.org`,
    );
    return;
  }
  if (command === "repl") {
    await repl();
    return;
  }
  if (command === "convert") {
    const decimal = option(args, "--decimal");
    if (decimal === undefined) throw new Error("convert requires --decimal N");
    const digits = decimalToBase22(BigInt(decimal));
    console.log(`${decimal}₁₀ = ${digits.join("·")}₂₂ = ${base22ToHebrew(digits)}`);
    return;
  }
  const file = args[1];
  if (!file || !["run", "check", "trace", "disassemble", "gates", "lexicon"].includes(command)) {
    console.error(usage);
    process.exitCode = 2;
    return;
  }
  await runFile(command, file, args.slice(2));
}
main().catch((error) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  process.exitCode = 1;
});
