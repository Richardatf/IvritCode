import { describe, expect, it } from "vitest";
import { createManifest, runQEC } from "../src/index.js";
import { requireCapability } from "@qec/security";
describe("QEC execution contract", () => {
  it("passes the acceptance program through Daat and the local sandbox", () => {
    const run = runQEC("יִ $r1, 5", { r1: 2 });
    expect(run.result.outputs.r1).toBe(7);
    expect(run.verification.verified).toBe(true);
    expect(run.trace.events.map((event) => event.stage)).toEqual([
      "Keter",
      "Binah",
      "Daat",
      "Chokhmah",
      "Chesed",
      "Gevurah",
      "Tiferet",
      "Netzach",
      "Hod",
      "Yesod",
      "Malchut",
    ]);
  });
  it("cannot bypass Daat with a mismatched manifest", () => {
    const manifest = { ...createManifest("יִ $r1, 5"), programHash: "tampered" };
    expect(() => runQEC("יִ $r1, 5", { r1: 0 }, manifest)).toThrow(/VerificationDenied/);
  });
  it("denies web and grid without grants", () => {
    const run = runQEC("יִ $r1, 5");
    expect(() => requireCapability(run.policy, "web.read")).toThrow(/CapabilityDenied/);
    expect(() => requireCapability(run.policy, "grid.compute")).toThrow(/CapabilityDenied/);
  });
  it("replays deterministically", () => {
    const first = runQEC("יִ $r1, 5", { r1: 9 }),
      second = runQEC("יִ $r1, 5", { r1: 9 });
    expect(second.result).toEqual(first.result);
    expect(second.trace.replayHash).toBe(first.trace.replayHash);
  });
});

describe("integer arithmetic execution", () => {
  it("executes a multi-register program and replays it", () => {
    const source = "יִ $r10, 8\nכִ $r10, 3\nלִ $r10, -2\nיִ $r22, 4";
    const first = runQEC(source, { r10: 2 });
    expect(first.result.outputs).toEqual({ r10: -14, r22: 4 });
    expect(first.result.budgetUsed.steps).toBe(4);
    expect(first.result.warnings).toEqual([]);
    expect(runQEC(source, { r10: 2 }).trace.replayHash).toBe(first.trace.replayHash);
  });
  it.each(["כִ $r23, 2", "לִ $r1, 1.5", "יִ $r1, 9007199254740992"])(
    "rejects invalid source before executing: %s",
    (source) => {
      expect(() => runQEC(source)).toThrow(/VerificationDenied/);
    },
  );
  it.each([Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])("rejects unsafe inputs %s", (r1) => {
    expect(() => runQEC("לִ $r1, 2", { r1 })).toThrow(/ArithmeticError/);
  });
  it("rejects integer overflow", () => {
    expect(() => runQEC("יִ $r1, 1", { r1: Number.MAX_SAFE_INTEGER })).toThrow(
      /unsafe integer result/,
    );
    expect(() => runQEC("לִ $r1, 2", { r1: Number.MAX_SAFE_INTEGER })).toThrow(
      /unsafe integer result/,
    );
  });
});

it("declares the registers used by arithmetic programs", () => {
  const manifest = createManifest("כִ $r10, 1\nלִ $r22, 2\nיִ $r10, 3");
  expect(manifest.declaredInputs).toEqual(["r10", "r22"]);
  expect(manifest.declaredOutputs).toEqual(["r10", "r22"]);
});
