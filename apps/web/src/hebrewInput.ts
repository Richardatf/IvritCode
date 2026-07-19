export interface HebrewEdit {
  readonly value: string;
  readonly caret: number;
  readonly error?: string;
}
const HEBREW_LETTER = /[\u05D0-\u05EA]/u;
const HEBREW_MARK = /[\u0591-\u05BD\u05BF-\u05C2\u05C4-\u05C7]/u;

export function insertHebrewInput(
  value: string,
  start: number,
  end: number,
  text: string,
): HebrewEdit {
  if (!HEBREW_MARK.test(text)) {
    return {
      value: `${value.slice(0, start)}${text}${value.slice(end)}`,
      caret: start + text.length,
    };
  }
  let base = -1;
  for (let index = Math.min(start, value.length) - 1; index >= 0; index--) {
    if (HEBREW_LETTER.test(value[index]!)) {
      base = index;
      break;
    }
    if (!HEBREW_MARK.test(value[index]!)) break;
  }
  if (base < 0)
    return { value, caret: start, error: "Choose a Hebrew letter before adding a mark." };
  let insertion = base + 1;
  while (insertion < value.length && HEBREW_MARK.test(value[insertion]!)) insertion++;
  const next = `${value.slice(0, insertion)}${text}${value.slice(insertion)}`.normalize("NFC");
  return { value: next, caret: Math.min(next.length, insertion + text.length) };
}

export function deletePreviousGrapheme(value: string, start: number, end: number): HebrewEdit {
  if (start !== end) return { value: `${value.slice(0, start)}${value.slice(end)}`, caret: start };
  if (start === 0) return { value, caret: 0 };
  const segmenter = new Intl.Segmenter("he", { granularity: "grapheme" });
  let boundary = 0;
  for (const segment of segmenter.segment(value.slice(0, start))) boundary = segment.index;
  return { value: `${value.slice(0, boundary)}${value.slice(start)}`, caret: boundary };
}
