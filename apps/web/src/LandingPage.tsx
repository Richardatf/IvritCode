import "./LandingPage.css";

export function LandingPage() {
  return (
    <main className="new-landing">
      <section className="new-landing-hero">
        <p className="eyebrow">IvritCode · A Hebrew machine language</p>
        <h1>HEBREW LETTERS. EXECUTABLE INSTRUCTIONS.</h1>
        <p className="new-landing-lede">
          IvritCode is an experimental machine language for a software virtual machine. Hebrew
          letters encode operations, registers hold values, and programs execute step by step with a
          trace you can inspect. Write instructions, run them, and see exactly how the machine
          changes.
        </p>
        <div className="letter-identity" aria-label="Aleph across representations">
          <span lang="he">א</span>
          <b>→</b>
          <span>𐤀</span>
          <b>→</b>
          <code>IVC:ALEPH</code>
        </div>
        <p className="identity-caption">Same letter. Different representation. One identity.</p>
        <button
          className="primary"
          onClick={() => window.dispatchEvent(new CustomEvent("ivritcode:enter"))}
        >
          Try the machine language
        </button>
        <a href="#explore">Explore the letters and their history</a>
      </section>
      <section className="new-landing-section" aria-labelledby="machine-language-title">
        <p className="eyebrow">From source to machine state</p>
        <h2 id="machine-language-title">Letters become operations. Programs produce results.</h2>
        <p>
          In the experimental QEC compiler, Yod with hiriq means integer ADD. Kaf means SUBTRACT and
          Lamed means MULTIPLY in the same mode. This program changes register r1 from 0 to 9:
        </p>
        <pre dir="ltr" aria-label="QEC integer arithmetic example">
          <code>{"יִ $r1, 5\nכִ $r1, 2\nלִ $r1, 3"}</code>
        </pre>
        <p>
          Add 5, subtract 2, then multiply by 3. Open the Observatory and expand the advanced
          compiler panel to run this example, inspect its instructions, and follow the execution
          trace. The original letter-only VM is also available with its own instruction mapping.
        </p>
        <p>
          IvritCode runs on a software machine, with its own instruction set rather than a physical
          CPU&apos;s native instruction set. Arithmetic executes today; broader compiler operations
          and cantillation-based control flow remain experimental or reserved.
        </p>
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
          <p>
            Write executable instructions with Hebrew letters. Run programs and inspect register
            values and execution traces.
          </p>
        </article>
      </section>
      <section className="landing-enter">
        <h2>ONE ALPHABET. MANY LAYERS.</h2>
        <p>
          Read the past. Learn the language. Build the future. Explore the letters across history,
          then use them to write and run programs in the IvritCode machine.
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
