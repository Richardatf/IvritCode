import { describe, expect, it } from "vitest";
import {
  IVRIT_ENGINE_VERSION,
  IVRIT_EXCHANGE_VERSION,
  QEC_MANIFESTATION_VERSION,
  QEC_PATH_MAP_VERSION,
  validateIvritCodeExchange,
  validateRunPassport,
  QEC_RUN_PASSPORT_VERSION,
} from "../src/index.js";

const fixture = {
  schemaVersion: IVRIT_EXCHANGE_VERSION,
  engineVersion: IVRIT_ENGINE_VERSION,
  pathMapVersion: QEC_PATH_MAP_VERSION,
  manifestationVersion: QEC_MANIFESTATION_VERSION,
  seed: 9,
  traceHash: "fnv1a32-complete-trace",
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

it("validates a complete deterministic run passport", () => {
  const passport = {
    ...fixture,
    schemaVersion: QEC_RUN_PASSPORT_VERSION,
    runId: fixture.traceHash,
    trace: [
      {
        sequence: 0,
        letter: "א",
        before: fixture.initialState,
        after: fixture.finalState,
        beforeHash: "fnv1a32-11111111",
        afterHash: "fnv1a32-22222222",
        changedRegisters: [0],
      },
    ],
    validation: { status: "valid", registerCount: 23, traceComplete: true, deterministic: true },
  };
  expect(validateRunPassport(passport)).toBe(true);
  expect(validateRunPassport({ ...passport, runId: "fnv1a32-wrong" })).toBe(false);
});
