import { describe, expect, it } from "vitest";
import { analyzeLexicon, normalizeForLexicon, validateLexicon } from "../src/index.js";
const data = { entries: { שלום: { gloss: "peace" }, שלם: { gloss: "whole" } } };
describe("lexicon", () => {
  it("separates exact, prefix, and candidate windows", () => {
    const results = analyzeLexicon("שָׁלוֹם", data, 2, 4);
    expect(results.some((x) => x.kind === "exact" && x.text === "שלום")).toBe(true);
    expect(results.some((x) => x.kind === "prefix")).toBe(true);
    expect(results.some((x) => x.kind === "candidate")).toBe(true);
  });
  it("normalizes final forms and niqqud", () => expect(normalizeForLexicon("מַיִם")).toBe("מימ"));
  it("rejects malformed data", () => expect(() => validateLexicon({})).toThrow(/entries/));
  it("handles missing data as candidates", () =>
    expect(analyzeLexicon("אבג", undefined, 2, 3).every((x) => x.kind === "candidate")).toBe(true));
});
