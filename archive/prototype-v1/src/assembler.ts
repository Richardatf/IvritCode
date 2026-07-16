import { HEBREW_LETTERS, LETTER_NAMES } from "./alphabet.js";
import { UnknownInstructionError } from "./errors.js";
import { parseProgram, type IvritProgram } from "./parser.js";

const NAME_TO_LETTER = new Map(LETTER_NAMES.map((name, index) => [name.toUpperCase(), HEBREW_LETTERS[index]]));

export function assemble(source: string): IvritProgram {
  const lines = source.split(/\r?\n/);
  const letters: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].replace(/#.*/, "").trim();
    if (!line) continue;
    for (const token of line.split(/\s+/)) {
      const letter = NAME_TO_LETTER.get(token.toUpperCase()) ?? (HEBREW_LETTERS.includes(token as never) ? token : undefined);
      if (!letter) throw new UnknownInstructionError(`Unknown assembly instruction '${token}'.`, { line: index + 1, column: lines[index].indexOf(token) + 1, offset: 0 });
      letters.push(letter);
    }
  }
  return parseProgram(letters.join(""));
}
