#!/usr/bin/env node
import { createInterface } from "node:readline";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { HEBREW_LETTERS } from "./alphabet.js";
import { analyzeGates } from "./gates.js";
import { parseProgram } from "./parser.js";
import { disassembleProgram, executeProgram } from "./program.js";
import { stateToLetterStream } from "./state.js";

function usage(): never {
  console.error("Usage: ivritcode <run|check|trace|disassemble|gates|repl> [file] [--max-steps N] [--strict-modifiers]");
  process.exit(2);
}

function maxSteps(args: string[]): number {
  const index = args.indexOf("--max-steps");
  if (index < 0) return 1000;
  const value = Number(args[index + 1]);
  if (!Number.isInteger(value) || value < 0) usage();
  return value;
}

async function runSource(command: string, file: string, args: string[]): Promise<void> {
  const source = await readFile(file, "utf8");
  const program = parseProgram(source, { filename: file });
  if (command === "check") { console.log(`OK: ${program.instructions.length} instructions`); return; }
  if (command === "disassemble") { console.log(disassembleProgram(program)); return; }
  if (command === "gates") {
    const gates = analyzeGates(program.instructions.map((instruction) => instruction.letter));
    for (const gate of gates) console.log(`${gate.gate}\t${gate.count}\t${gate.positions.join(",")}`);
    return;
  }
  const result = executeProgram(program, { maxSteps: maxSteps(args), strictModifiers: args.includes("--strict-modifiers"), programName: basename(file) });
  if (command === "trace") {
    for (const row of result.trace) console.log(`${row.index}\t${row.instruction.letter}\t${row.before.join(",")} -> ${row.after.join(",")}`);
  } else if (command !== "run") usage();
  console.log(JSON.stringify(result.finalState));
  console.log(stateToLetterStream(result.finalState));
}

async function repl(args: string[]): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: "ivritcode> " });
  rl.prompt();
  rl.on("line", (line) => {
    try {
      const result = executeProgram(line, { maxSteps: maxSteps(args), strictModifiers: args.includes("--strict-modifiers") });
      console.log(`${JSON.stringify(result.finalState)}\n${stateToLetterStream(result.finalState)}`);
    } catch (error) { console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error)); }
    rl.prompt();
  });
}

async function main(): Promise<void> {
  process.stdout.setDefaultEncoding("utf8");
  const [, , command, file, ...rest] = process.argv;
  if (command === "repl") return repl([file, ...rest].filter(Boolean));
  if (!command || !file) usage();
  await runSource(command, file, rest);
}

main().catch((error) => { console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error)); process.exitCode = 1; });
