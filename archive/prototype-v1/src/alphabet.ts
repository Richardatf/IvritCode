export const HEBREW_LETTERS = [
  "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "כ",
  "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת",
] as const;

export type HebrewLetter = (typeof HEBREW_LETTERS)[number];

export const FINAL_FORMS: Readonly<Record<string, HebrewLetter>> = {
  ך: "כ",
  ם: "מ",
  ן: "נ",
  ף: "פ",
  ץ: "צ",
};

export const LETTER_NAMES = [
  "Aleph", "Bet", "Gimel", "Dalet", "He", "Vav", "Zayin", "Chet",
  "Tet", "Yod", "Kaf", "Lamed", "Mem", "Nun", "Samekh", "Ayin",
  "Pe", "Tsadi", "Qof", "Resh", "Shin", "Tav",
] as const;

export const LETTER_INDEX = new Map<string, number>(
  HEBREW_LETTERS.map((letter, index) => [letter, index]),
);

export function canonicalLetter(value: string): HebrewLetter | undefined {
  if (LETTER_INDEX.has(value)) return value as HebrewLetter;
  return FINAL_FORMS[value];
}
