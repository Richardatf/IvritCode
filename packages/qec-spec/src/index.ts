import languageSpec from "./ivritcode-0.1.json" with { type: "json" };
export const IVRIT_LANGUAGE_SPEC = languageSpec;
export const QEC_SCHEMA_VERSION = "qec-0.1" as const;
export const IVRIT_SPEC_VERSION = "ivritcode-1.0" as const;
export const IVRIT_EXCHANGE_VERSION = "ivritcode-exchange-0.2" as const;
export const IVRIT_ENGINE_VERSION = "1.0.0" as const;
export const QEC_PATH_MAP_VERSION = "qec-path-map-0.3.0" as const;
export const QEC_MANIFESTATION_VERSION = "qec-manifestation-0.2" as const;
export const QEC_RUN_PASSPORT_VERSION = "qec-run-passport-0.1" as const;
export const HEBREW_LETTERS = [
  "א",
  "ב",
  "ג",
  "ד",
  "ה",
  "ו",
  "ז",
  "ח",
  "ט",
  "י",
  "כ",
  "ל",
  "מ",
  "נ",
  "ס",
  "ע",
  "פ",
  "צ",
  "ק",
  "ר",
  "ש",
  "ת",
] as const;
export type HebrewLetter = (typeof HEBREW_LETTERS)[number];
export interface IvritCodeExchange {
  readonly schemaVersion: typeof IVRIT_EXCHANGE_VERSION;
  readonly engineVersion: typeof IVRIT_ENGINE_VERSION;
  readonly pathMapVersion: typeof QEC_PATH_MAP_VERSION;
  readonly manifestationVersion: typeof QEC_MANIFESTATION_VERSION;
  readonly seed: number;
  readonly traceHash: string;
  readonly source: string;
  readonly sourceHash: string;
  readonly initialState: readonly number[];
  readonly finalState: readonly number[];
  readonly hiddenKey: HebrewLetter;
  readonly patternShape: string;
  readonly returningLetters: readonly HebrewLetter[];
  readonly gates: readonly string[];
}
export function validateIvritCodeExchange(value: unknown): value is IvritCodeExchange {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<IvritCodeExchange>;
  return (
    item.schemaVersion === IVRIT_EXCHANGE_VERSION &&
    item.engineVersion === IVRIT_ENGINE_VERSION &&
    item.pathMapVersion === QEC_PATH_MAP_VERSION &&
    item.manifestationVersion === QEC_MANIFESTATION_VERSION &&
    Number.isInteger(item.seed) &&
    Number(item.seed) >= 0 &&
    Number(item.seed) < 22 &&
    typeof item.traceHash === "string" &&
    item.traceHash.length > 0 &&
    typeof item.source === "string" &&
    item.source.length <= 2048 &&
    typeof item.sourceHash === "string" &&
    Array.isArray(item.initialState) &&
    item.initialState.length === 23 &&
    Array.isArray(item.finalState) &&
    item.finalState.length === 23 &&
    item.initialState.every((entry) => Number.isInteger(entry) && entry >= 0 && entry < 22) &&
    item.finalState.every((entry) => Number.isInteger(entry) && entry >= 0 && entry < 22) &&
    HEBREW_LETTERS.includes(item.hiddenKey as HebrewLetter) &&
    typeof item.patternShape === "string" &&
    Array.isArray(item.returningLetters) &&
    item.returningLetters.every((letter) => HEBREW_LETTERS.includes(letter)) &&
    Array.isArray(item.gates) &&
    item.gates.every((gate) => typeof gate === "string")
  );
}
export interface RunPassportTraceEvent {
  readonly sequence: number;
  readonly letter: HebrewLetter;
  readonly before: readonly number[];
  readonly after: readonly number[];
  readonly beforeHash: string;
  readonly afterHash: string;
  readonly changedRegisters: readonly number[];
}
export interface QECRunPassport extends Omit<IvritCodeExchange, "schemaVersion"> {
  readonly schemaVersion: typeof QEC_RUN_PASSPORT_VERSION;
  readonly runId: string;
  readonly trace: readonly RunPassportTraceEvent[];
  readonly validation: {
    readonly status: "valid";
    readonly registerCount: 23;
    readonly traceComplete: true;
    readonly deterministic: true;
  };
}
export interface RunPassportInspection {
  readonly valid: boolean;
  readonly errors: readonly string[];
}
export interface RunPassportTraceInput {
  readonly letter: HebrewLetter;
  readonly before: readonly number[];
  readonly after: readonly number[];
  readonly changedRegisters: readonly number[];
}
export interface RunPassportInput {
  readonly source: string;
  readonly seed: number;
  readonly initialState: readonly number[];
  readonly finalState: readonly number[];
  readonly hiddenKey: HebrewLetter;
  readonly patternShape: string;
  readonly returningLetters: readonly HebrewLetter[];
  readonly gates: readonly string[];
  readonly trace: readonly RunPassportTraceInput[];
}
const validState = (value: unknown): value is readonly number[] =>
  Array.isArray(value) &&
  value.length === 23 &&
  value.every((entry) => Number.isInteger(entry) && entry >= 0 && entry < 22);
