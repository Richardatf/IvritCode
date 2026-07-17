import { HEBREW_LETTERS, canonicalLetter } from "@ivritcode/unicode";
import { InvalidStateError } from "./errors.js";
export const REGISTER_COUNT = 23;
export const ALEPH_OLAM_INDEX = 22;
export type Base22Digit =
  0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21;
export type IvritState = readonly number[] & { readonly __ivritState?: true };
export function mod22(value: number): Base22Digit {
  if (!Number.isFinite(value)) throw new InvalidStateError("State values must be finite numbers.");
  const result = Math.trunc(value) % 22;
  return (result < 0 ? result + 22 : result) as Base22Digit;
}
export function toBalanced(value: Base22Digit): number {
  return value <= 10 ? value : value - 22;
}
export function fromBalanced(value: number): Base22Digit {
  return mod22(value);
}
export function normalizeState(values: readonly number[]): IvritState {
  if (values.length !== REGISTER_COUNT)
    throw new InvalidStateError(
      `Expected exactly ${REGISTER_COUNT} registers; received ${values.length}.`,
    );
  return Object.freeze(values.map(mod22)) as IvritState;
}
export function createState(values: readonly number[]): IvritState {
  return normalizeState(values);
}
export function makeZeroState(): IvritState {
  return normalizeState(new Array(REGISTER_COUNT).fill(0));
}
export function makeAlphabetState(programLetters: string = ""): IvritState {
  const values = Array.from({ length: REGISTER_COUNT }, (_, index) => index);
  values[ALEPH_OLAM_INDEX] = [...programLetters.normalize("NFD")].reduce((sum, character) => {
    const letter = canonicalLetter(character);
    return letter ? sum + HEBREW_LETTERS.indexOf(letter) + 1 : sum;
  }, 0);
  return normalizeState(values);
}
export function createNumericSeed(seed: number): IvritState {
  if (!Number.isSafeInteger(seed))
    throw new InvalidStateError("Numeric seed must be a safe integer.");
  let value = BigInt(seed);
  const digits: number[] = [];
  for (let i = 0; i < REGISTER_COUNT; i++) {
    value = BigInt.asUintN(64, value * 6364136223846793005n + 1442695040888963407n);
    digits.push(Number(value % 22n));
  }
  return normalizeState(digits);
}
export function createHebrewSeed(seed: string): IvritState {
  const values = new Array<number>(REGISTER_COUNT).fill(0);
  let position = 0;
  for (const character of seed.normalize("NFD")) {
    const letter = canonicalLetter(character);
    if (letter) {
      const digit = HEBREW_LETTERS.indexOf(letter);
      values[position % 22] = mod22(values[position % 22]! + digit + position);
      position++;
    }
  }
  values[22] = mod22(position);
  return normalizeState(values);
}
export function stateToLetterStream(state: IvritState): string {
  return normalizeState(state)
    .map((digit) => HEBREW_LETTERS[digit] ?? HEBREW_LETTERS[0])
    .join("");
}
export function stateToObject(state: IvritState): Readonly<Record<string, number>> {
  const safe = normalizeState(state);
  return Object.freeze(
    Object.fromEntries([
      ...HEBREW_LETTERS.map((letter, index) => [letter, safe[index]]),
      ["Aleph Olam", safe[22]],
    ]),
  );
}
export function decimalToBase22(value: bigint): Base22Digit[] {
  if (value < 0n) throw new RangeError("Value must be non-negative.");
  if (value === 0n) return [0];
  const output: Base22Digit[] = [];
  for (let n = value; n > 0; n /= 22n) output.unshift(Number(n % 22n) as Base22Digit);
  return output;
}
export function base22ToDecimal(digits: readonly number[]): bigint {
  return digits.reduce((total, digit) => total * 22n + BigInt(mod22(digit)), 0n);
}
export function base22ToHebrew(digits: readonly number[]): string {
  return digits.map((digit) => HEBREW_LETTERS[mod22(digit)]).join("");
}
export function hebrewToBase22(value: string): Base22Digit[] {
  return [...value.normalize("NFD")].flatMap((character) => {
    const letter = canonicalLetter(character);
    return letter ? [HEBREW_LETTERS.indexOf(letter) as Base22Digit] : [];
  });
}
export function formatState(state: IvritState): string {
  const safe = normalizeState(state);
  return safe
    .map(
      (value, index) =>
        `${index === 22 ? "A∞" : HEBREW_LETTERS[index]}:${value.toString(22).toUpperCase().padStart(2, "0")}(${toBalanced(value as Base22Digit)})`,
    )
    .join("  ");
}
