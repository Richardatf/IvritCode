import { useMemo, useState } from 'react';

type ScriptKey = 'MODERN' | 'PALEO' | 'PROTO' | 'RECOVERED';

type Representation = {
  glyph?: string;
  final_glyph?: string;
  unicode?: string;
  unicode_name?: string;
  glyph_id?: string;
  authoring_tag?: string;
  status: string;
  confidence: string;
};

type Letter = {
  id: string;
  index: number;
  name: string;
  hebrew_name: string;
  gematria: number;
  transliteration: string;
  machine_token: string;
  representations: Record<ScriptKey, Representation>;
};

type Registry = {
  version: string;
  letters: Letter[];
};

const SCRIPT_LABELS: Record<ScriptKey, string> = {
  MODERN: 'Modern',
  PALEO: 'Paleo',
  PROTO: 'Proto',
  RECOVERED: 'Recovered',
};

function displayGlyph(rep: Representation) {
  return rep.glyph ?? rep.authoring_tag ?? rep.glyph_id ?? '—';
}

export default function LetterExplorer({ registry }: { registry: Registry }) {
  const [token, setToken] = useState('ALEPH');
  const [script, setScript] = useState<ScriptKey>('MODERN');

  const letter = useMemo(
    () => registry.letters.find((item) => item.machine_token === token) ?? registry.letters[0],
    [registry, token],
  );

  if (!letter) return null;
  const rep = letter.representations[script];

  return (
    <section className="ivc-letter-explorer" aria-labelledby="letter-explorer-title">
      <header>
        <p className="ivc-kicker">IvritCode Script Registry · {registry.version}</p>
        <h2 id="letter-explorer-title">Letter Explorer</h2>
        <p>One canonical letter identity, rendered through multiple script layers.</p>
      </header>

      <div className="ivc-letter-controls">
        <label>
          Letter
          <select value={token} onChange={(event) => setToken(event.target.value)}>
            {registry.letters.map((item) => (
              <option key={item.id} value={item.machine_token}>
                {item.name} · {item.hebrew_name}
              </option>
            ))}
          </select>
        </label>

        <div className="ivc-script-switcher" role="group" aria-label="Script layer">
          {(Object.keys(SCRIPT_LABELS) as ScriptKey[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={script === key}
              onClick={() => setScript(key)}
            >
              {SCRIPT_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="ivc-letter-stage">
        <div className={`ivc-glyph ivc-glyph-${script.toLowerCase()}`} dir="rtl">
          {displayGlyph(rep)}
        </div>
        <div className="ivc-letter-identity">
          <strong>{letter.name}</strong>
          <span>{letter.id}</span>
          <span>Machine token: {letter.machine_token}</span>
        </div>
      </div>

      <dl className="ivc-letter-metadata">
        <div><dt>Hebrew</dt><dd dir="rtl">{letter.hebrew_name}</dd></div>
        <div><dt>Transliteration</dt><dd>{letter.transliteration}</dd></div>
        <div><dt>Gematria</dt><dd>{letter.gematria}</dd></div>
        <div><dt>Layer</dt><dd>{SCRIPT_LABELS[script]}</dd></div>
        <div><dt>Status</dt><dd>{rep.status}</dd></div>
        <div><dt>Confidence</dt><dd>{rep.confidence}</dd></div>
        <div><dt>Unicode</dt><dd>{rep.unicode ?? 'Custom glyph'}</dd></div>
        <div><dt>Unicode name</dt><dd>{rep.unicode_name ?? '—'}</dd></div>
      </dl>

      {(script === 'PROTO' || script === 'RECOVERED') && (
        <p className="ivc-reconstruction-note">
          This layer is explicitly marked {rep.status.toLowerCase()}; IvritCode does not present it as an attested Unicode letterform.
        </p>
      )}
    </section>
  );
}
