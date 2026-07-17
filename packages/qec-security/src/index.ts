import {
  contentHash,
  metadata,
  type CapabilityName,
  type ExecutionManifest,
  type PolicyDecision,
} from "@qec/spec";
export const MAX_BUDGET = {
  maxSteps: 10_000,
  maxTimeMs: 5_000,
  maxMemoryBytes: 16_777_216,
  maxWebRequests: 10,
  maxGridTasks: 32,
} as const;
export const decidePolicy = (manifest: ExecutionManifest): PolicyDecision => {
  const denials: string[] = [];
  for (const [key, maximum] of Object.entries(MAX_BUDGET))
    if (manifest.resourceBudget[key as keyof typeof MAX_BUDGET] > maximum)
      denials.push(`${key} exceeds policy maximum ${maximum}.`);
  const confirmed = manifest.capabilities
    .filter(
      (grant) => grant.granted && (!grant.requiresConfirmation || manifest.confirmation.confirmed),
    )
    .map((grant) => grant.capability);
  for (const grant of manifest.capabilities)
    if (grant.granted && grant.requiresConfirmation && !manifest.confirmation.confirmed)
      denials.push(`${grant.capability} requires exact user confirmation.`);
  const base = {
    ...metadata("@qec/security", manifest.privacyLabel),
    allowed: denials.length === 0,
    denials,
    grantedCapabilities: confirmed,
  };
  return {
    ...base,
    validationStatus: denials.length ? "invalid" : "valid",
    contentHash: contentHash(base),
  };
};
export const requireCapability = (decision: PolicyDecision, capability: CapabilityName): void => {
  if (!decision.allowed || !decision.grantedCapabilities.includes(capability))
    throw new Error(`CapabilityDenied: ${capability}`);
};
export const FORBIDDEN_PYTHON_NODES = [
  "Import",
  "ImportFrom",
  "Call",
  "Attribute",
  "Subscript",
  "Lambda",
  "With",
  "Try",
  "Raise",
  "Global",
  "Nonlocal",
] as const;
