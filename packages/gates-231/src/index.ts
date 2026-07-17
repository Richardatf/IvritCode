import {
  HEBREW_LETTERS,
  contentHash,
  type GateDecision,
  type GatePair,
  type GateRule,
  type HebrewLetter,
} from "@qec/spec";
import committedRegistry from "./registry.json" with { type: "json" };

export const generateGatePairs = (): readonly GatePair[] => {
  const pairs: GatePair[] = [];
  for (let left = 0; left < HEBREW_LETTERS.length; left++)
    for (let right = left + 1; right < HEBREW_LETTERS.length; right++) {
      const a = HEBREW_LETTERS[left]!,
        b = HEBREW_LETTERS[right]!;
      pairs.push({ id: `${a}-${b}`, left: a, right: b, index: pairs.length });
    }
  return pairs;
};
export const GATE_PAIRS = committedRegistry.pairs as readonly GatePair[];
export const GATE_REGISTRY_CHECKSUM = committedRegistry.checksum;
export const computeGateChecksum = (pairs: readonly GatePair[] = GATE_PAIRS): string =>
  contentHash(pairs);
export const defaultGateRules = (): readonly GateRule[] =>
  GATE_PAIRS.map((pair) => ({ pairId: pair.id, version: "0.1.0", status: "unassigned" }));
export const gateFor = (left: HebrewLetter, right: HebrewLetter): GatePair | undefined => {
  if (left === right) return undefined;
  return GATE_PAIRS.find(
    (pair) =>
      (pair.left === left && pair.right === right) || (pair.left === right && pair.right === left),
  );
};
export const decideGate = (pair: GatePair, rules: readonly GateRule[]): GateDecision => {
  const rule = rules.find((item) => item.pairId === pair.id);
  if (!rule || rule.status === "unassigned")
    return {
      pairId: pair.id,
      executable: false,
      reason: "Gate is unassigned; runtime invention is forbidden.",
    };
  if (rule.status === "rejected" || rule.composition === "rejection")
    return {
      pairId: pair.id,
      executable: false,
      reason: rule.description ?? "Gate was explicitly rejected.",
      ruleVersion: rule.version,
    };
  return {
    pairId: pair.id,
    executable: true,
    reason: rule.description ?? "Reviewed Gate rule approved.",
    ruleVersion: rule.version,
  };
};
