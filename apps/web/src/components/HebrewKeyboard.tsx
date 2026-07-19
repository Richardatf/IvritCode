import { HEBREW_LETTERS, LETTER_NAMES } from "@ivritcode/core";

const NIQQUD = [
  ["\u05B0", "Sheva"],
  ["\u05B4", "Hiriq"],
  ["\u05B5", "Tsere"],
  ["\u05B6", "Segol"],
  ["\u05B7", "Patah"],
  ["\u05B8", "Qamats"],
  ["\u05B9", "Holam"],
  ["\u05BB", "Qubuts"],
  ["\u05BC", "Dagesh / shuruk"],
] as const;
const CANTILLATION = [
  ["\u05C3", "Sof pasuq"],
  ["\u0591", "Etnachta"],
  ["\u05A3", "Munach"],
  ["\u05A5", "Mercha"],
  ["\u0596", "Tipcha"],
  ["\u059B", "Tevir"],
  ["\u05A1", "Pazer"],
] as const;

interface HebrewKeyboardProps {
  readonly onInsert: (text: string) => void;
  readonly onDelete: () => void;
  readonly onClear: () => void;
  readonly error?: string;
}
const MarkKeys = ({
  marks,
  onInsert,
}: {
  marks: readonly (readonly [string, string])[];
  onInsert: (text: string) => void;
}) => (
  <div className="keyboard-keys marks">
    {marks.map(([mark, name]) => (
      <button
        type="button"
        className="hebrew-key mark-key"
        key={name}
        aria-label={`Add ${name}`}
        title={name}
        onClick={() => onInsert(mark)}
      >
        <span aria-hidden="true">◌{mark}</span>
        <small>{name}</small>
      </button>
    ))}
  </div>
);
export function HebrewKeyboard({ onInsert, onDelete, onClear, error }: HebrewKeyboardProps) {
  return (
    <section className="hebrew-keyboard" aria-label="On-screen Hebrew keyboard">
      <div className="keyboard-heading">
        <div>
          <p className="eyebrow">Hebrew input</p>
          <h3>Letters, niqqud, and cantillation</h3>
        </div>
        <p>Select a letter first, then add any marks that belong to it.</p>
      </div>
      {error && (
        <p className="keyboard-error" role="alert">
          {error}
        </p>
      )}
      <div className="keyboard-group">
        <h4>Letters</h4>
        <div className="keyboard-keys letters" dir="rtl">
          {HEBREW_LETTERS.map((letter, index) => (
            <button
              type="button"
              className="hebrew-key"
              key={letter}
              aria-label={`${LETTER_NAMES[index]} (${letter})`}
              title={LETTER_NAMES[index]}
              onClick={() => onInsert(letter)}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>
      <div className="keyboard-lower">
        <div className="keyboard-group">
          <h4>Niqqud · vowel and mode marks</h4>
          <MarkKeys marks={NIQQUD} onInsert={onInsert} />
        </div>
        <div className="keyboard-group">
          <h4>Cantillation · control marks</h4>
          <MarkKeys marks={CANTILLATION} onInsert={onInsert} />
        </div>
      </div>
      <div className="keyboard-actions">
        <button type="button" onClick={() => onInsert(" ")}>
          Space
        </button>
        <button type="button" onClick={() => onInsert("\n")}>
          New line
        </button>
        <button type="button" onClick={onDelete}>
          Delete grapheme
        </button>
        <button type="button" onClick={onClear}>
          Clear
        </button>
      </div>
    </section>
  );
}
