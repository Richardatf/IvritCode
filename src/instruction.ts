import type { HebrewLetter } from "./alphabet.js";
import { HEBREW_LETTERS, LETTER_NAMES } from "./alphabet.js";
import type { SourceLocation } from "./errors.js";

export const NIQQUD = {
  "\u05B0": "Sheva", "\u05B4": "Hiriq", "\u05B5": "Tzere",
  "\u05B6": "Segol", "\u05B7": "Patach", "\u05B8": "Qamatz",
  "\u05B9": "Holam", "\u05BB": "Qubutz", "\u05BC": "Dagesh",
  "\u05C1": "ShinDot", "\u05C2": "SinDot",
} as const;

export type NiqqudName = (typeof NIQQUD)[keyof typeof NIQQUD];

export interface NiqqudModifier { mark: string; name: NiqqudName }
export interface CantillationMark { mark: string; codePoint: number }

export interface ParsedInstruction {
  letter: HebrewLetter;
  opcodeIndex: number;
  niqqud: NiqqudModifier[];
  cantillation: CantillationMark[];
  source: SourceLocation & { raw: string };
}

export interface InstructionDefinition {
  letter: HebrewLetter;
  name: string;
  index: number;
  description: string;
  readsAlephOlam: boolean;
  writesAlephOlam: boolean;
  modifierPolicy: "neutral-v1.1";
}

const DESCRIPTIONS = [
  "Identity frame", "Add paired halves", "Multiply paired halves", "Difference paired halves",
  "Map balanced signs", "Swap halves", "Increment letters", "Decrement letters",
  "Square letters", "Broadcast Aleph Olam", "Four-letter sliding sum", "Global sum and recenter",
  "Three-point moving average", "Global negation", "Rotate by Aleph Olam", "Maximize half correlation",
  "Expose Aleph register", "Compare halves", "Mirror and tilt", "Reseed from Aleph Olam",
  "Nonlinear four-register mix", "Rotate four-register groups",
] as const;

const READS_A = new Set(["י", "נ", "ס", "ר"]);
const WRITES_A = new Set(["ה", "ט", "ל", "מ", "נ", "ע", "פ", "צ", "ש"]);

export const INSTRUCTION_DEFINITIONS: readonly InstructionDefinition[] = HEBREW_LETTERS.map((letter, index) => ({
  letter,
  name: LETTER_NAMES[index],
  index,
  description: DESCRIPTIONS[index],
  readsAlephOlam: READS_A.has(letter),
  writesAlephOlam: WRITES_A.has(letter),
  modifierPolicy: "neutral-v1.1",
}));
