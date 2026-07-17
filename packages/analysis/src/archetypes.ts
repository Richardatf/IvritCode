import { HEBREW_LETTERS, LETTER_NAMES, type HebrewLetter } from "@ivritcode/unicode";

export interface LetterArchetype {
  readonly letter: HebrewLetter;
  readonly name: string;
  readonly title: string;
  readonly themes: readonly string[];
  readonly sourcePhrase: string;
  readonly destinationPhrase: string;
}
const DEFINITIONS = [
  ["Origin", ["unity", "silence"], "Origin", "the Origin"],
  ["House", ["vessel", "interior"], "The House", "the House"],
  ["Movement", ["giving", "passage"], "Movement", "Movement and passage"],
  ["Door", ["threshold", "opening"], "The Door", "the Threshold"],
  ["Breath", ["revelation", "presence"], "Breath", "Breath and revelation"],
  ["Bond", ["joining", "connection"], "The Bond", "Connection"],
  ["Edge", ["distinction", "discernment"], "The Edge", "Discernment"],
  ["Boundary", ["enclosure", "living field"], "The Boundary", "the living Field"],
  ["Hidden potential", ["gestation"], "Hidden potential", "Hidden potential"],
  ["Seed", ["point", "concentrated beginning"], "The Seed", "the Seed"],
  ["Palm", ["capacity", "receiving"], "The Palm", "Capacity and receiving"],
  ["Learning", ["direction", "ascent"], "Learning", "Learning and ascent"],
  ["Waters", ["flow", "memory"], "The Waters", "Waters and memory"],
  ["Continuance", ["emergence", "descent and return"], "Continuance", "Continuance"],
  ["Support", ["orbit", "surrounding"], "Support", "Support and orbit"],
  ["Sight", ["perception", "inward seeing"], "Sight", "inward Sight"],
  ["Mouth", ["expression", "release"], "The Mouth", "Expression"],
  ["Alignment", ["integrity", "the straight path"], "Alignment", "Alignment"],
  ["Horizon", ["distance", "what lies beyond"], "The Horizon", "the Horizon"],
  ["Head", ["beginning", "renewed order"], "The Head", "Renewed order"],
  ["Fire", ["change", "many forces becoming one"], "Fire", "Fire and transformation"],
  ["Seal", ["completion", "imprint"], "The Seal", "Completion and imprint"],
] as const;

export const LETTER_ARCHETYPES: readonly LetterArchetype[] = DEFINITIONS.map(
  ([title, themes, sourcePhrase, destinationPhrase], index) => ({
    letter: HEBREW_LETTERS[index]!,
    name: LETTER_NAMES[index]!,
    title,
    themes,
    sourcePhrase,
    destinationPhrase,
  }),
);
export type PatternShape =
  | "FULL_SPECTRUM"
  | "CHORUS"
  | "MIRROR"
  | "RETURN"
  | "SPIRAL"
  | "FLAME"
  | "STILL_POINT"
  | "OPEN_FIELD";
export interface RegisterInterpretation {
  readonly source: HebrewLetter;
  readonly target: HebrewLetter;
  readonly phrase: string;
  readonly changed: boolean;
  readonly selfReturn: boolean;
  readonly gates: readonly string[];
}
export interface ConstellationReading {
  readonly hiddenKey: HebrewLetter;
  readonly distinctValueCount: number;
  readonly dominantLetters: readonly HebrewLetter[];
  readonly returningLetters: readonly HebrewLetter[];
  readonly changedRegisters: number;
  readonly strongestGates: readonly string[];
  readonly symmetryScore: number;
  readonly rotationScore: number;
  readonly dispersionScore: number;
  readonly patternShape: PatternShape;
  readonly summary: string;
  readonly warnings: readonly string[];
  readonly registers: readonly RegisterInterpretation[];
}
export interface AnalyzableExecution {
  readonly finalState: readonly number[];
  readonly program: { readonly instructions: readonly { readonly letter: HebrewLetter }[] };
}
const mod22 = (value: number) => ((Math.trunc(value) % 22) + 22) % 22;
export const valueToHebrewLetter = (value: number): HebrewLetter => HEBREW_LETTERS[mod22(value)]!;
export function interpretRegister(
  sourceLetter: HebrewLetter,
  targetLetter: HebrewLetter,
  gates: readonly string[] = [],
): RegisterInterpretation {
  const source = LETTER_ARCHETYPES[HEBREW_LETTERS.indexOf(sourceLetter)]!,
    target = LETTER_ARCHETYPES[HEBREW_LETTERS.indexOf(targetLetter)]!,
    selfReturn = sourceLetter === targetLetter;
  return {
    source: sourceLetter,
    target: targetLetter,
    phrase: selfReturn
      ? `${source.sourcePhrase} returns to itself.`
      : `${source.sourcePhrase} turns toward ${target.destinationPhrase}.`,
    changed: !selfReturn,
    selfReturn,
    gates,
  };
}
export const findReturningLetters = (state: readonly number[]): HebrewLetter[] =>
  HEBREW_LETTERS.filter((_, index) => mod22(state[index] ?? 0) === index);
