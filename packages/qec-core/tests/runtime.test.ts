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
