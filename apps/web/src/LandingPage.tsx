import "./LandingPage.css";

export function LandingPage() {
  return (
    <main className="new-landing">
      <section className="new-landing-hero">
        <p className="eyebrow">IvritCode</p>
        <h1>READ THE PAST. LEARN THE LANGUAGE. BUILD THE FUTURE.</h1>
        <p className="new-landing-lede">
          IvritCode begins with one simple idea: a Hebrew letter is more than the shape used to
          write it. The shape can change across history while the identity of the letter remains.
        </p>
        <div className="letter-identity" aria-label="Aleph across representations">
          <span lang="he">א</span>
          <b>→</b>
          <span>𐤀</span>
          <b>→</b>
          <code>IVC:ALEPH</code>
        </div>
        <p className="identity-caption">Same letter. Different representation. One identity.</p>
        <a className="button primary" href="#explore">
          Explore IvritCode
        </a>
      </section>
      <section className="new-landing-section" id="explore">
        <p className="eyebrow">Follow the alphabet through time</p>
        <h2>The shape changes. The letter remains.</h2>
        <p>
          Explore Hebrew letters across modern and ancient writing traditions. Compare forms, follow
          their development, and keep each historical representation connected to one canonical
          letter identity.
        </p>
      </section>
      <section className="new-landing-section">
        <p className="eyebrow">Vocalization overlay</p>
        <h2>Add niqqud without rewriting history.</h2>
        <p>
          Ancient inscriptions did not use the later Tiberian vowel system. IvritCode can place
          modern niqqud over an ancient form as a clearly labeled educational and analytical layer,
          while preserving the original inscription exactly as it is.
        </p>
      </section>
      <section className="new-landing-section">
        <p className="eyebrow">Structure &amp; cantillation</p>
        <h2>Te&apos;amim become another layer.</h2>
        <p>
          Masoretic cantillation marks organize words into relationships, phrases, and divisions.
          IvritCode preserves that traditional role while exploring those structural relationships
          as computational control.
        </p>
      </section>
      <section className="letter-stack" aria-labelledby="letter-stack-title">
        <p className="eyebrow">The IvritCode Letter Stack</p>
        <h2 id="letter-stack-title">One letter. Coordinated layers.</h2>
        <div className="stack-cards">
          <article>
            <b>TE&apos;AMIM</b>
            <span>Structure &amp; control</span>
          </article>
          <article>
            <b>NIQQUD</b>
            <span>Vocalization &amp; modifiers</span>
          </article>
          <article>
            <b>LETTER</b>
            <span>Identity &amp; operation</span>
          </article>
          <article>
            <b>SCRIPT</b>
            <span>Historical representation</span>
          </article>
          <article>
            <b>PROVENANCE</b>
            <span>Where the form came from</span>
          </article>
        </div>
      </section>
      <section className="new-landing-section">
        <p className="eyebrow">From inscription to computation</p>
        <h2>Keep every layer honest.</h2>
        <div className="mode-row">
          <span>ORIGINAL</span>
          <b>→</b>
          <span>NORMALIZED</span>
          <b>→</b>
          <span>VOCALIZED</span>
          <b>→</b>
          <span>CANTILLATED</span>
          <b>→</b>
          <span>COMPUTATIONAL</span>
        </div>
      </section>
      <section className="three-doors">
        <article>
          <p className="eyebrow">READ</p>
          <h2>Read the past.</h2>
          <p>Explore ancient scripts, inscriptions, and letter forms.</p>
        </article>
        <article>
          <p className="eyebrow">LEARN</p>
          <h2>Learn the language.</h2>
          <p>Explore letters, sounds, vowels, cantillation, and their relationships.</p>
        </article>
        <article>
          <p className="eyebrow">BUILD</p>
          <h2>Build the future.</h2>
          <p>Use the same canonical letters as a symbolic computational language.</p>
        </article>
      </section>
      <section className="landing-enter">
        <h2>ONE ALPHABET. MANY LAYERS.</h2>
        <p>
          For thousands of years, the forms used to write Hebrew have changed. The letters endured.
          IvritCode begins there.
        </p>
        <button
          className="primary"
          onClick={() => window.dispatchEvent(new CustomEvent("ivritcode:enter"))}
        >
          Enter the IvritCode Observatory
        </button>
      </section>
    </main>
  );
}
