import { describe, expect, it } from "vitest";
import { deletePreviousGrapheme, insertHebrewInput } from "../src/hebrewInput.js";

describe("Hebrew input editing", () => {
  it("inserts letters at the selection", () => {
    expect(insertHebrewInput("אב", 1, 1, "ג").value).toBe("אגב");
  });
  it("attaches and canonically orders a mark on the preceding letter", () => {
    const edit = insertHebrewInput("י", 1, 1, "\u05B4");
    expect(edit.value.normalize("NFD")).toBe("י\u05B4");
  });
  it("rejects an unattached combining mark", () => {
    expect(insertHebrewInput("", 0, 0, "\u05B4").error).toMatch(/letter/i);
  });
  it("deletes an entire pointed grapheme", () => {
    expect(deletePreviousGrapheme("אָב", 2, 2)).toEqual({ value: "ב", caret: 0 });
  });
});
