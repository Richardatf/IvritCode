import { canonicalLetter, LETTER_INDEX } from "./alphabet.js";
import { InvalidModifierError, MalformedUnicodeError } from "./errors.js";
import { NIQQUD, type CantillationMark, type NiqqudModifier, type ParsedInstruction } from "./instruction.js";

export interface ParseOptions { filename?: string }
export interface IvritProgram { source: string; instructions: ParsedInstruction[] }

const isCantillation = (cp: number) => (cp >= 0x0591 && cp <= 0x05af) || cp === 0x05bd;
const isHebrewCombiningMark = (ch: string) => /\p{M}/u.test(ch) && ch.codePointAt(0)! >= 0x0591 && ch.codePointAt(0)! <= 0x05c7;

export function parseProgram(source: string, options: ParseOptions = {}): IvritProgram {
  const normalized = source.normalize("NFD");
  const instructions: ParsedInstruction[] = [];
  let line = 1;
  let column = 1;
  let offset = 0;
  let inComment = false;
  let canAttachMark = false;

  for (const ch of normalized) {
    const cp = ch.codePointAt(0)!;
    if (ch === "\n") { line++; column = 1; offset += ch.length; inComment = false; canAttachMark = false; continue; }
    if (inComment) { column++; offset += ch.length; continue; }
    if (ch === "#") { inComment = true; canAttachMark = false; column++; offset += ch.length; continue; }

    const letter = canonicalLetter(ch);
    if (letter) {
      instructions.push({
        letter,
        opcodeIndex: LETTER_INDEX.get(letter)!,
        niqqud: [],
        cantillation: [],
        source: { filename: options.filename, line, column, offset, raw: ch },
      });
      canAttachMark = true;
    } else if (isHebrewCombiningMark(ch)) {
      const previous = instructions.at(-1);
      if (!previous || !canAttachMark) {
        throw new MalformedUnicodeError("A Hebrew combining mark has no preceding instruction.", { filename: options.filename, line, column, offset });
      }
      previous.source.raw += ch;
      if (ch in NIQQUD) {
        previous.niqqud.push({ mark: ch, name: NIQQUD[ch as keyof typeof NIQQUD] } as NiqqudModifier);
      } else if (isCantillation(cp)) {
        previous.cantillation.push({ mark: ch, codePoint: cp } as CantillationMark);
      } else {
        throw new InvalidModifierError(`Hebrew modifier U+${cp.toString(16).toUpperCase().padStart(4, "0")} is not supported.`, { filename: options.filename, line, column, offset });
      }
    } else canAttachMark = false;
    column++;
    offset += ch.length;
  }
  return { source: normalized, instructions };
}

export function extractProgramLetters(source: string): string[] {
  return parseProgram(source).instructions.map(({ letter }) => letter);
}