export function inspectRunPassport(value: unknown): RunPassportInspection {
  const errors: string[] = [];
  if (!value || typeof value !== "object") return { valid: false, errors: ["object-required"] };
  const item = value as Partial<QECRunPassport>;
  const exchange = { ...item, schemaVersion: IVRIT_EXCHANGE_VERSION };
  if (item.schemaVersion !== QEC_RUN_PASSPORT_VERSION) errors.push("schema-version");
  if (!validateIvritCodeExchange(exchange)) errors.push("exchange-contract");
  if (!Array.isArray(item.trace) || !item.trace.length) errors.push("trace-required");
  const traceShape =
    Array.isArray(item.trace) &&
    item.trace.length > 0 &&
    item.trace.every(
      (event, index) =>
        event.sequence === index &&
        HEBREW_LETTERS.includes(event.letter) &&
        validState(event.before) &&
        validState(event.after) &&
        typeof event.beforeHash === "string" &&
        typeof event.afterHash === "string" &&
        Array.isArray(event.changedRegisters),
    );
  if (!traceShape) errors.push("trace-shape");
  if (
    item.validation?.status !== "valid" ||
    item.validation.registerCount !== 23 ||
    item.validation.traceComplete !== true ||
    item.validation.deterministic !== true
  )
    errors.push("validation-claims");
  if (traceShape) {
    const trace = item.trace!;
    trace.forEach((event, index) => {
      if (event.beforeHash !== contentHash(event.before)) errors.push(`event-${index}-before-hash`);
      if (event.afterHash !== contentHash(event.after)) errors.push(`event-${index}-after-hash`);
      if (index > 0 && JSON.stringify(event.before) !== JSON.stringify(trace[index - 1]!.after))
        errors.push(`event-${index}-chain`);
    });
    if (
      validState(item.initialState) &&
      JSON.stringify(trace[0]!.before) !== JSON.stringify(item.initialState)
    )
      errors.push("initial-state-chain");
    if (
      validState(item.finalState) &&
      JSON.stringify(trace.at(-1)!.after) !== JSON.stringify(item.finalState)
    )
      errors.push("final-state-chain");
    if (item.traceHash !== contentHash(trace)) errors.push("trace-hash");
  }
  if (item.sourceHash !== contentHash({ source: item.source })) errors.push("source-hash");
  if (item.runId !== item.traceHash) errors.push("run-id");
  return { valid: errors.length === 0, errors };
}
export function validateRunPassport(value: unknown): value is QECRunPassport {
  return inspectRunPassport(value).valid;
}
export function createRunPassport(input: RunPassportInput): QECRunPassport {
  const trace: RunPassportTraceEvent[] = input.trace.map((event, sequence) => ({
    sequence,
    letter: event.letter,
    before: [...event.before],
    after: [...event.after],
    beforeHash: contentHash(event.before),
    afterHash: contentHash(event.after),
    changedRegisters: [...event.changedRegisters],
  }));
  const traceHash = contentHash(trace);
  const passport: QECRunPassport = {
    schemaVersion: QEC_RUN_PASSPORT_VERSION,
    runId: traceHash,
    engineVersion: IVRIT_ENGINE_VERSION,
    pathMapVersion: QEC_PATH_MAP_VERSION,
    manifestationVersion: QEC_MANIFESTATION_VERSION,
    seed: input.seed,
    traceHash,
    source: input.source,
    sourceHash: contentHash({ source: input.source }),
    initialState: [...input.initialState],
    finalState: [...input.finalState],
    hiddenKey: input.hiddenKey,
    patternShape: input.patternShape,
    returningLetters: [...input.returningLetters],
    gates: [...input.gates],
    trace,
    validation: {
      status: "valid",
      registerCount: 23,
      traceComplete: true,
      deterministic: true,
    },
  };
  const inspection = inspectRunPassport(passport);
  if (!inspection.valid)
    throw new TypeError(`Cannot create Run Passport: ${inspection.errors.join(", ")}`);
  return passport;
}
export function serializeRunPassport(passport: QECRunPassport): string {
  const inspection = inspectRunPassport(passport);
  if (!inspection.valid)
    throw new TypeError(`Cannot serialize Run Passport: ${inspection.errors.join(", ")}`);
  return `${JSON.stringify(passport, null, 2)}\n`;
}
export type PrivacyLabel = "public" | "private" | "sensitive";
export type ValidationStatus = "pending" | "valid" | "invalid";
export type CapabilityName = "web.read" | "grid.compute" | "sandbox.execute";
export type SefirahName =
  | "Keter"
  | "Chokhmah"
  | "Binah"
  | "Chesed"
  | "Gevurah"
  | "Tiferet"
  | "Netzach"
  | "Hod"
  | "Yesod"
  | "Malchut"
  | "Daat";

