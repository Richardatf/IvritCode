import {
  contentHash,
  metadata,
  type ExecutionManifest,
  type ExecutionTrace,
  type TraceEvent,
} from "@qec/spec";
export class TraceAssembler {
  readonly #events: TraceEvent[] = [];
  constructor(readonly manifest: ExecutionManifest) {}
  record(
    stage: TraceEvent["stage"],
    status: TraceEvent["status"],
    message: string,
    state: unknown,
  ): void {
    this.#events.push({
      sequence: this.#events.length,
      stage,
      status,
      message,
      stateHash: contentHash(state),
    });
  }
  finish(): ExecutionTrace {
    const core = {
      traceId: `trace-${contentHash(this.#events)}`,
      manifestHash: this.manifest.contentHash,
      events: [...this.#events],
      replayHash: contentHash({ manifest: this.manifest.contentHash, events: this.#events }),
    };
    const base = { ...metadata("@qec/provenance", this.manifest.privacyLabel), ...core };
    return { ...base, validationStatus: "valid", contentHash: contentHash(base) };
  }
}
export const exportProvenanceBundle = (
  manifest: ExecutionManifest,
  trace: ExecutionTrace,
  result: unknown,
): string =>
  JSON.stringify(
    {
      schemaVersion: "qec-0.1",
      manifest,
      trace,
      result,
      bundleHash: contentHash({ manifest, trace, result }),
    },
    null,
    2,
  );
