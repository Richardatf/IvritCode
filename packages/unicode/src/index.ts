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
export const FINAL_FORMS = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" } as const;
export const LETTER_NAMES = [
  "Aleph",
  "Bet",
  "Gimel",
  "Dalet",
  "Heh",
  "Vav",
  "Zayin",
  "Chet",
  "Tet",
  "Yod",
  "Kaf",
  "Lamed",
  "Mem",
  "Nun",
  "Samekh",
  "Ayin",
  "Peh",
  "Tsadi",
  "Qof",
  "Resh",
  "Shin",
  "Tav",
] as const;
export const NIQQUD_NAMES: Readonly<Record<string, string>> = {
  "\u05b0": "Sheva",
  "\u05b4": "Hiriq",
  "\u05b5": "Tzere",
  "\u05b6": "Segol",
  "\u05b7": "Patach",
  "\u05b8": "Qamatz",
  "\u05b9": "Holam",
  "\u05bb": "Qubutz",
  "\u05bc": "Dagesh",
  "\u05c1": "Shin Dot",
  "\u05c2": "Sin Dot",
};
export const CANTILLATION_NAMES: Readonly<Record<string, string>> = {
  "\u0591": "Etnahta",
  "\u0592": "Segol accent",
  "\u0593": "Shalshelet",
  "\u0594": "Zaqef qatan",
  "\u0595": "Zaqef gadol",
  "\u0596": "Tipeha",
  "\u0597": "Revia",
  "\u0598": "Zarqa",
  "\u0599": "Pashta",
  "\u059a": "Yetiv",
  "\u059b": "Tevir",
  "\u059c": "Geresh",
  "\u059d": "Geresh muqdam",
  "\u059e": "Gershayim",
  "\u059f": "Qarney para",
  "\u05a0": "Telisha gedola",
  "\u05a1": "Pazer",
  "\u05a3": "Munah",
  "\u05a4": "Mahapakh",
  "\u05a5": "Merkha",
  "\u05a6": "Merkha kefula",
  "\u05a7": "Darga",
  "\u05a8": "Qadma",
  "\u05a9": "Telisha qetana",
  "\u05aa": "Yerah ben yomo",
  "\u05ab": "Ole",
  "\u05ac": "Iluy",
  "\u05ad": "Dehi",
  "\u05ae": "Zinor",
  "\u05af": "Masora circle",
  "\u05bd": "Meteg",
};

export interface SourceLocation {
  readonly filename?: string;
  readonly line: number;
  readonly column: number;
  readonly codePointOffset: number;
  readonly utf16Offset: number;
  readonly raw: string;
}
export interface NiqqudModifier {
  readonly mark: string;
  readonly name: string;
}
export interface CantillationMark {
  readonly mark: string;
  readonly name: string;
  readonly codePoint: number;
}
export interface ParsedInstruction {
  readonly letter: HebrewLetter;
  readonly originalLetter: string;
  readonly opcodeIndex: number;
  readonly niqqud: readonly NiqqudModifier[];
  readonly cantillation: readonly CantillationMark[];
  readonly source: SourceLocation;
}
export interface ProgramMetadata {
  readonly filename?: string;
  readonly normalization: "NFD";
  readonly instructionCount: number;
}
export interface IvritProgram {
  readonly source: string;
  readonly normalizedSource: string;
  readonly instructions: readonly ParsedInstruction[];
  readonly metadata: ProgramMetadata;
}
export interface ParseOptions {
  readonly filename?: string;
  readonly strictUnicode?: boolean;
}

export class UnicodeSequenceError extends Error {
  constructor(
    message: string,
    readonly location: SourceLocation,
  ) {
    super(`${location.filename ?? "<input>"}:${location.line}:${location.column} ${message}`);
    this.name = "UnicodeSequenceError";
  }
}

export function canonicalLetter(value: string): HebrewLetter | undefined {
  const index = HEBREW_LETTERS.indexOf(value as HebrewLetter);
  return index >= 0 ? HEBREW_LETTERS[index] : FINAL_FORMS[value as keyof typeof FINAL_FORMS];
}
export function stripHebrewMarks(value: string): string {
  return [...value.normalize("NFD")]
    .filter((character) => !/\p{M}/u.test(character))
    .join("")
    .normalize("NFC");
}

export function parseProgram(source: string, options: ParseOptions = {}): IvritProgram {
  const normalizedSource = source.normalize("NFD");
  const instructions: ParsedInstruction[] = [];
  let line = 1,
    column = 1,
    codePointOffset = 0,
    utf16Offset = 0,
    inComment = false,
    attachable = false;
  for (const character of normalizedSource) {
    const location = (): SourceLocation => ({
      ...(options.filename ? { filename: options.filename } : {}),
      line,
      column,
      codePointOffset,
      utf16Offset,
      raw: character,
    });
    if (character === "\n") {
      line++;
      column = 1;
      codePointOffset++;
      utf16Offset += character.length;
      inComment = false;
      attachable = false;
      continue;
    }
    if (inComment) {
      column++;
      codePointOffset++;
      utf16Offset += character.length;
      continue;
    }
    if (character === "#") {
      inComment = true;
      attachable = false;
      column++;
      codePointOffset++;
      utf16Offset += character.length;
      continue;
    }
    const letter = canonicalLetter(character);
    if (letter) {
      const originalLetter = character;
      const start = location();
      instructions.push({
        letter,
        originalLetter,
        opcodeIndex: HEBREW_LETTERS.indexOf(letter),
        niqqud: [],
        cantillation: [],
        source: start,
      });
      attachable = true;
    } else if (
      /\p{M}/u.test(character) &&
      character.codePointAt(0)! >= 0x0591 &&
      character.codePointAt(0)! <= 0x05c7
    ) {
      const previous = instructions.at(-1);
      if (!previous || !attachable) {
        if (options.strictUnicode ?? true)
          throw new UnicodeSequenceError(
            "Hebrew mark has no adjacent base instruction.",
            location(),
          );
      } else {
        const raw = previous.source.raw + character;
        const niqqud = NIQQUD_NAMES[character];
        const cantillation = CANTILLATION_NAMES[character];
        if (niqqud) (previous.niqqud as NiqqudModifier[]).push({ mark: character, name: niqqud });
        else if (cantillation)
          (previous.cantillation as CantillationMark[]).push({
            mark: character,
            name: cantillation,
            codePoint: character.codePointAt(0)!,
          });
        else if (options.strictUnicode ?? true)
          throw new UnicodeSequenceError(
            `Unsupported Hebrew mark U+${character.codePointAt(0)!.toString(16).toUpperCase()}.`,
            location(),
          );
        (previous.source as { raw: string }).raw = raw;
      }
    } else attachable = false;
    column++;
    codePointOffset++;
    utf16Offset += character.length;
  }
  return {
    source,
    normalizedSource,
    instructions,
    metadata: {
      ...(options.filename ? { filename: options.filename } : {}),
      normalization: "NFD",
      instructionCount: instructions.length,
    },
  };
}