export interface SourceReference {
  readonly uri: string;
  readonly start?: number;
  readonly end?: number;
}
export interface QECMetadata {
  readonly schemaVersion: typeof QEC_SCHEMA_VERSION;
  readonly contentHash: string;
  readonly createdAt: string;
  readonly producer: string;
  readonly sourceReferences: readonly SourceReference[];
  readonly privacyLabel: PrivacyLabel;
  readonly validationStatus: ValidationStatus;
}
export interface ResourceBudget {
  readonly maxSteps: number;
  readonly maxTimeMs: number;
  readonly maxMemoryBytes: number;
  readonly maxWebRequests: number;
  readonly maxGridTasks: number;
}
export interface CapabilityGrant {
  readonly capability: CapabilityName;
  readonly granted: boolean;
  readonly scope: readonly string[];
  readonly requiresConfirmation: boolean;
}
export interface HumanConfirmation {
  readonly required: boolean;
  readonly confirmed: boolean;
  readonly previewHash?: string;
}
export interface ExecutionManifest extends QECMetadata {
  readonly languageVersion: typeof IVRIT_SPEC_VERSION;
  readonly programHash: string;
  readonly purpose: string;
  readonly declaredInputs: readonly string[];
  readonly declaredOutputs: readonly string[];
  readonly capabilities: readonly CapabilityGrant[];
  readonly resourceBudget: ResourceBudget;
  readonly deterministicSeed: number;
  readonly provenanceRequired: boolean;
  readonly confirmation: HumanConfirmation;
}
export interface Token {
  readonly kind:
    | "letter"
    | "modifier"
    | "control"
    | "register"
    | "identifier"
    | "integer"
    | "float"
    | "string"
    | "comma"
    | "newline"
    | "comment";
  readonly text: string;
  readonly normalized: string;
  readonly start: number;
  readonly end: number;
  readonly codePoints: readonly string[];
}
export interface IvritInstruction {
  readonly opcode: HebrewLetter;
  readonly opcodeName: string;
  readonly modifier: { readonly name: string; readonly semantic: string };
  readonly controlMarks: readonly { readonly name: string; readonly semantic: string }[];
  readonly operands: readonly (
    | { readonly kind: "register"; readonly name: string }
    | { readonly kind: "integer"; readonly value: number }
  )[];
  readonly start: number;
  readonly end: number;
}
export interface QECProgram extends QECMetadata {
  readonly source: string;
  readonly tokens: readonly Token[];
  readonly instructions: readonly IvritInstruction[];
}
export interface SefirahStage {
  readonly name: SefirahName;
  readonly responsibility: string;
  readonly status: "pending" | "running" | "passed" | "denied" | "skipped";
  readonly events: readonly string[];
}
export interface PathChannel {
  readonly id: string;
  readonly kind: "opcode" | "transition";
  readonly label: string;
  readonly dataType: string;
  readonly capability?: CapabilityName;
}
export interface GatePair {
  readonly id: string;
  readonly left: HebrewLetter;
  readonly right: HebrewLetter;
  readonly index: number;
}
export interface GateRule {
  readonly pairId: string;
  readonly version: string;
  readonly status: "unassigned" | "approved" | "rejected";
  readonly composition?:
    "fusion" | "sequence" | "dataflow" | "conflict" | "optimization" | "rejection";
  readonly description?: string;
  readonly reviewedBy?: string;
}
export interface GateDecision {
  readonly pairId: string;
  readonly executable: boolean;
  readonly reason: string;
  readonly ruleVersion?: string;
}
export interface WaveSignal extends QECMetadata {
  readonly pathId: string;
  readonly dataType: string;
  readonly payloadHash: string;
}
export interface GraphNode extends QECMetadata {
  readonly id: string;
  readonly kind: "source" | "transformation" | "hypothesis" | "observer" | "result";
  readonly label: string;
}
export interface Evidence extends QECMetadata {
  readonly claim: string;
  readonly locator: string;
  readonly integrityHash: string;
}
export interface ProvenanceRecord extends QECMetadata {
  readonly activity: string;
  readonly inputHashes: readonly string[];
  readonly outputHashes: readonly string[];
  readonly evidenceIds: readonly string[];
}
export interface TraceEvent {
  readonly sequence: number;
  readonly stage: SefirahName;
  readonly status: SefirahStage["status"];
  readonly message: string;
  readonly stateHash: string;
}
export interface ExecutionTrace extends QECMetadata {
  readonly traceId: string;
  readonly manifestHash: string;
  readonly events: readonly TraceEvent[];
  readonly replayHash: string;
}
export interface VerificationResult extends QECMetadata {
  readonly verified: boolean;
  readonly checks: readonly {
    readonly name: string;
    readonly passed: boolean;
    readonly message: string;
  }[];
}
export interface PolicyDecision extends QECMetadata {
  readonly allowed: boolean;
  readonly denials: readonly string[];
  readonly grantedCapabilities: readonly CapabilityName[];
}
export interface SandboxResult extends QECMetadata {
  readonly exitCode: number;
  readonly outputs: Readonly<Record<string, number>>;
  readonly warnings: readonly string[];
  readonly budgetUsed: { readonly steps: number; readonly timeMs: number };
}

