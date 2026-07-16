import { describe, expect, it } from "vitest";
import {
  HEBREW_LETTERS, ProgramStepLimitError, UnsupportedModifierError,
  executeProgram, extractProgramLetters, makeZeroState, normalizeState,
  parseProgram, stateToLetterStream, stepInstruction,
} from "../src/lib.js";

describe("canonical engine", () => {
  it("recognizes all 22 operators", () => {
    expect(parseProgram(HEBREW_LETTERS.join("")).instructions.map((item) => item.letter)).toEqual(HEBREW_LETTERS);
  });

  it.each(HEBREW_LETTERS)("%s returns a fresh normalized 23-register state", (letter) => {
    const input = Array.from({ length: 23 }, (_, index) => index * 19 - 7);
    const snapshot = input.slice();
    const instruction = parseProgram(letter).instructions[0];
    const output = stepInstruction(input, instruction);
    expect(input).toEqual(snapshot);
    expect(output).toHaveLength(23);
    expect(output.every((value) => Number.isInteger(value) && value >= 0 && value < 22)).toBe(true);
    expect(output).not.toBe(input);
  });

  it.each(HEBREW_LETTERS)("%s is deterministic on zero state", (letter) => {
    expect(executeProgram(letter).finalState).toEqual(executeProgram(letter).finalState);
  });

  it("validates and normalizes state", () => {
    expect(normalizeState(new Array(23).fill(-1))).toEqual(new Array(23).fill(21));
    expect(() => normalizeState([0])).toThrow(/23 registers/);
  });

  it("reports the maximum-step limit", () => {
    expect(() => executeProgram("אב", { maxSteps: 1 })).toThrow(ProgramStepLimitError);
  });

  it("preserves Aleph Olam reads and writes", () => {
    const initial = makeZeroState(); initial[22] = 7;
    expect(executeProgram("י", { initialState: initial }).finalState.slice(0, 22)).toEqual(new Array(22).fill(7));
    initial[0] = 9;
    expect(executeProgram("פ", { initialState: initial }).finalState[22]).toBe(9);
  });

  it("maps state back to a 23-letter stream", () => {
    expect(stateToLetterStream(makeZeroState())).toBe("א".repeat(23));
  });
});

describe("Unicode parser", () => {
  it("ignores mixed text and Hebrew in comments", () => {
    expect(extractProgramLetters("hello א! # בת\nג")).toEqual(["א", "ג"]);
  });

  it("associates niqqud and cantillation in NFD", () => {
    const instruction = parseProgram("בָ֑").instructions[0];
    expect(instruction.niqqud.map((mark) => mark.name)).toContain("Qamatz");
    expect(instruction.cantillation).toHaveLength(1);
    expect(instruction.source.line).toBe(1);
  });

  it("normalizes final forms to their standard operators", () => {
    expect(extractProgramLetters("ךםןףץ")).toEqual(["כ", "מ", "נ", "פ", "צ"]);
  });

  it("rejects a leading combining mark", () => {
    expect(() => parseProgram("ָא")).toThrow(/no preceding instruction/);
  });

  it("rejects detached and unsupported Hebrew modifiers", () => {
    expect(() => parseProgram("ב ָ")).toThrow(/no preceding instruction/);
    expect(() => parseProgram("בׄ")).toThrow(/not supported/);
  });

  it("rejects recognized modifiers in strict execution mode", () => {
    expect(() => executeProgram("בָ", { strictModifiers: true })).toThrow(UnsupportedModifierError);
  });
});
