import { HEBREW_LETTERS } from "./alphabet.js";
import { InvalidMachineStateError } from "./errors.js";

export const REGISTER_COUNT = 23;
export const ALEPH_OLAM_INDEX = 22;
export type IvritState = readonly number[];

export function mod22(value: number): number {
  const normalized = Math.trunc(value) % 22;
  return normalized < 0 ? normalized + 22 : normalized;
}

export function normalizeState(state: readonly number[]): number[] {
  if (state.length !== REGISTER_COUNT) {
    throw new InvalidMachineStateError(`Expected exactly 23 registers, received ${state.length}.`);
  }
  return state.map((value, index) => {
    if (!Number.isFinite(value)) throw new InvalidMachineStateError(`Register ${index} is not a finite number.`);
    return mod22(value);
  });
}

export function makeZeroState(): number[] { return new Array(REGISTER_COUNT).fill(0); }
export function stateToLetterStream(state: readonly number[]): string {
  return normalizeState(state).map((value) => HEBREW_LETTERS[value]).join("");
}
