import { HEBREW_LETTERS, LETTER_NAMES, type HebrewLetter } from "@ivritcode/unicode";
import { mod22, normalizeState, toBalanced, type IvritState } from "./state.js";
export interface InstructionDefinition {
  readonly letter: HebrewLetter;
  readonly name: string;
  readonly index: number;
  readonly summary: string;
  readonly readsAlephOlam: boolean;
  readonly writesAlephOlam: boolean;
}
const summaries = [
  "Frame checkpoint",
  "Pairwise addition",
  "Pairwise multiplication",
  "Opposing differences",
  "Balanced sign revelation",
  "Join and exchange halves",
  "Ascend visible registers",
  "Descend visible registers",
  "Nonlinear square",
  "Seed from Aleph Olam",
  "Four-register circular window",
  "Global measure and recenter",
  "Circular smoothing",
  "Balanced negation",
  "Rotate by Aleph Olam",
  "Maximum half correlation",
  "Expose visible Aleph",
  "Compare register halves",
  "Mirror and incline",
  "Reseed with Bet stride",
  "Nonlinear circular mixing",
  "Seal circular quartets",
];
const reads = new Set(["י", "נ", "ס", "ר"]),
  writes = new Set(["ה", "ט", "ל", "מ", "נ", "ע", "פ", "צ", "ש"]);
export const INSTRUCTION_DEFINITIONS: readonly InstructionDefinition[] = HEBREW_LETTERS.map(
  (letter, index) => ({
    letter,
    name: LETTER_NAMES[index]!,
    index,
    summary: summaries[index]!,
    readsAlephOlam: reads.has(letter),
    writesAlephOlam: writes.has(letter),
  }),
);
export function getInstructionDefinition(letter: HebrewLetter): InstructionDefinition {
  return INSTRUCTION_DEFINITIONS[HEBREW_LETTERS.indexOf(letter)]!;
}
const balanced = (value: number) => toBalanced(mod22(value));
export function applyLetter(state: IvritState, letter: HebrewLetter): IvritState {
  const old = normalizeState(state),
    next = [...old],
    A = old[22]!;
  const prev = (i: number) => (i + 21) % 22,
    nextIndex = (i: number) => (i + 1) % 22;
  switch (letter) {
    case "א":
      break;
    case "ב":
      for (let i = 0; i < 11; i++) next[i + 11] = mod22(old[i + 11]! + old[i]!);
      break;
    case "ג":
      for (let i = 0; i < 11; i++) next[i + 11] = mod22(old[i + 11]! * old[i]!);
      break;
    case "ד":
      for (let i = 0; i < 11; i++) {
        next[i] = mod22(old[i + 11]! - old[i]!);
        next[i + 11] = mod22(old[i]! - old[i + 11]!);
      }
      break;
    case "ה": {
      let sum = 0;
      for (let i = 0; i < 22; i++) {
        const sign = Math.sign(balanced(old[i]!));
        next[i] = mod22(sign);
        sum += sign;
      }
      next[22] = mod22(sum);
      break;
    }
    case "ו":
      for (let i = 0; i < 11; i++) {
        next[i] = old[i + 11]!;
        next[i + 11] = old[i]!;
      }
      break;
    case "ז":
      for (let i = 0; i < 22; i++) next[i] = mod22(old[i]! + 1);
      break;
    case "ח":
      for (let i = 0; i < 22; i++) next[i] = mod22(old[i]! - 1);
      break;
    case "ט": {
      let sum = 0;
      for (let i = 0; i < 22; i++) {
        const square = old[i]! * old[i]!;
        next[i] = mod22(square);
        sum += square;
      }
      next[22] = mod22(sum);
      break;
    }
    case "י":
      for (let i = 0; i < 22; i++) next[i] = A;
      break;
    case "כ":
      for (let i = 0; i < 22; i++)
        next[i] = mod22(old[i]! + old[nextIndex(i)]! + old[(i + 2) % 22]! + old[(i + 3) % 22]!);
      break;
    case "ל": {
      const sum = old.slice(0, 22).reduce((total, value) => total + balanced(value), 0),
        mean = Math.trunc(sum / 22);
      for (let i = 0; i < 22; i++) next[i] = mod22(balanced(old[i]!) - mean);
      next[22] = mod22(sum);
      break;
    }
    case "מ": {
      let sum = 0;
      for (let i = 0; i < 22; i++) {
        const mean = Math.trunc(
          (balanced(old[prev(i)]!) + balanced(old[i]!) + balanced(old[nextIndex(i)]!)) / 3,
        );
        next[i] = mod22(mean);
        sum += mean;
      }
      next[22] = mod22(Math.trunc(sum / 22));
      break;
    }
    case "נ":
      for (let i = 0; i < 23; i++) next[i] = mod22(-balanced(old[i]!));
      break;
    case "ס": {
      const shift = ((balanced(A) % 22) + 22) % 22;
      for (let i = 0; i < 22; i++) next[i] = old[(i - shift + 22) % 22]!;
      break;
    }
    case "ע": {
      let maximum = -Infinity;
      for (let shift = 0; shift < 11; shift++) {
        let correlation = 0;
        for (let i = 0; i < 11; i++)
          correlation += balanced(old[i]!) * balanced(old[11 + ((i + shift) % 11)]!);
        maximum = Math.max(maximum, correlation);
      }
      next[22] = mod22(maximum);
      break;
    }
    case "פ":
      next[22] = old[0]!;
      next[1] = mod22(old[1]! + old[0]!);
      next[21] = mod22(old[21]! + old[0]!);
      break;
    case "צ": {
      const left = old.slice(0, 11).reduce((t, v) => t + balanced(v), 0),
        right = old.slice(11, 22).reduce((t, v) => t + balanced(v), 0);
      next[22] = left === right ? 0 : left > right ? 1 : 21;
      if (left > right) next[0] = mod22(Math.max(...old.slice(0, 11).map(balanced)));
      if (right > left) next[21] = mod22(Math.max(...old.slice(11, 22).map(balanced)));
      break;
    }
    case "ק":
      for (let i = 0; i < 22; i++) next[i] = mod22(old[21 - i]! + i);
      break;
    case "ר": {
      const stride = balanced(old[1]!) || 1;
      for (let i = 0; i < 22; i++) next[i] = mod22(balanced(A) + i * stride);
      break;
    }
    case "ש": {
      for (let base = 0; base < 22; base += 4) {
        const indices = [base % 22, (base + 1) % 22, (base + 2) % 22, (base + 3) % 22],
          values = indices.map((i) => balanced(old[i]!));
        for (let j = 0; j < 4; j++)
          next[indices[j]!] = mod22(values[j]! * values[j]! + values[(j + 1) % 4]!);
      }
      next[22] = mod22(Math.max(...next.slice(0, 22).map((v) => Math.abs(balanced(v)))));
      break;
    }
    case "ת":
      for (let base = 0; base < 22; base += 4) {
        const a = base % 22,
          b = (base + 1) % 22,
          c = (base + 2) % 22,
          d = (base + 3) % 22;
        next[a] = old[c]!;
        next[b] = old[d]!;
        next[c] = old[a]!;
        next[d] = old[b]!;
      }
      break;
  }
  return normalizeState(next);
}
