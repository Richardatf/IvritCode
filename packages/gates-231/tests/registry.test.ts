import { describe, expect, it } from "vitest";
import {
  decideGate,
  defaultGateRules,
  generateGatePairs,
  GATE_PAIRS,
  GATE_REGISTRY_CHECKSUM,
  computeGateChecksum,
} from "../src/index.js";
import { HEBREW_LETTERS } from "@qec/spec";
describe("231 Gates registry", () => {
  it("is complete, unique, unordered, deterministic, and checksum-locked", () => {
    expect(GATE_PAIRS).toHaveLength(231);
    expect(new Set(GATE_PAIRS.map((pair) => pair.id)).size).toBe(231);
    expect(GATE_PAIRS.every((pair) => pair.left !== pair.right)).toBe(true);
    expect(new Set(GATE_PAIRS.flatMap((pair) => [pair.left, pair.right]))).toEqual(
      new Set(HEBREW_LETTERS),
    );
    expect(generateGatePairs()).toEqual(GATE_PAIRS);
    expect(computeGateChecksum()).toBe(GATE_REGISTRY_CHECKSUM);
  });
  it("never executes an unassigned Gate", () =>
    expect(decideGate(GATE_PAIRS[0]!, defaultGateRules()).executable).toBe(false));
});
