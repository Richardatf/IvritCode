import { canonicalLetter } from "./alphabet.js";
import { LexiconLoadingError } from "./errors.js";

export interface LexiconEntry { root?: string; gloss?: string; meaning?: string; [key: string]: unknown }
export interface LexiconData { entries?: Record<string, LexiconEntry> }
export interface CandidateWindow { text: string; start: number; length: number; status: "confirmed" | "unknown"; entry?: LexiconEntry }

export function normalizeHebrew(value: string): string {
  return [...value.normalize("NFD")].map((ch) => canonicalLetter(ch) ?? ch).filter((ch) => /[א-ת]/u.test(ch)).join("").normalize("NFC");
}

export function matchLexiconWindows(stream: string, lexicon: LexiconData | undefined, minLength = 3, maxLength = 5): CandidateWindow[] {
  const normalized = normalizeHebrew(stream);
  const entries = lexicon?.entries ?? {};
  const normalizedEntries = new Map(Object.entries(entries).map(([word, entry]) => [normalizeHebrew(word), entry]));
  const results: CandidateWindow[] = [];
  for (let length = minLength; length <= maxLength; length++) {
    for (let start = 0; start + length <= normalized.length; start++) {
      const text = normalized.slice(start, start + length);
      const entry = normalizedEntries.get(text);
      results.push({ text, start, length, status: entry ? "confirmed" : "unknown", entry });
    }
  }
  return results;
}

export async function loadLexicon(url: string, fetcher: typeof fetch = fetch): Promise<LexiconData> {
  try {
    const response = await fetcher(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data || typeof data !== "object") throw new Error("Invalid JSON root");
    return data as LexiconData;
  } catch (error) {
    throw new LexiconLoadingError(`Unable to load lexicon: ${error instanceof Error ? error.message : String(error)}`);
  }
}
