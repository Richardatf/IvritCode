import { describe, expect, it } from "vitest";
import { analyzeGates } from "../src/index.js";
describe("231 Gates", () => {
  it("defaults to directed, non-circular, repeated pairs", () => {
    const result = analyzeGates(["א", "ב", "א", "א"]);
    expect(result.occurrences.map((x) => x.gate)).toEqual(["א־ב", "ב־א", "א־א"]);
    expect(result.matrix[0]?.[1]).toBe(1);
  });
  it("supports undirected, circular, and repeat filtering", () => {
    expect(analyzeGates(["א", "ב", "א"], { directed: false }).frequencies[0]?.count).toBe(2);
    expect(analyzeGates(["א", "ב"], { circular: true }).occurrences).toHaveLength(2);
    expect(analyzeGates(["א", "א"], { includeRepeatedLetters: false }).occurrences).toHaveLength(0);
  });
});
