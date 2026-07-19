import { describe, expect, it } from "vitest";
import { IVRIT_EXCHANGE_VERSION, validateIvritCodeExchange } from "../src/index.js";

const fixture = {
  schemaVersion: IVRIT_EXCHANGE_VERSION,
  source: "אור",
  sourceHash: "fnv1a32-example",
  initialState: [...Array.from({ length: 22 }, (_, index) => index), 0],
  finalState: [...Array.from({ length: 22 }, (_, index) => index), 9],
  hiddenKey: "י",
  patternShape: "STILL_POINT",
  returningLetters: ["א", "ו", "ר"],
  gates: ["א־ו", "ו־ר"],
};
describe("IvritCode exchange", () => {
  it("accepts the canonical fixture", () => expect(validateIvritCodeExchange(fixture)).toBe(true));
  it("rejects wrong versions and register counts", () => {
    expect(validateIvritCodeExchange({ ...fixture, schemaVersion: "future" })).toBe(false);
    expect(validateIvritCodeExchange({ ...fixture, finalState: [1] })).toBe(false);
  });
});
