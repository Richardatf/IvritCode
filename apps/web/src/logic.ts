import {
  createHebrewSeed,
  createNumericSeed,
  makeZeroState,
  type IvritState,
} from "@ivritcode/core";
export type InitialMode = "zero" | "numeric" | "hebrew";
export function initialState(mode: InitialMode, seed: string): IvritState {
  if (mode === "numeric") return createNumericSeed(Number(seed || 0));
  if (mode === "hebrew") return createHebrewSeed(seed);
  return makeZeroState();
}
export function downloadProgram(source: string): Blob {
  return new Blob([source], { type: "text/plain;charset=utf-8" });
}
