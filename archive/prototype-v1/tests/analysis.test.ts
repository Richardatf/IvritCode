import { describe, expect, it } from "vitest";
import { analyzeGates, assemble, matchLexiconWindows } from "../src/lib.js";

describe("231 Gates", () => {
  it("counts directed adjacent pairs without wrapping by default", () => {
    expect(analyzeGates(["א", "ב", "א"])).toMatchObject([
      { gate: "א־ב", count: 1 }, { gate: "ב־א", count: 1 },
    ]);
  });
  it("supports circular and undirected analysis", () => {
    expect(analyzeGates(["א", "ב", "א"], { circular: true }).map((gate) => gate.gate)).toContain("א־א");
    expect(analyzeGates(["א", "ב", "א"], { directed: false })[0].count).toBe(2);
  });
});

describe("analysis utilities", () => {
  it("separates confirmed lexicon matches from raw windows", () => {
    const results = matchLexiconWindows("בראשית", { entries: { בראשית: { gloss: "beginning" } } }, 3, 6);
    expect(results.find((item) => item.text === "בראשית")?.status).toBe("confirmed");
    expect(results.some((item) => item.status === "unknown")).toBe(true);
  });
  it("assembles canonical letter names", () => {
    expect(assemble("ALEPH BET\n# note\nGIMEL").instructions.map((item) => item.letter).join("")).toBe("אבג");
  });
});
