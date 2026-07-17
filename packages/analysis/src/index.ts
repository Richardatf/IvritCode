import { HEBREW_LETTERS, type HebrewLetter, type IvritProgram } from "@ivritcode/unicode";
export * from "./archetypes.js";
export interface GateOccurrence {
  readonly left: HebrewLetter;
  readonly right: HebrewLetter;
  readonly gate: string;
  readonly startInstruction: number;
  readonly endInstruction: number;
}
export interface GateFrequency {
  readonly gate: string;
  readonly count: number;
  readonly occurrences: readonly GateOccurrence[];
}
export interface GateAnalysisOptions {
  readonly directed?: boolean;
  readonly circular?: boolean;
  readonly includeRepeatedLetters?: boolean;
}
export interface GateAnalysis {
  readonly frequencies: readonly GateFrequency[];
  readonly occurrences: readonly GateOccurrence[];
  readonly matrix: readonly (readonly number[])[];
}
export function analyzeGates(
  input: readonly HebrewLetter[] | IvritProgram,
  options: GateAnalysisOptions = {},
): GateAnalysis {
  const letters: readonly HebrewLetter[] =
      "instructions" in input ? input.instructions.map((item) => item.letter) : input,
    directed = options.directed ?? true,
    circular = options.circular ?? false,
    includeRepeated = options.includeRepeatedLetters ?? true,
    occurrences: GateOccurrence[] = [];
  if (letters.length > 1) {
    const limit = circular ? letters.length : letters.length - 1;
    for (let index = 0; index < limit; index++) {
      let left = letters[index]!,
        right = letters[(index + 1) % letters.length]!;
      if (!includeRepeated && left === right) continue;
      if (!directed && HEBREW_LETTERS.indexOf(left) > HEBREW_LETTERS.indexOf(right))
        [left, right] = [right, left];
      occurrences.push({
        left,
        right,
        gate: `${left}־${right}`,
        startInstruction: index,
        endInstruction: (index + 1) % letters.length,
      });
    }
  }
  const grouped = new Map<string, GateOccurrence[]>();
  for (const occurrence of occurrences)
    grouped.set(occurrence.gate, [...(grouped.get(occurrence.gate) ?? []), occurrence]);
  const frequencies = [...grouped]
    .map(([gate, items]) => ({ gate, count: items.length, occurrences: items }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.occurrences[0]!.startInstruction - b.occurrences[0]!.startInstruction,
    );
  const matrix = Array.from({ length: 22 }, () => new Array<number>(22).fill(0));
  for (const item of occurrences)
    matrix[HEBREW_LETTERS.indexOf(item.left)]![HEBREW_LETTERS.indexOf(item.right)]!++;
  return { frequencies, occurrences, matrix };
}
