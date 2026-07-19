import languageSpec from "./ivritcode-0.1.json" with { type: "json" };
export const IVRIT_LANGUAGE_SPEC = languageSpec;
export const QEC_SCHEMA_VERSION = "qec-0.1" as const;
export const IVRIT_SPEC_VERSION = "ivritcode-1.0" as const;
export const IVRIT_EXCHANGE_VERSION = "ivritcode-exchange-0.1" as const;
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
  | "Malkhut"
  | "Da'at";

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
  Malkhut: "Sandboxed execution and results",
  "Da'at": "Explicit verification and provenance boundary",
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
