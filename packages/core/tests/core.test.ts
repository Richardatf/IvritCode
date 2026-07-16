import { describe, expect, it } from "vitest";
import {
  HEBREW_LETTERS,
  applyLetter,
  base22ToDecimal,
  createHebrewSeed,
  createNumericSeed,
  createState,
  decimalToBase22,
  executeProgram,
  fromBalanced,
  getInstructionDefinition,
  hebrewToBase22,
  makeZeroState,
  parseProgram,
  stateToLetterStream,
  stepInstruction,
  toBalanced,
} from "../src/index.js";
describe("base-22 state", () => {
  it("round-trips balanced and multi-digit values", () => {
    for (let i = 0; i < 22; i++) expect(fromBalanced(toBalanced(i as any))).toBe(i);
    expect(base22ToDecimal(decimalToBase22(231n))).toBe(231n);
    expect(hebrewToBase22("אב")).toEqual([0, 1]);
  });
  it("validates exactly 23 immutable registers", () => {
    expect(() => createState([0])).toThrow(/23/);
    expect(Object.isFrozen(makeZeroState())).toBe(true);
  });
  it("creates deterministic seeds", () => {
    expect(createNumericSeed(42)).toEqual(createNumericSeed(42));
    expect(createHebrewSeed("בראשית")).toEqual(createHebrewSeed("בראשית"));
  });
});
describe("22 operators", () => {
  it.each(HEBREW_LETTERS)("%s is deterministic, normalized, and immutable", (letter) => {
    const input = createState(Array.from({ length: 23 }, (_, i) => i * 17 - 31)),
      snapshot = [...input],
      a = applyLetter(input, letter),
      b = applyLetter(input, letter);
    expect(input).toEqual(snapshot);
    expect(a).toEqual(b);
    expect(a).toHaveLength(23);
    expect(a.every((value) => Number.isInteger(value) && value >= 0 && value < 22)).toBe(true);
    expect(getInstructionDefinition(letter).letter).toBe(letter);
  });
  it("matches targeted arithmetic semantics", () => {
    const s = [...makeZeroState()];
    s[0] = 3;
    s[11] = 5;
    expect(applyLetter(createState(s), "ב")[11]).toBe(8);
    expect(applyLetter(createState(s), "ג")[11]).toBe(15);
    expect(applyLetter(createState(s), "ד").slice(0, 12)).toEqual([
      2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20,
    ]);
    expect(applyLetter(createState(s), "פ")).toMatchObject({ 0: 3, 1: 3, 21: 3, 22: 3 });
  });
  it("preserves Aleph Olam for ascend and descend", () => {
    const s = [...makeZeroState()];
    s[22] = 9;
    expect(applyLetter(createState(s), "ז")[22]).toBe(9);
    expect(applyLetter(createState(s), "ח")[22]).toBe(9);
  });
});
describe("execution", () => {
  it("halts naturally", () => {
    const result = executeProgram("בראשית", { trace: "full" });
    expect(result.stepsExecuted).toBe(6);
    expect(result.haltReason).toBe("end-of-input");
    expect(result.trace[0]?.before).toHaveLength(23);
  });
  it("halts explicitly after marked Tav", () => {
    const result = executeProgram("אבג תּ ז", { trace: "summary" });
    expect(result.stepsExecuted).toBe(4);
    expect(result.haltReason).toBe("explicit-tav-dagesh");
    expect(result.trace.at(-1)?.halted).toBe(true);
  });
  it("supports none/summary/full traces", () => {
    expect(executeProgram("אב", { trace: "none" }).trace).toEqual([]);
    expect(executeProgram("אב", { trace: "summary" }).trace[0]?.before).toBeUndefined();
    expect(executeProgram("אב", { trace: "full" }).trace[0]?.before).toHaveLength(23);
  });
  it("enforces step limits with partial state", () => {
    try {
      executeProgram("אבג", { maxSteps: 2 });
      throw new Error("expected");
    } catch (error: any) {
      expect(error.name).toBe("StepLimitExceededError");
      expect(error.currentStep).toBe(2);
      expect(error.partialState).toHaveLength(23);
    }
  });
  it("rejects neutral modifiers in strict mode", () =>
    expect(() =>
      stepInstruction(makeZeroState(), parseProgram("בָ").instructions[0]!, {
        strictModifiers: true,
      }),
    ).toThrow(/permissive/));
  it("renders a 23-letter state", () =>
    expect(stateToLetterStream(makeZeroState())).toBe("א".repeat(23)));
});
