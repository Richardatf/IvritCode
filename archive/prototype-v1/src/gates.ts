import type { HebrewLetter } from "./alphabet.js";

export interface GateFrequency {
  first: HebrewLetter;
  second: HebrewLetter;
  gate: string;
  count: number;
  positions: number[];
}

export interface GateOptions { circular?: boolean; directed?: boolean }

export function analyzeGates(letters: readonly HebrewLetter[], options: GateOptions = {}): GateFrequency[] {
  if (letters.length < 2) return [];
  const directed = options.directed ?? true;
  const limit = options.circular ? letters.length : letters.length - 1;
  const frequencies = new Map<string, GateFrequency>();
  for (let index = 0; index < limit; index++) {
    let first = letters[index];
    let second = letters[(index + 1) % letters.length];
    if (!directed && first > second) [first, second] = [second, first];
    const key = `${first}${second}`;
    const existing = frequencies.get(key);
    if (existing) { existing.count++; existing.positions.push(index); }
    else frequencies.set(key, { first, second, gate: `${first}־${second}`, count: 1, positions: [index] });
  }
  return [...frequencies.values()].sort((a, b) => b.count - a.count || a.positions[0] - b.positions[0]);
}
