import { canonicalLetter, stripHebrewMarks } from "@ivritcode/unicode";
export interface LexiconEntry {
  readonly word?: string;
  readonly root?: string;
  readonly gloss?: string;
  readonly gloss_en?: string;
  readonly [key: string]: unknown;
}
export interface LexiconData {
  readonly entries: Readonly<Record<string, LexiconEntry>>;
}
export interface LexiconMatch {
  readonly text: string;
  readonly normalized: string;
  readonly kind: "exact" | "prefix" | "candidate";
  readonly start: number;
  readonly end: number;
  readonly entries: readonly LexiconEntry[];
}
export class LexiconError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LexiconError";
  }
}
export function normalizeForLexicon(value: string): string {
  return [...stripHebrewMarks(value)]
    .flatMap((character) => {
      const letter = canonicalLetter(character);
      return letter ? [letter] : [];
    })
    .join("");
}
export function analyzeLexicon(
  value: string,
  data: LexiconData | undefined,
  minLength = 2,
  maxLength = 6,
): LexiconMatch[] {
  const display = [...stripHebrewMarks(value)]
    .filter((character) => canonicalLetter(character))
    .join("");
  const normalized = normalizeForLexicon(value),
    entries = Object.entries(data?.entries ?? {}).map(
      ([word, entry]) => [normalizeForLexicon(word), entry] as const,
    ),
    results: LexiconMatch[] = [];
  for (let start = 0; start < normalized.length; start++)
    for (
      let length = minLength;
      length <= maxLength && start + length <= normalized.length;
      length++
    ) {
      const normalizedWindow = normalized.slice(start, start + length),
        text = display.slice(start, start + length),
        exact = entries.filter(([word]) => word === normalizedWindow).map(([, entry]) => entry),
        prefix = entries
          .filter(([word]) => word.startsWith(normalizedWindow) && word !== normalizedWindow)
          .map(([, entry]) => entry),
        kind = exact.length ? "exact" : prefix.length ? "prefix" : "candidate";
      results.push({
        text,
        normalized: normalizedWindow,
        kind,
        start,
        end: start + length,
        entries: exact.length ? exact : prefix,
      });
    }
  return results;
}
export function validateLexicon(value: unknown): LexiconData {
  if (
    !value ||
    typeof value !== "object" ||
    !("entries" in value) ||
    typeof (value as any).entries !== "object"
  )
    throw new LexiconError("Lexicon data must contain an entries object.");
  return value as LexiconData;
}
export async function loadLexicon(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<LexiconData> {
  try {
    const response = await fetcher(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return validateLexicon(await response.json());
  } catch (error) {
    throw new LexiconError(
      `Unable to load lexicon: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