export function findDominantTargets(state: readonly number[]): HebrewLetter[] {
  const counts = new Array<number>(22).fill(0);
  state.slice(0, 22).forEach((value) => {
    const index = mod22(value);
    counts[index] = (counts[index] ?? 0) + 1;
  });
  const max = Math.max(...counts);
  return max <= 1 ? [] : HEBREW_LETTERS.filter((_, index) => counts[index] === max);
}
export function calculateSymmetry(state: readonly number[]): number {
  let matches = 0;
  for (let index = 0; index < 11; index++) {
    const left = mod22(state[index] ?? 0),
      right = mod22(state[index + 11] ?? 0);
    if (left === right || mod22(left + right) === 21) matches++;
  }
  return matches / 11;
}
export function calculateRotationCorrelation(state: readonly number[]): number {
  let best = 0;
  for (let rotation = 1; rotation < 22; rotation++) {
    let matches = 0;
    for (let index = 0; index < 22; index++)
      if (mod22(state[index] ?? 0) === mod22(index + rotation)) matches++;
    best = Math.max(best, matches / 22);
  }
  return best;
}
function strongestProgramGates(program: AnalyzableExecution["program"]): string[] {
  const counts = new Map<string, number>();
  for (let index = 0; index < program.instructions.length - 1; index++) {
    const gate = `${program.instructions[index]!.letter}־${program.instructions[index + 1]!.letter}`;
    counts.set(gate, (counts.get(gate) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([gate]) => gate);
}
export function generateConstellationSummary(
  reading: Omit<ConstellationReading, "summary">,
): string {
  const focus = reading.dominantLetters.length
    ? `The pattern gathers around ${reading.dominantLetters.map((letter) => LETTER_ARCHETYPES[HEBREW_LETTERS.indexOf(letter)]!.title).join(", ")}.`
    : `The pattern distributes itself across ${reading.distinctValueCount} letters.`;
  const returns = reading.returningLetters.length
    ? ` ${reading.returningLetters.length} letters return to themselves.`
    : " No letter returns exactly to its starting place.";
  const evidence =
    reading.patternShape === "MIRROR"
      ? " The two halves answer one another across the circle."
      : reading.patternShape === "SPIRAL"
        ? " The result follows a strong circular rotation."
        : "";
  return `${focus}${returns}${evidence}`;
}
export function analyzeConstellation(result: AnalyzableExecution): ConstellationReading {
  const visible = result.finalState.slice(0, 22).map(mod22),
    distinctValueCount = new Set(visible).size,
    returningLetters = findReturningLetters(visible),
    dominantLetters = findDominantTargets(visible),
    changedRegisters = 22 - returningLetters.length,
    symmetryScore = calculateSymmetry(visible),
    rotationScore = calculateRotationCorrelation(visible),
    meanMovement =
      visible.reduce(
        (sum, value, index) => sum + Math.min(mod22(value - index), mod22(index - value)),
        0,
      ) / 22,
    dispersionScore = distinctValueCount / 22,
    counts = new Array<number>(22).fill(0);
  visible.forEach((value) => (counts[value] = (counts[value] ?? 0) + 1));
  const maximumChorus = Math.max(...counts);
  let patternShape: PatternShape = "OPEN_FIELD";
  if (changedRegisters <= 3) patternShape = "STILL_POINT";
  else if (rotationScore >= 0.75) patternShape = "SPIRAL";
  else if (distinctValueCount === 22) patternShape = "FULL_SPECTRUM";
  else if (symmetryScore >= 0.45) patternShape = "MIRROR";
  else if (returningLetters.length >= 8) patternShape = "RETURN";
  else if (maximumChorus >= 4 || distinctValueCount <= 7) patternShape = "CHORUS";
  else if (meanMovement >= 7 && dispersionScore >= 0.65) patternShape = "FLAME";
  const strongestGates = strongestProgramGates(result.program),
    gateBySource = new Map<HebrewLetter, string[]>();
  strongestGates.forEach((gate) => {
    const source = gate[0] as HebrewLetter;
    gateBySource.set(source, [...(gateBySource.get(source) ?? []), gate]);
  });
  const partial = {
    hiddenKey: valueToHebrewLetter(result.finalState[22] ?? 0),
    distinctValueCount,
    dominantLetters,
    returningLetters,
    changedRegisters,
    strongestGates,
    symmetryScore,
    rotationScore,
    dispersionScore,
    patternShape,
    warnings: [
      "Symbolic vocabulary is a project-defined reflective convention, not theological authority.",
    ],
    registers: HEBREW_LETTERS.map((source, index) =>
      interpretRegister(source, valueToHebrewLetter(visible[index]!), gateBySource.get(source)),
    ),
  };
  return { ...partial, summary: generateConstellationSummary(partial) };
}
