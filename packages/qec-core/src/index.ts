import { compileIvrit, type Compilation, type QECIRInstruction } from "@qec/ivrit-compiler";
import { TraceAssembler, exportProvenanceBundle } from "@qec/provenance";
import { decidePolicy, requireCapability } from "@qec/security";
import {
  IVRIT_SPEC_VERSION,
  QEC_SCHEMA_VERSION,
  contentHash,
  metadata,
  type CapabilityGrant,
  type ExecutionManifest,
  type ExecutionTrace,
  type SandboxResult,
  type VerificationResult,
} from "@qec/spec";
export interface QECRun {
  readonly manifest: ExecutionManifest;
  readonly compilation: Compilation;
  readonly verification: VerificationResult;
  readonly policy: ReturnType<typeof decidePolicy>;
  readonly trace: ExecutionTrace;
  readonly result: SandboxResult;
  readonly provenanceBundle: string;
}
export const createManifest = (
  source: string,
  overrides: Partial<
    Pick<ExecutionManifest, "purpose" | "privacyLabel" | "deterministicSeed" | "capabilities">
  > = {},
): ExecutionManifest => {
  const capabilities: readonly CapabilityGrant[] = overrides.capabilities ?? [
    {
      capability: "sandbox.execute",
      granted: true,
      scope: ["local-ir"],
      requiresConfirmation: false,
    },
    { capability: "web.read", granted: false, scope: [], requiresConfirmation: true },
    { capability: "grid.compute", granted: false, scope: [], requiresConfirmation: true },
  ];
  const base = {
    ...metadata("@qec/core", overrides.privacyLabel ?? "private", [
      { uri: "memory:source", start: 0, end: source.length },
    ]),
    languageVersion: IVRIT_SPEC_VERSION,
    programHash: contentHash(source.normalize("NFD")),
    purpose: overrides.purpose ?? "Local deterministic IvritCode study",
    declaredInputs: ["r1"],
    declaredOutputs: ["r1"],
    capabilities,
    resourceBudget: {
      maxSteps: 1000,
      maxTimeMs: 1000,
      maxMemoryBytes: 1_048_576,
      maxWebRequests: 0,
      maxGridTasks: 0,
    },
    deterministicSeed: overrides.deterministicSeed ?? 0,
    provenanceRequired: true,
    confirmation: { required: false, confirmed: false },
  };
  return { ...base, validationStatus: "valid", contentHash: contentHash(base) };
};
export const verifyRun = (
  manifest: ExecutionManifest,
  compilation: Compilation,
): VerificationResult => {
  const checks = [
    {
      name: "schema-version",
      passed: manifest.schemaVersion === QEC_SCHEMA_VERSION,
      message: `Expected ${QEC_SCHEMA_VERSION}.`,
    },
    {
      name: "language-version",
      passed: manifest.languageVersion === IVRIT_SPEC_VERSION,
      message: `Expected ${IVRIT_SPEC_VERSION}.`,
    },
    {
      name: "program-hash",
      passed: manifest.programHash === contentHash(compilation.program.source.normalize("NFD")),
      message: "Manifest must bind the normalized source.",
    },
    {
      name: "source-spans",
      passed: compilation.program.instructions.every(
        (item) =>
          item.start >= 0 && item.end <= compilation.program.source.length && item.start < item.end,
      ),
      message: "All instructions require valid source spans.",
    },
    {
      name: "compiler-diagnostics",
      passed: compilation.diagnostics.length === 0,
      message: compilation.diagnostics.join("; ") || "No diagnostics.",
    },
    {
      name: "provenance",
      passed: manifest.provenanceRequired,
      message: "QEC v0.1 requires provenance.",
    },
  ];
  const base = {
    ...metadata("Daat", manifest.privacyLabel),
    verified: checks.every((item) => item.passed),
    checks,
  };
  return {
    ...base,
    validationStatus: checks.every((item) => item.passed) ? "valid" : "invalid",
    contentHash: contentHash(base),
  };
};
const sandbox = (
  ir: readonly QECIRInstruction[],
  manifest: ExecutionManifest,
  policy: ReturnType<typeof decidePolicy>,
  inputs: Readonly<Record<string, number>>,
): SandboxResult => {
  requireCapability(policy, "sandbox.execute");
  const state: Record<string, number> = { ...inputs },
    warnings: string[] = [];
  let steps = 0;
  for (const item of ir) {
    if (++steps > manifest.resourceBudget.maxSteps) throw new Error("BudgetExceeded: maxSteps");
    if (item.operation === "add_int")
      state[item.register!] = Math.trunc(Number(state[item.register!] ?? 0)) + item.value!;
    else
      warnings.push(
        `Legacy opcode ${item.opcode} is serialized but not executed by QEC sandbox v0.1.`,
      );
  }
  const base = {
    ...metadata("Malchut", manifest.privacyLabel),
    exitCode: 0,
    outputs: state,
    warnings,
    budgetUsed: { steps, timeMs: 0 },
  };
  return { ...base, validationStatus: "valid", contentHash: contentHash(base) };
};
export const runQEC = (
  source: string,
  inputs: Readonly<Record<string, number>> = { r1: 0 },
  manifest = createManifest(source),
): QECRun => {
  const trace = new TraceAssembler(manifest);
  trace.record("Keter", "passed", manifest.purpose, manifest);
  const compilation = compileIvrit(source);
  trace.record(
    "Binah",
    compilation.diagnostics.length ? "denied" : "passed",
    "Source normalized, tokenized, parsed, and typed.",
    compilation.program,
  );
  const verification = verifyRun(manifest, compilation);
  trace.record(
    "Daat",
    verification.verified ? "passed" : "denied",
    "Explicit source, version, capability, and provenance checks completed.",
    verification,
  );
  if (!verification.verified)
    throw new Error(
      `VerificationDenied: ${verification.checks
        .filter((item) => !item.passed)
        .map((item) => item.name)
        .join(", ")}`,
    );
  trace.record("Chokhmah", "skipped", "No candidate generation requested.", {});
  trace.record("Chesed", "skipped", "web.read not requested.", {});
  const policy = decidePolicy(manifest);
  trace.record(
    "Gevurah",
    policy.allowed ? "passed" : "denied",
    policy.denials.join("; ") || "Capabilities and budgets accepted.",
    policy,
  );
  if (!policy.allowed) throw new Error(`PolicyDenied: ${policy.denials.join("; ")}`);
  trace.record(
    "Tiferet",
    "passed",
    "Single deterministic plan selected; no disagreement.",
    compilation.ir,
  );
  trace.record("Netzach", "skipped", "grid.compute not requested.", {});
  trace.record(
    "Hod",
    "passed",
    "Allowlisted QEC IR and inspectable Python representation emitted.",
    compilation.pythonAst,
  );
  trace.record("Yesod", "passed", "Initial state and replay inputs recorded.", inputs);
  const result = sandbox(compilation.ir, manifest, policy, inputs);
  trace.record("Malchut", "passed", "Local sandbox completed.", result);
  const finished = trace.finish();
  return {
    manifest,
    compilation,
    verification,
    policy,
    trace: finished,
    result,
    provenanceBundle: exportProvenanceBundle(manifest, finished, result),
  };
};
