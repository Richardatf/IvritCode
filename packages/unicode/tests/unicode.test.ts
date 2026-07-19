import { describe, expect, it } from "vitest";
import { HEBREW_LETTERS, parseProgram, stripHebrewMarks } from "../src/index.js";
describe("Hebrew Unicode", () => {
  it("defines 22 unique canonical letters", () => {
    expect(HEBREW_LETTERS).toHaveLength(22);
    expect(new Set(HEBREW_LETTERS).size).toBe(22);
  });
  it("normalizes final forms while retaining source", () => {
    const item = parseProgram("ךםןףץ").instructions[0]!;
    expect(item.letter).toBe("כ");
    expect(item.originalLetter).toBe("ך");
  });
  it("preserves marks and locations across NFC and NFD", () => {
    const nfc = parseProgram("בָ֑").instructions[0]!;
    expect(nfc.niqqud[0]?.name).toBe("Qamatz");
    expect(nfc.cantillation[0]?.name).toBe("Etnahta");
    expect(nfc.source).toMatchObject({ line: 1, column: 1, codePointOffset: 0, utf16Offset: 0 });
  });
  it("ignores comments and mixed text", () => {
    expect(parseProgram("hello א # בת\nג").instructions.map((x) => x.letter)).toEqual(["א", "ג"]);
  });
  it("rejects detached marks", () => expect(() => parseProgram("ָא")).toThrow(/no adjacent/));
  it("attaches sof pasuq as a supported control mark", () => {
    expect(parseProgram("א\u05c3").instructions[0]?.cantillation[0]?.name).toBe("Sof pasuq");
  });
  it("strips marks for comparison", () => expect(stripHebrewMarks("שָׁלוֹם")).toBe("שלום"));
});
