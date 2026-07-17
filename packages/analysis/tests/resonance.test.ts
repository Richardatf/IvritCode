import { describe, expect, it } from "vitest";
import {
  analyzeConstellation,
  calculateRotationCorrelation,
  findDominantTargets,
  findReturningLetters,
  interpretRegister,
  valueToHebrewLetter,
} from "../src/index.js";

const result = (visible: readonly number[], hiddenKey = 9) => ({
  finalState: [...visible, hiddenKey],
  program: {
    instructions: [{ letter: "א" as const }, { letter: "ו" as const }, { letter: "ר" as const }],
  },
});
describe("IvritCode Resonance", () => {
  it("translates values and composes deterministic interpretations", () => {
    expect(valueToHebrewLetter(3)).toBe("ד");
    expect(interpretRegister("א", "ד").phrase).toBe("Origin turns toward the Threshold.");
    expect(interpretRegister("א", "ד")).toEqual(interpretRegister("א", "ד"));
  });
  it("finds returns and dominant targets", () => {
    const state = Array.from({ length: 22 }, (_, index) => index);
    state[1] = 0;
    state[2] = 0;
    expect(findReturningLetters(state)).not.toContain("ב");
    expect(findDominantTargets(state)).toEqual(["א"]);
  });
  it("detects still point, spiral, full spectrum, chorus, and deterministic readings", () => {
    const natural = Array.from({ length: 22 }, (_, index) => index),
      spiral = natural.map((value) => (value + 4) % 22),
      full = natural.map((value) => (value * 5) % 22),
      chorus = Array.from({ length: 22 }, (_, index) => index % 4);
    expect(analyzeConstellation(result(natural)).patternShape).toBe("STILL_POINT");
    expect(calculateRotationCorrelation(spiral)).toBe(1);
    expect(analyzeConstellation(result(spiral)).patternShape).toBe("SPIRAL");
    expect(analyzeConstellation(result(full)).patternShape).toBe("FULL_SPECTRUM");
    expect(analyzeConstellation(result(chorus)).patternShape).toBe("CHORUS");
    expect(analyzeConstellation(result(chorus))).toEqual(analyzeConstellation(result(chorus)));
  });
  it("only mentions mirror evidence for a computed mirror", () => {
    const open = analyzeConstellation(
      result(Array.from({ length: 22 }, (_, index) => (index * 5 + 3) % 22)),
    );
    if (open.patternShape !== "MIRROR") expect(open.summary).not.toMatch(/two halves answer/);
  });
});