const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "createdAt" && key !== "contentHash")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
};
export const contentHash = (value: unknown): string => {
  let hash = 0x811c9dc5;
  for (const character of canonical(value)) {
    hash ^= character.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, "0")}`;
};
export const metadata = (
  producer: string,
  privacyLabel: PrivacyLabel = "private",
  sourceReferences: readonly SourceReference[] = [],
): QECMetadata => ({
  schemaVersion: QEC_SCHEMA_VERSION,
  contentHash: "pending",
  createdAt: new Date(0).toISOString(),
  producer,
  sourceReferences,
  privacyLabel,
  validationStatus: "pending",
});

export const SEFIRAH_RESPONSIBILITIES: Readonly<Record<SefirahName, string>> = {
  Keter: "Purpose and governing policy",
  Chokhmah: "Candidate generation",
  Binah: "Parsing, typing, and validation",
  Chesed: "Permissioned retrieval",
  Gevurah: "Security and budget enforcement",
  Tiferet: "Integration and conflict preservation",
  Netzach: "Deterministic scheduling",
  Hod: "Compilation and serialization",
  Yesod: "State, events, and replay",
  Malchut: "Sandboxed execution and results",
  Daat: "Explicit verification and provenance boundary",
};
export const OBJECT_SCHEMAS = {
  ExecutionManifest: {
    $id: "qec-0.1/ExecutionManifest",
    type: "object",
    required: [
      "schemaVersion",
      "programHash",
      "capabilities",
      "resourceBudget",
      "deterministicSeed",
    ],
    additionalProperties: false,
  },
  QECProgram: {
    $id: "qec-0.1/QECProgram",
    type: "object",
    required: ["schemaVersion", "source", "tokens", "instructions"],
    additionalProperties: false,
  },
  ExecutionTrace: {
    $id: "qec-0.1/ExecutionTrace",
    type: "object",
    required: ["traceId", "manifestHash", "events", "replayHash"],
    additionalProperties: false,
  },
} as const;
