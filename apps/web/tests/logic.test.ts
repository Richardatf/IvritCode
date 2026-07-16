import { describe, expect, it } from "vitest";
import { downloadProgram, initialState } from "../src/logic.js";
describe("Observatory logic", () => {
  it("changes initial state deterministically", () => {
    expect(initialState("zero", "").every((x) => x === 0)).toBe(true);
    expect(initialState("numeric", "42")).toEqual(initialState("numeric", "42"));
    expect(initialState("hebrew", "בראשית")).toEqual(initialState("hebrew", "בראשית"));
  });
  it("creates UTF-8 program downloads", async () => {
    const blob = downloadProgram("בראשית");
    expect(await blob.text()).toBe("בראשית");
    expect(blob.type).toContain("utf-8");
  });
});
