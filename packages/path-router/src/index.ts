import { HEBREW_LETTERS, type PathChannel, type TraceEvent, type WaveSignal } from "@qec/spec";
export const TRANSITION_PATHS = [
  "intent-to-parse",
  "parse-to-verify",
  "verify-to-plan",
  "plan-to-policy",
  "policy-to-integrate",
  "integrate-to-schedule",
  "schedule-to-compile",
  "compile-to-state",
  "state-to-execute",
  "execute-to-result",
] as const;
export const PATH_CHANNELS: readonly PathChannel[] = [
  ...HEBREW_LETTERS.map((letter, index) => ({
    id: `opcode-${index + 1}`,
    kind: "opcode" as const,
    label: letter,
    dataType: "IvritInstruction",
  })),
  ...TRANSITION_PATHS.map((label, index) => ({
    id: `transition-${index + 1}`,
    kind: "transition" as const,
    label,
    dataType: "TraceEvent",
  })),
];
export const routeSignal = (
  signal: WaveSignal,
  events: readonly TraceEvent[],
): { readonly accepted: boolean; readonly reason: string } => {
  const path = PATH_CHANNELS.find((item) => item.id === signal.pathId);
  if (!path) return { accepted: false, reason: "Unknown path channel." };
  if (!events.length)
    return { accepted: false, reason: "Signals require an auditable trace event." };
  return { accepted: true, reason: `Routed on ${path.label}.` };
};
