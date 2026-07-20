import { useEffect, useMemo, useRef, useState } from "react";
import {
  LETTER_ARCHETYPES,
  analyzeConstellation,
  analyzeGates,
  type PatternShape,
} from "@ivritcode/analysis";
import {
  ALEPH_OLAM_INDEX,
  HEBREW_LETTERS,
  LETTER_NAMES,
  executeProgram,
  makeAlphabetState,
  parseProgram,
  stateToLetterStream,
  toBalanced,
  type ExecutionResult,
  type IvritState,
  type TraceMode,
} from "@ivritcode/core";
import { analyzeLexicon, loadLexicon, type LexiconData } from "@ivritcode/lexicon";
import { compileIvrit } from "@qec/ivrit-compiler";
import { runQEC, type QECRun } from "@qec/core";
import { PATH_CHANNELS } from "@qec/path-router";
import { GATE_PAIRS, GATE_REGISTRY_CHECKSUM } from "@qec/gates-231";
import {
  IVRIT_EXCHANGE_VERSION,
  IVRIT_ENGINE_VERSION,
  IVRIT_LANGUAGE_SPEC,
  QEC_MANIFESTATION_VERSION,
  QEC_PATH_MAP_VERSION,
  QEC_SCHEMA_VERSION,
  contentHash,
  createRunPassport,
  serializeRunPassport,
  type IvritCodeExchange,
  type QECRunPassport,
} from "@qec/spec";
import { HebrewKeyboard } from "./components/HebrewKeyboard.js";
import { deletePreviousGrapheme, insertHebrewInput } from "./hebrewInput.js";
import { downloadProgram, initialState, type InitialMode } from "./logic.js";
const SAMPLE = "# IvritCode · בראשית\nב ר א ש י ת";
const QEC_SAMPLE = "יִ $r1, 5";
const DEMO_SAMPLE = "בראשית";
const HEBREW_KEYBOARD_LETTERS = Array.from(HEBREW_LETTERS);
const HEBREW_NIQQUD = [
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
const HEBREW_CANTILLATION = [
  ["\u05C3", "Sof pasuq"],
  ["\u0591", "Etnachta"],
  ["\u05A3", "Munach"],
  ["\u05A5", "Mercha"],
  ["\u0596", "Tipcha"],
  ["\u059B", "Tevir"],
  ["\u05A1", "Pazer"],
] as const;
const PUBLIC_OPERATORS = [
  ["א", "Hold", "Preserves the present pattern."],
  ["ב", "Add", "Adds paired values together."],
  ["ג", "Multiply", "Multiplies paired values."],
  ["ד", "Difference", "Measures opposition between pairs."],
  ["ה", "Reveal", "Shows whether values rise, fall, or remain still."],
  ["ו", "And", "Joins each paired position with a bitwise AND operation."],
  ["ז", "Raise", "Increases the visible values."],
  ["ח", "Lower", "Decreases the visible values."],
  ["ט", "Transform", "Squares the values."],
  ["י", "Emanate", "Unfolds Aleph Olam across all twenty-two positions as a phased spectrum."],
  ["כ", "Gather", "Combines neighboring values."],
  ["ל", "Balance", "Measures and recenters the pattern."],
  ["מ", "Smooth", "Blends nearby values."],
  ["נ", "Reverse", "Turns positive motion into negative motion."],
  ["ס", "Rotate", "Rotates the entire pattern."],
  ["ע", "Examine", "Searches for the strongest match."],
  ["פ", "Expose", "Brings the Aleph value into Aleph Olam."],
  ["צ", "Compare", "Compares the two halves."],
  ["ק", "Mirror", "Reverses and shifts the pattern."],
  ["ר", "Begin again", "Creates a new pattern from Aleph Olam."],
  ["ש", "Deep change", "Performs a stronger nonlinear transformation."],
  ["ת", "Seal", "Preserves the completed state as a checkpoint."],
] as const;
const publicOperator = (letter: string) => PUBLIC_OPERATORS.find(([item]) => item === letter);
const PATTERN_NAMES: Record<PatternShape, string> = {
  FULL_SPECTRUM: "The Full Spectrum",
  CHORUS: "The Chorus",
  MIRROR: "The Mirror",
  RETURN: "The Return",
  SPIRAL: "The Spiral",
  FLAME: "The Flame",
  STILL_POINT: "The Still Point",
  OPEN_FIELD: "The Open Field",
};
type View = "ring" | "grid" | "table";
type Theme = "auto" | "dark" | "light" | "contrast";
interface ChavrutaResponse {
  program: string;
  explanation: string;
  expectedBehavior: string;
  gatesToWatch: string[];
  warnings: string[];
  valid: boolean;
  diagnostics: string[];
}
const valueAt = (result: ExecutionResult | undefined, index: number): IvritState | undefined =>
  index < 0 ? result?.trace[0]?.before : (result?.trace[index]?.after ?? result?.finalState);
export function App() {
  const [source, setSource] = useState(SAMPLE),
    [strict, setStrict] = useState(false),
    [traceMode, setTraceMode] = useState<TraceMode>("full"),
    [mode, setMode] = useState<InitialMode>("zero"),
    [seed, setSeed] = useState("22"),
    [result, setResult] = useState<ExecutionResult>(),
    [selectedStep, setSelectedStep] = useState(-1),
    [playing, setPlaying] = useState(false),
    [error, setError] = useState(""),
    [view, setView] = useState<View>("ring"),
    [theme, setTheme] = useState<Theme>("auto"),
    [directed, setDirected] = useState(true),
    [circular, setCircular] = useState(false),
    [selectedGate, setSelectedGate] = useState(""),
    [lexicon, setLexicon] = useState<LexiconData>(),
    [prompt, setPrompt] = useState(""),
    [chavruta, setChavruta] = useState<ChavrutaResponse>(),
    [assistantStatus, setAssistantStatus] = useState("Ready when you are."),
    [qecSource, setQecSource] = useState(QEC_SAMPLE),
    [qecInput, setQecInput] = useState("0"),
    [qecRun, setQecRun] = useState<QECRun>(),
    [qecError, setQecError] = useState(""),
    [demoSource, setDemoSource] = useState(DEMO_SAMPLE),
    [demoResult, setDemoResult] = useState<ExecutionResult>(),
    [showDemoSteps, setShowDemoSteps] = useState(false),
    [demoInputError, setDemoInputError] = useState(""),
    [demoJourneyStep, setDemoJourneyStep] = useState(0),
    [demoJourneyPlaying, setDemoJourneyPlaying] = useState(false),
    [showConstellationReading, setShowConstellationReading] = useState(false),
    fileRef = useRef<HTMLInputElement>(null),
    demoEditorRef = useRef<HTMLTextAreaElement>(null),
    constellationReadingRef = useRef<HTMLElement>(null);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ivritcode-theme", theme);
  }, [theme]);
  useEffect(() => {
    const sharedSource = new URLSearchParams(window.location.search).get("source");
    if (sharedSource && sharedSource.length <= 2048) setDemoSource(sharedSource);
  }, []);
  useEffect(() => {
    loadLexicon("/data/hebrew-lexicon.json")
      .then(setLexicon)
      .catch(() => setLexicon(undefined));
  }, []);
  useEffect(() => {
    if (!playing || !result) return;
    const timer = window.setInterval(
      () =>
        setSelectedStep((current) => {
          if (current >= result.trace.length - 1) {
            setPlaying(false);
            return current;
          }
          return current + 1;
        }),
      420,
    );
    return () => window.clearInterval(timer);
  }, [playing, result]);
  useEffect(() => {
    if (!demoJourneyPlaying || !demoResult) return;
    const timer = window.setInterval(() => {
      setDemoJourneyStep((current) => {
        if (current >= demoResult.trace.length) {
          setDemoJourneyPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 700);
    return () => window.clearInterval(timer);
  }, [demoJourneyPlaying, demoResult]);
  const run = () => {
    try {
      const output = executeProgram(parseProgram(source, { filename: "observatory.ivc" }), {
        initialState: initialState(mode, seed),
        strictModifiers: strict,
        trace: traceMode,
      });
      setResult(output);
      setSelectedStep(traceMode === "none" ? output.trace.length - 1 : -1);
      setPlaying(traceMode !== "none");
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason));
    }
  };
  const step = () => {
    try {
      const full = executeProgram(source, {
        initialState: initialState(mode, seed),
        strictModifiers: strict,
        trace: "full",
      });
      setResult(full);
      setSelectedStep((current) => Math.min(current + 1, full.trace.length - 1));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };
  const state = valueAt(result, selectedStep) ?? initialState(mode, seed),
    program = useMemo(() => {
      try {
        return parseProgram(source);
      } catch {
        return undefined;
      }
    }, [source]),
    gates = useMemo(
      () => analyzeGates(program ?? [], { directed, circular }),
      [program, directed, circular],
    ),
    stream = stateToLetterStream(state),
    matches = useMemo(() => analyzeLexicon(stream, lexicon), [stream, lexicon]);
  const qecCompilation = useMemo(() => compileIvrit(qecSource), [qecSource]);
  const demoDisplayResult = useMemo(() => {
    if (!demoResult) return undefined;
    const visibleState =
      demoJourneyStep === 0
        ? makeAlphabetState(demoSource)
        : (demoResult.trace[Math.min(demoJourneyStep - 1, demoResult.trace.length - 1)]?.after ??
          demoResult.finalState);
    return { ...demoResult, finalState: visibleState };
  }, [demoResult, demoJourneyStep, demoSource]);
  const constellation = useMemo(
    () => (demoDisplayResult ? analyzeConstellation(demoDisplayResult) : undefined),
    [demoDisplayResult],
  );
  const quantumEtzChaimUrl = useMemo(() => {
    if (!demoResult || !constellation) return "https://quantumetzchaim.com/#ivritcode";
    const exchange: IvritCodeExchange = {
      schemaVersion: IVRIT_EXCHANGE_VERSION,
      engineVersion: IVRIT_ENGINE_VERSION,
      pathMapVersion: QEC_PATH_MAP_VERSION,
      manifestationVersion: QEC_MANIFESTATION_VERSION,
      seed: demoResult.context.deterministicSeed,
      traceHash: contentHash(demoResult.trace),
      source: demoSource,
      sourceHash: contentHash({ source: demoSource }),
      initialState: makeAlphabetState(demoSource),
      finalState: demoResult.finalState,
      hiddenKey: constellation.hiddenKey,
      patternShape: constellation.patternShape,
      returningLetters: constellation.returningLetters,
      gates: constellation.strongestGates,
    };
    return `https://quantumetzchaim.com/?exchange=${encodeURIComponent(JSON.stringify(exchange))}#ivritcode`;
  }, [demoResult, constellation, demoSource]);
  const runPassport = useMemo<QECRunPassport | undefined>(() => {
    if (
      !demoResult ||
      !constellation ||
      demoResult.trace.some((event) => !event.before || !event.after)
    )
      return undefined;
    return createRunPassport({
      source: demoSource,
      seed: demoResult.context.deterministicSeed,
      initialState: makeAlphabetState(demoSource),
      finalState: demoResult.finalState,
      hiddenKey: constellation.hiddenKey,
      patternShape: constellation.patternShape,
      returningLetters: constellation.returningLetters,
      gates: constellation.strongestGates,
      trace: demoResult.trace.map((event) => ({
        letter: event.instruction.letter,
        before: event.before!,
        after: event.after!,
        changedRegisters: event.changedRegisters.map((change) => change.index),
      })),
    });
  }, [demoResult, constellation, demoSource]);
  const passportUrl = runPassport
    ? `https://quantumetzchaim.com/?passport=${encodeURIComponent(JSON.stringify(runPassport))}#ivritcode`
    : quantumEtzChaimUrl;
  const downloadPassport = () => {
    if (!runPassport) return;
    const url = URL.createObjectURL(
      new Blob([serializeRunPassport(runPassport)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `ivritcode-${runPassport.runId}.passport.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const runDemo = () => {
    const seededState = makeAlphabetState(demoSource);
    setDemoResult(
      executeProgram(demoSource, {
        initialState: seededState,
        deterministicSeed: seededState[ALEPH_OLAM_INDEX]!,
        trace: "full",
      }),
    );
    setShowDemoSteps(false);
    setShowConstellationReading(false);
    setDemoJourneyStep(0);
    setDemoJourneyPlaying(false);
  };
  const insertDemoText = (text: string) => {
    const editor = demoEditorRef.current;
    if (!editor) return;
    const edit = insertHebrewInput(demoSource, editor.selectionStart, editor.selectionEnd, text);
    setDemoSource(edit.value);
    setDemoInputError(edit.error ?? "");
    setDemoResult(undefined);
    window.requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(edit.caret, edit.caret);
    });
  };
  const deleteDemoText = () => {
    const editor = demoEditorRef.current;
    if (!editor) return;
    const edit = deletePreviousGrapheme(demoSource, editor.selectionStart, editor.selectionEnd);
    setDemoSource(edit.value);
    setDemoInputError("");
    setDemoResult(undefined);
    window.requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(edit.caret, edit.caret);
    });
  };
  const runQecExample = () => {
    try {
      setQecRun(runQEC(qecSource, { r1: Number(qecInput) || 0 }));
      setQecError("");
    } catch (reason) {
      setQecRun(undefined);
      setQecError(reason instanceof Error ? reason.message : String(reason));
    }
  };
  const reset = () => {
    setPlaying(false);
    setResult(undefined);
    setSelectedStep(-1);
    setError("");
  };
  const download = () => {
    const url = URL.createObjectURL(downloadProgram(source)),
      link = document.createElement("a");
    link.href = url;
    link.download = "ivritcode-program.ivc";
    link.click();
    URL.revokeObjectURL(url);
  };
  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSource(await file.text());
  };
  const ask = async () => {
    if (!prompt.trim()) return;
    setAssistantStatus("Studying the request…");
    try {
      const response = await fetch("/.netlify/functions/chavruta", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt, source }),
        }),
        data = (await response.json()) as ChavrutaResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Chavruta is unavailable.");
      setChavruta(data);
      setAssistantStatus(data.valid ? "Valid program received." : "Response includes diagnostics.");
    } catch (reason) {
      setAssistantStatus(
        reason instanceof Error
          ? reason.message
          : "Chavruta is unavailable. The Observatory remains fully functional.",
      );
    }
  };
  return (
    <div className="app-shell">
      <a className="skip" href="#source">
        Skip to source
      </a>
      <header className="masthead">
        <img
          className="masthead-art"
          src="/art/hero-observatory.jpg"
          alt="Abstract IvritCode letter observatory with a luminous Aleph and circular Hebrew register forms"
          decoding="async"
          fetchPriority="high"
        />
        <div>
          <p className="eyebrow">Free · experimental · open source</p>
          <h1>
            <span lang="he">עבריתקוד</span> IvritCode
          </h1>
          <p className="lede">
            Programming with the Hebrew alphabet. Type a Hebrew word or letter sequence, press Run,
            and watch the letters transform a digital pattern.
          </p>
          <p className="welcome-note">
            No coding experience required. No Hebrew experience required.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#try">
              Try IvritCode
            </a>
            <a className="button" href="#about">
              How it works
            </a>
          </div>
        </div>
        <div className="brand-mark" aria-hidden="true">
          <span>א</span>
          <i />
          <b>22</b>
        </div>
        <label className="theme">
          Theme
          <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
            <option value="auto">System</option>
            <option value="dark">Obsidian</option>
            <option value="light">Ivory</option>
            <option value="contrast">High contrast</option>
          </select>
        </label>
      </header>
      <nav className="site-nav" aria-label="IvritCode sections">
        <a href="#about">Home</a>
        <a href="#try">Try It</a>
        <a href="#operators">The Letters</a>
        <a href="#gates">231 Gates</a>
        <a href="#chavruta">Chavruta</a>
        <a href="#about-project">About</a>
        <a href="https://quantumetzchaim.com/">Quantum Etz Chaim</a>
      </nav>
      <main>
        <section className="panel landing-video" aria-labelledby="landing-video-title">
          <div className="landing-video-copy">
            <p className="eyebrow">Meet IvritCode</p>
            <h2 id="landing-video-title">Elijah Blaze Has A Message</h2>
            <p>
              Watch this short introduction, then try a Hebrew letter sequence in the interactive
              playground below.
            </p>
          </div>
          <video
            controls
            playsInline
            preload="metadata"
            poster="/art/hero-observatory.jpg"
            aria-label="Introduction to IvritCode"
          >
            <source src="/video/ivritcode-introduction.mp4" type="video/mp4" />
            Your browser does not support embedded video. You can still use the IvritCode playground
            below.
          </video>
        </section>
        <section className="panel first-program" id="try">
          <div className="first-program-copy">
            <p className="eyebrow">Try your first program</p>
            <h2>Enter Hebrew letters</h2>
            <p>
              Start with a word, phrase, or any sequence. IvritCode reads each letter from beginning
              to end.
            </p>
            <ol className="resonance-story" aria-label="The three phases of IvritCode Resonance">
              <li>
                <b>1. The Alphabet Awakens</b>
                <span>The machine begins with the Hebrew alphabet in its natural order.</span>
              </li>
              <li>
                <b>2. The Word Walks</b>
                <span>Each letter in your word acts upon the entire alphabet.</span>
              </li>
              <li>
                <b>3. The Constellation Forms</b>
                <span>
                  Final values become Hebrew letters—a new constellation of relationships.
                </span>
              </li>
            </ol>
            <textarea
              ref={demoEditorRef}
              dir="rtl"
              lang="he"
              aria-label="First IvritCode program"
              value={demoSource}
              onChange={(event) => setDemoSource(event.target.value)}
              spellCheck={false}
            />
            <div className="toolbar">
              <button className="primary" onClick={runDemo}>
                Run the letters
              </button>
              <button
                onClick={() => {
                  setDemoSource("שלום");
                  setDemoResult(undefined);
                }}
              >
                Try another word
              </button>
            </div>
          </div>
          <div className="friendly-result" aria-live="polite">
            <p className="eyebrow">What happened?</p>
            {!demoResult || !constellation ? (
              <>
                <h3>Your pattern is ready to explore.</h3>
                <p>
                  Press <b>Run the letters</b> to see a plain-language explanation.
                </p>
              </>
            ) : (
              <>
                <h3>The constellation has formed.</h3>
                <p className="pattern-callout">{constellation.summary}</p>
                <div className="reading-facts">
                  <article>
                    <small>Hidden Key</small>
                    <strong lang="he">{constellation.hiddenKey}</strong>
                    <span>
                      {LETTER_ARCHETYPES[HEBREW_LETTERS.indexOf(constellation.hiddenKey)]?.title}
                    </span>
                  </article>
                  <article>
                    <small>Pattern Shape</small>
                    <strong>{PATTERN_NAMES[constellation.patternShape]}</strong>
                    <span>{constellation.distinctValueCount} distinct letters</span>
                  </article>
                  <article>
                    <small>Strongest Chorus</small>
                    <strong lang="he">{constellation.dominantLetters.join(" · ") || "—"}</strong>
                    <span>Most repeated destinations</span>
                  </article>
                  <article>
                    <small>Returning Letters</small>
                    <strong lang="he">{constellation.returningLetters.join(" · ") || "—"}</strong>
                    <span>{constellation.returningLetters.length} self-returns</span>
                  </article>
                  <article>
                    <small>Gates Opened</small>
                    <strong lang="he">{constellation.strongestGates.join(" · ") || "—"}</strong>
                    <span>From the program&apos;s letter pairs</span>
                  </article>
                </div>
                <section className="demo-register-output" aria-labelledby="demo-register-title">
                  <div className="register-output-heading">
                    <div>
                      <p className="eyebrow">IvritCode Resonance</p>
                      <h4 id="demo-register-title">The Letter Constellation</h4>
                    </div>
                    <output aria-label="Aleph Olam output value">
                      <span lang="he">א∞</span>
                      <small>The Hidden Key</small>
                      <strong lang="he">{constellation.hiddenKey}</strong>
                    </output>
                  </div>
                  <div
                    className="constellation-orbit"
                    aria-label="Circular 22-letter constellation"
                  >
                    <svg viewBox="0 0 600 600" aria-hidden="true">
                      <circle cx="300" cy="300" r="236" />
                      {constellation.registers.map((register, index) => {
                        const targetIndex = HEBREW_LETTERS.indexOf(register.target),
                          sourceAngle = (index / 22) * Math.PI * 2 - Math.PI / 2,
                          targetAngle = (targetIndex / 22) * Math.PI * 2 - Math.PI / 2,
                          radius = 236;
                        return (
                          <line
                            key={register.source}
                            className={register.selfReturn ? "return-line" : "relation-line"}
                            x1={300 + Math.cos(sourceAngle) * radius}
                            y1={300 + Math.sin(sourceAngle) * radius}
                            x2={300 + Math.cos(targetAngle) * radius}
                            y2={300 + Math.sin(targetAngle) * radius}
                          />
                        );
                      })}
                    </svg>
                    <div className="constellation-key">
                      <span lang="he">{constellation.hiddenKey}</span>
                      <small>Hidden Key</small>
                    </div>
                    {constellation.registers.map((register, index) => (
                      <div
                        className={`constellation-node ${register.selfReturn ? "self-return" : ""}`}
                        style={{ "--node-index": index } as React.CSSProperties}
                        key={register.source}
                        title={register.phrase}
                      >
                        <span lang="he">{register.source}</span>
                        <b lang="he">{register.target}</b>
                      </div>
                    ))}
                  </div>
                  <div className="demo-register-grid" dir="rtl">
                    {constellation.registers.map((register, index) => (
                      <output
                        key={register.source}
                        className={`demo-register ${register.selfReturn ? "self-return" : "changed"}`}
                        aria-label={`${LETTER_NAMES[index]} becomes ${register.target}. ${register.phrase}`}
                      >
                        <span lang="he">
                          {register.source} ← {register.target}
                        </span>
                        <strong>{register.selfReturn ? "Returns" : "Changes"}</strong>
                        <small>{register.phrase}</small>
                      </output>
                    ))}
                  </div>
                </section>
                <p className="honesty-note">
                  This is a symbolic reading produced from IvritCode&apos;s mathematical
                  relationships. It is an invitation to reflection, not prophecy or religious
                  authority.
                </p>
                <div className="toolbar resonance-actions">
                  <button
                    className="primary"
                    aria-expanded={showConstellationReading}
                    aria-controls="constellation-reading"
                    onClick={() => {
                      const opening = !showConstellationReading;
                      setShowConstellationReading(opening);
                      if (opening)
                        window.requestAnimationFrame(() =>
                          constellationReadingRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "nearest",
                          }),
                        );
                    }}
                  >
                    {showConstellationReading ? "Close the Reading" : "Read the Constellation"}
                  </button>
                  <a className="button primary" href={passportUrl}>
                    Inspect Run Passport
                  </a>
                  <button onClick={downloadPassport} disabled={!runPassport}>
                    Download Passport
                  </button>
                  <button
                    onClick={() => {
                      setShowDemoSteps(true);
                      setDemoJourneyStep(0);
                      setDemoJourneyPlaying(true);
                    }}
                  >
                    Watch the Journey
                  </button>
                  <button
                    onClick={() => setDemoJourneyPlaying((current) => !current)}
                    disabled={!showDemoSteps}
                  >
                    {demoJourneyPlaying ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() =>
                      setDemoJourneyStep((current) =>
                        Math.min(current + 1, demoResult.trace.length),
                      )
                    }
                    disabled={!showDemoSteps}
                  >
                    Step
                  </button>
                  {showDemoSteps && (
                    <output className="journey-progress" aria-live="polite">
                      Step {demoJourneyStep} of {demoResult.trace.length}
                    </output>
                  )}
                  <details className="resonance-math">
                    <summary>See the Mathematics</summary>
                    <pre>
                      {JSON.stringify(
                        {
                          initialState: makeAlphabetState(demoSource),
                          finalState: demoResult.finalState,
                          hiddenKeyValue: demoResult.finalState[ALEPH_OLAM_INDEX],
                          symmetryScore: constellation.symmetryScore,
                          rotationScore: constellation.rotationScore,
                          dispersionScore: constellation.dispersionScore,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                  <button
                    onClick={() => {
                      setDemoSource("");
                      setDemoResult(undefined);
                      demoEditorRef.current?.focus();
                    }}
                  >
                    Try Another Word
                  </button>
                </div>
                {showConstellationReading && (
                  <section
                    className="constellation-reading"
                    id="constellation-reading"
                    ref={constellationReadingRef}
                    aria-labelledby="constellation-reading-title"
                  >
                    <div>
                      <p className="eyebrow">Reflective reading / deterministic evidence</p>
                      <h4 id="constellation-reading-title">
                        {PATTERN_NAMES[constellation.patternShape]}
                      </h4>
                      <p className="reading-lede">{constellation.summary}</p>
                    </div>
                    <div className="reading-narrative">
                      <article>
                        <small>Orientation</small>
                        <strong>
                          <span lang="he">{constellation.hiddenKey}</span> ·{" "}
                          {
                            LETTER_ARCHETYPES[HEBREW_LETTERS.indexOf(constellation.hiddenKey)]
                              ?.title
                          }
                        </strong>
                        <p>
                          The hidden register supplies the stable orientation from which this result
                          is read.
                        </p>
                      </article>
                      <article>
                        <small>Movement</small>
                        <strong>{constellation.changedRegisters} of 22 letters changed</strong>
                        <p>
                          {constellation.returningLetters.length
                            ? `${constellation.returningLetters.length} letters returned to their own positions: ${constellation.returningLetters.join(" · ")}.`
                            : "No letter returned exactly to its starting position."}
                        </p>
                      </article>
                      <article>
                        <small>Gathering</small>
                        <strong lang="he">
                          {constellation.dominantLetters.join(" · ") || "Open field"}
                        </strong>
                        <p>
                          {constellation.dominantLetters.length
                            ? "These destinations receive the strongest chorus in the completed state."
                            : `The result remains distributed across ${constellation.distinctValueCount} distinct letters.`}
                        </p>
                      </article>
                      <article>
                        <small>Relations</small>
                        <strong lang="he">
                          {constellation.strongestGates.join(" · ") || "No repeated gate"}
                        </strong>
                        <p>
                          These are the strongest adjacent letter-pairs in the executed program.
                        </p>
                      </article>
                    </div>
                    <dl className="reading-scores">
                      <div>
                        <dt>Symmetry</dt>
                        <dd>{Math.round(constellation.symmetryScore * 100)}%</dd>
                      </div>
                      <div>
                        <dt>Rotation</dt>
                        <dd>{Math.round(constellation.rotationScore * 100)}%</dd>
                      </div>
                      <div>
                        <dt>Dispersion</dt>
                        <dd>{Math.round(constellation.dispersionScore * 100)}%</dd>
                      </div>
                    </dl>
                    <p className="reading-caveat">{constellation.warnings[0]}</p>
                  </section>
                )}
              </>
            )}
          </div>
          <HebrewKeyboard
            onInsert={insertDemoText}
            onDelete={deleteDemoText}
            onClear={() => {
              setDemoSource("");
              setDemoResult(undefined);
              setDemoInputError("");
              demoEditorRef.current?.focus();
            }}
            {...(demoInputError ? { error: demoInputError } : {})}
          />
          {/* Legacy inline keyboard retained temporarily for compatibility during component extraction. */}
          {/* eslint-disable-next-line no-constant-binary-expression */}
          {false && (
            <section className="hebrew-keyboard" aria-label="On-screen Hebrew keyboard">
              <div className="keyboard-heading">
                <div>
                  <p className="eyebrow">Hebrew input</p>
                  <h3>Letters, niqqud, and cantillation</h3>
                </div>
                <p>Select a letter first, then add any marks that belong to it.</p>
              </div>
              <div className="keyboard-group">
                <h4>Letters</h4>
                <div className="keyboard-keys letters" dir="rtl">
                  {HEBREW_KEYBOARD_LETTERS.map((letter, index) => (
                    <button
                      type="button"
                      className="hebrew-key"
                      key={letter}
                      aria-label={`${LETTER_NAMES[index]} (${letter})`}
                      title={LETTER_NAMES[index]}
                      onClick={() => insertDemoText(letter)}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>
              <div className="keyboard-lower">
                <div className="keyboard-group">
                  <h4>Niqqud · vowel and mode marks</h4>
                  <div className="keyboard-keys marks">
                    {HEBREW_NIQQUD.map(([mark, name]) => (
                      <button
                        type="button"
                        className="hebrew-key mark-key"
                        key={name}
                        aria-label={`Add ${name}`}
                        title={name}
                        onClick={() => insertDemoText(mark)}
                      >
                        <span aria-hidden="true">◌{mark}</span>
                        <small>{name}</small>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="keyboard-group">
                  <h4>Cantillation · control marks</h4>
                  <div className="keyboard-keys marks">
                    {HEBREW_CANTILLATION.map(([mark, name]) => (
                      <button
                        type="button"
                        className="hebrew-key mark-key"
                        key={name}
                        aria-label={`Add ${name}`}
                        title={name}
                        onClick={() => insertDemoText(mark)}
                      >
                        <span aria-hidden="true">◌{mark}</span>
                        <small>{name}</small>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="keyboard-actions">
                <button type="button" onClick={() => insertDemoText(" ")}>
                  Space
                </button>
                <button type="button" onClick={() => insertDemoText("\n")}>
                  New line
                </button>
                <button type="button" onClick={deleteDemoText}>
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDemoSource("");
                    setDemoResult(undefined);
                    demoEditorRef.current?.focus();
                  }}
                >
                  Clear
                </button>
              </div>
            </section>
          )}
          {demoResult && showDemoSteps && (
            <div className="simple-steps">
              {demoResult.trace.map((step) => {
                const info = publicOperator(step.instruction.letter);
                return (
                  <article
                    key={step.step}
                    className={demoJourneyStep === step.step + 1 ? "current" : ""}
                  >
                    <span lang="he">{step.instruction.letter}</span>
                    <div>
                      <h3>{info?.[1] ?? LETTER_NAMES[step.instruction.opcodeIndex]}</h3>
                      <p>{info?.[2] ?? "The pattern changed."}</p>
                      <small>
                        {step.changedRegisters.length
                          ? `${step.changedRegisters.length} positions changed.`
                          : "The current pattern was preserved."}
                      </small>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <section className="panel guide" id="about">
          <div className="guide-intro">
            <p className="eyebrow">Start here</p>
            <h2>What is IvritCode?</h2>
            <p className="guide-lede">
              IvritCode is a free experimental programming language in which the twenty-two Hebrew
              letters become computer instructions. Put several letters together, and they become a
              program—a path through the machine.
            </p>
            <p>
              This is a deterministic computing system, not a translation tool, religious authority,
              or traditional gematria. The same source and initial state always produce the same
              result.
            </p>
          </div>
          <ol className="quick-start" aria-label="How to use IvritCode">
            <li>
              <b>Write</b>
              <span>Enter a Hebrew word, phrase, or letter sequence.</span>
            </li>
            <li>
              <b>Run</b>
              <span>IvritCode reads the letters from beginning to end.</span>
            </li>
            <li>
              <b>Observe</b>
              <span>See what each letter did and how the pattern changed.</span>
            </li>
          </ol>
          <div className="reference-block" id="operators">
            <div className="reference-heading">
              <div>
                <p className="eyebrow">Instruction menu</p>
                <h2>22 operators</h2>
              </div>
              <p>Select a letter to add it to the beginner program.</p>
            </div>
            <div className="operator-menu">
              {PUBLIC_OPERATORS.map(([letter, name, description]) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => setDemoSource((current) => `${current}${letter}`)}
                  title={`Add ${name} to the beginner program`}
                >
                  <span lang="he">{letter}</span>
                  <b>{name}</b>
                  <small>{description}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="reference-block" id="modifiers">
            <div className="reference-heading">
              <div>
                <p className="eyebrow">Mark menu</p>
                <h2>Modifiers</h2>
              </div>
              <p>Marks attach to the preceding letter; they are never standalone operators.</p>
            </div>
            <div className="modifier-layout">
              <div className="modifier-menu">
                {IVRIT_LANGUAGE_SPEC.modifiers
                  .filter((item) => item.mark)
                  .map((modifier) => (
                    <div key={modifier.name}>
                      <span lang="he">
                        {modifier.name === "shuruk" ? modifier.mark : `◌${modifier.mark}`}
                      </span>
                      <b>{modifier.name}</b>
                      <small>{modifier.semantic}</small>
                    </div>
                  ))}
              </div>
              <div className="modifier-notes">
                <p>
                  <b>No mark:</b> register/direct mode.
                </p>
                <p>
                  <b>Typed marks:</b> choose integer, float, string, literal, constant, address,
                  bytes/vector, stream, or force semantics.
                </p>
                <p>
                  <b>Validation:</b> unknown, duplicate, reordered, or ambiguous marks are rejected.
                </p>
                <p>
                  <b>Cantillation:</b> the seven selected marks are structured parser tokens. Full
                  control-flow lowering is a later v0.1 milestone.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="panel concept-cards" aria-label="IvritCode concepts">
          <article id="aleph-olam">
            <p className="eyebrow">The hidden seed</p>
            <h2>
              Aleph Olam · <span lang="he">אלף עולם</span>
            </h2>
            <p>
              IvritCode has twenty-two visible places—one for each Hebrew letter—and one additional
              place called Aleph Olam. It acts like hidden shared memory and a tuning key: letters
              may read it as a seed, phase, or transformation parameter without flattening the
              visible pattern.
            </p>
            <p>
              <b>Technical feature only:</b> it is not a claim about divinity, prophecy, or
              consciousness.
            </p>
          </article>
          <article id="gates">
            <p className="eyebrow">Letter relationships</p>
            <h2>What are the 231 Gates?</h2>
            <p>
              Whenever two Hebrew letters appear beside one another, they form a gate. A gate is
              simply a relationship between two letters.
            </p>
            <div className="friendly-gates" aria-label="Five examples of two-letter gates">
              {[
                ["ב", "ר"],
                ["ר", "א"],
                ["א", "ש"],
                ["ש", "י"],
                ["י", "ת"],
              ].map(([firstLetter, secondLetter], index) => (
                <figure
                  className="friendly-gate"
                  key={`${firstLetter}-${secondLetter}`}
                  aria-label={`Gate ${index + 1}: ${firstLetter} and ${secondLetter}`}
                >
                  <div className="friendly-gate__pair" aria-hidden="true">
                    <span lang="he">{firstLetter}</span>
                    <i></i>
                    <span lang="he">{secondLetter}</span>
                  </div>
                  <figcaption>Gate {String(index + 1).padStart(2, "0")}</figcaption>
                </figure>
              ))}
            </div>
            <p>
              The twenty-two letters form 231 unordered pairs. Run a program to see which pairs
              appear; the full matrix stays inside Advanced details.
            </p>
          </article>
        </section>
        <section className="panel project-bridge" id="quantum-etz-chaim">
          <div className="section-title">
            <div>
              <span>Q</span>
              <h2>IvritCode and Quantum Etz Chaim</h2>
            </div>
            <p>One engine · two ways to understand it</p>
          </div>
          <div className="project-bridge-grid">
            <article>
              <p className="eyebrow">IvritCode</p>
              <h3>The executable language and machine</h3>
              <p>
                IvritCode turns Hebrew-letter source into deterministic operations on twenty-two
                visible registers and the Aleph Olam register. It owns parsing, execution, machine
                state, and the complete step-by-step trace.
              </p>
            </article>
            <article>
              <p className="eyebrow">Quantum Etz Chaim</p>
              <h3>The architecture and visual workbench</h3>
              <p>
                Quantum Etz Chaim places that same computation inside a Tree-based systems model. It
                shows routes, services, gates, observation at Da’at, and manifestation through
                Malchut without running a second competing engine.
              </p>
            </article>
          </div>
          <div className="project-handoff" aria-label="How the projects work together">
            <span>1 · Write Hebrew source</span>
            <span>2 · IvritCode executes it</span>
            <span>3 · A versioned trace crosses the exchange contract</span>
            <span>4 · Quantum Etz Chaim visualizes the same result</span>
          </div>
          <p>
            The exchange records the engine version, path-map version, seed, complete trace hash,
            and manifestation version. Those fields make the handoff reproducible and reveal when
            two views are not describing the same run.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="https://quantumetzchaim.com/#ivritcode">
              Explore Quantum Etz Chaim
            </a>
            <a className="button" href="#try">
              Run IvritCode
            </a>
          </div>
        </section>
        <details className="advanced-qec" id="compiler">
          <summary>Advanced: experimental ivritcode-0.1 compiler and QEC details</summary>
          <section className="panel qec-lab">
            <div className="section-title">
              <div>
                <span>Q</span>
                <h2>Experimental ivritcode-0.1 Compiler Dialect</h2>
              </div>
              <p>
                {QEC_SCHEMA_VERSION} · separate opcode map · local sandbox · no web or grid access
              </p>
            </div>
            <div className="qec-explainer">
              <div>
                <p className="eyebrow">One instruction, three semantic layers</p>
                <h3>
                  <span lang="he">י</span> ADD + <span lang="he">◌ִ</span> integer mode + typed
                  operands
                </h3>
                <p>
                  Letters choose operations, niqqud choose value/addressing modes, and selected
                  cantillation marks structure control flow. These are engineering conventions.
                </p>
              </div>
              <img
                src="/art/semantic-layers.png"
                alt="Diagram explaining letter, niqqud, and cantillation as three separate semantic layers"
                loading="lazy"
              />
            </div>
            <div className="qec-editor-grid">
              <div>
                <label htmlFor="qec-source">Pointed Hebrew source</label>
                <textarea
                  id="qec-source"
                  dir="rtl"
                  lang="he"
                  value={qecSource}
                  onChange={(event) => setQecSource(event.target.value)}
                  spellCheck={false}
                />
                <label htmlFor="qec-r1">Initial r1 value</label>
                <input
                  id="qec-r1"
                  inputMode="numeric"
                  value={qecInput}
                  onChange={(event) => setQecInput(event.target.value)}
                />
                <div className="toolbar">
                  <button className="primary" onClick={runQecExample}>
                    Compile and run safe example
                  </button>
                  <button onClick={() => setQecSource(QEC_SAMPLE)}>Restore example</button>
                </div>
                {qecError && (
                  <div className="error" role="alert">
                    {qecError}
                  </div>
                )}
                <div className="qec-output" aria-live="polite">
                  <small>Sandbox result</small>
                  <strong>r1 = {qecRun?.result.outputs.r1 ?? "—"}</strong>
                  <span>
                    {qecRun
                      ? `${qecRun.result.budgetUsed.steps} metered step`
                      : "Run the verified IR to see a result."}
                  </span>
                </div>
              </div>
              <figure>
                <img
                  src="/art/compilation-pipeline.png"
                  alt="IvritCode compilation pipeline from Hebrew source through Unicode, Ivrit AST, allowlisted Python AST, and sandbox"
                  loading="lazy"
                />
                <figcaption>Source text is never executed directly.</figcaption>
              </figure>
            </div>
            <div className="inspectors" aria-label="Compiler inspectors">
              <details open>
                <summary>Normalized code points</summary>
                <pre>
                  {qecCompilation.program.tokens
                    .map(
                      (token) =>
                        `${token.text || "↵"}  ${token.codePoints.join(" ")}  [${token.start},${token.end})`,
                    )
                    .join("\n")}
                </pre>
              </details>
              <details>
                <summary>Tokens</summary>
                <pre>{JSON.stringify(qecCompilation.program.tokens, null, 2)}</pre>
              </details>
              <details>
                <summary>IvritCode AST</summary>
                <pre>{JSON.stringify(qecCompilation.program.instructions, null, 2)}</pre>
              </details>
              <details>
                <summary>QEC IR</summary>
                <pre>{JSON.stringify(qecCompilation.ir, null, 2)}</pre>
              </details>
              <details>
                <summary>Python AST</summary>
                <pre>{JSON.stringify(qecCompilation.pythonAst, null, 2)}</pre>
              </details>
              <details open>
                <summary>Readable Python</summary>
                <pre>{qecCompilation.pythonSource}</pre>
              </details>
            </div>
            <div className="qec-runtime-grid">
              <section>
                <h3>Auditable QEC trace</h3>
                {qecRun ? (
                  <ol>
                    {qecRun.trace.events.map((event) => (
                      <li key={event.sequence}>
                        <b>{event.stage}</b>
                        <span>{event.status}</span>
                        <small>{event.message}</small>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>
                    Run the example to pass through Keter, Binah, Da&apos;at, Gevurah, Hod, Yesod,
                    and Malchut.
                  </p>
                )}
              </section>
              <section>
                <h3>32 Paths</h3>
                <p>{PATH_CHANNELS.length} typed channels: 22 opcode + 10 state transition.</p>
                <div className="path-chips">
                  {PATH_CHANNELS.map((path) => (
                    <span key={path.id}>{path.label}</span>
                  ))}
                </div>
              </section>
              <section>
                <h3>231 Gates</h3>
                <p>
                  {GATE_PAIRS.length} complete unordered pairs · checksum{" "}
                  <code>{GATE_REGISTRY_CHECKSUM}</code>.
                </p>
                <p>
                  Every Gate is <b>unassigned</b> in v0.1 and cannot execute until deliberately
                  reviewed.
                </p>
              </section>
              <section>
                <h3>Capabilities & budget</h3>
                <ul>
                  <li>sandbox.execute: local IR only</li>
                  <li>web.read: denied</li>
                  <li>grid.compute: denied</li>
                  <li>max steps: 1,000</li>
                  <li>Aleph Olam: reserved and disabled</li>
                </ul>
              </section>
            </div>
            <figure className="wave-architecture">
              <img
                src="/art/infinite-wave-architecture.png"
                alt="Infinite Wave architecture diagram separating the local VM, permissioned web and grid, provenance, privacy, and human authority"
                loading="lazy"
              />
              <figcaption>
                Computational metaphor only; no claim of physical quantum behavior.
              </figcaption>
            </figure>
            <p className="spec-note">
              Canonical mapping: <b>{IVRIT_LANGUAGE_SPEC.id}</b>. Deep links and examples load
              source only; they never auto-execute.
            </p>
          </section>
        </details>
        <details className="advanced-details">
          <summary>Advanced details: registers, traces, and full gate matrix</summary>
          <div className="advanced-grid">
            <section className="chamber panel" id="source">
              <div className="section-title">
                <div>
                  <span>01</span>
                  <h2>Legacy Source Chamber</h2>
                </div>
                <p>
                  Original symbolic VM preserved for compatibility; separate from IvritCode 0.1.
                </p>
              </div>
              <div className="editor-wrap">
                <div className="line-numbers" aria-hidden="true">
                  {source.split("\n").map((_, i) => (
                    <span key={i}>{i + 1}</span>
                  ))}
                </div>
                <textarea
                  dir="rtl"
                  lang="he"
                  aria-label="IvritCode source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  spellCheck={false}
                />
              </div>
              {error && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}
              <div className="toolbar">
                <button className="primary" onClick={run}>
                  Run program
                </button>
                <button onClick={step}>Step</button>
                <button onClick={() => setPlaying(false)} disabled={!playing}>
                  Pause
                </button>
                <button onClick={reset}>Reset</button>
                <button onClick={() => setSource(SAMPLE)}>Load example</button>
                <button onClick={download}>Download .ivc</button>
                <button onClick={() => fileRef.current?.click()}>Upload .ivc</button>
                <input
                  ref={fileRef}
                  hidden
                  type="file"
                  accept=".ivc,text/plain"
                  onChange={upload}
                />
              </div>
              <div className="controls">
                <label>
                  <input
                    type="checkbox"
                    checked={strict}
                    onChange={(e) => setStrict(e.target.checked)}
                  />{" "}
                  Strict modifiers
                </label>
                <label>
                  Trace
                  <select
                    value={traceMode}
                    onChange={(e) => setTraceMode(e.target.value as TraceMode)}
                  >
                    <option value="full">Full</option>
                    <option value="summary">Summary</option>
                    <option value="none">None</option>
                  </select>
                </label>
                <label>
                  Initial state
                  <select value={mode} onChange={(e) => setMode(e.target.value as InitialMode)}>
                    <option value="zero">Zero</option>
                    <option value="numeric">Numeric seed</option>
                    <option value="hebrew">Hebrew seed</option>
                  </select>
                </label>
                {mode !== "zero" && (
                  <label>
                    Seed
                    <input
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      dir={mode === "hebrew" ? "rtl" : "ltr"}
                    />
                  </label>
                )}
              </div>
            </section>
            <section className="panel observatory">
              <div className="section-title">
                <div>
                  <span>02</span>
                  <h2>Legacy Register Observatory</h2>
                </div>
                <div className="segmented" aria-label="Register view">
                  {(["ring", "grid", "table"] as View[]).map((item) => (
                    <button
                      className={view === item ? "active" : ""}
                      onClick={() => setView(item)}
                      key={item}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <figure className="section-art register-art">
                <img
                  src="/art/register-observatory.jpg"
                  alt="Abstract circular register observatory with Hebrew letter nodes and a distinct Aleph Olam register"
                  loading="lazy"
                  decoding="async"
                />
                <figcaption>Register topology · 22 visible operators and Aleph Olam</figcaption>
              </figure>
              <div className="state-summary">
                <div>
                  <small>Step</small>
                  <strong>
                    {selectedStep + 1}/{result?.stepsExecuted ?? 0}
                  </strong>
                </div>
                <div>
                  <small>Halt</small>
                  <strong>{result?.haltReason ?? "waiting"}</strong>
                </div>
                <div className="aleph-summary">
                  <small>Aleph Olam · אלף עולם</small>
                  <strong>
                    {state[ALEPH_OLAM_INDEX]} <em>{toBalanced(state[ALEPH_OLAM_INDEX] as any)}</em>
                  </strong>
                </div>
              </div>
              {view === "table" ? (
                <table>
                  <caption>All IvritCode register values</caption>
                  <thead>
                    <tr>
                      <th>Register</th>
                      <th>Index</th>
                      <th>Base 22</th>
                      <th>Balanced</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.map((value, index) => (
                      <tr key={index} className={index === 22 ? "aleph-row" : ""}>
                        <th>{index === 22 ? "A∞" : HEBREW_LETTERS[index]}</th>
                        <td>{index}</td>
                        <td>{value}</td>
                        <td>{toBalanced(value as any)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={`registers ${view}`}>
                  {state.map((value, index) => {
                    const previous =
                        selectedStep > 0
                          ? valueAt(result, selectedStep - 1)?.[index]
                          : initialState(mode, seed)[index],
                      delta = value - (previous ?? value);
                    return (
                      <article
                        key={index}
                        className={index === 22 ? "aleph-register" : ""}
                        style={{ "--i": index } as React.CSSProperties}
                      >
                        <span>{index === 22 ? "A∞" : HEBREW_LETTERS[index]}</span>
                        <strong>{value}</strong>
                        <small>
                          {index === 22 ? "Aleph Olam" : `R${index} · ${toBalanced(value as any)}`}
                        </small>
                        {delta !== 0 && (
                          <i>
                            {delta > 0 ? "+" : ""}
                            {delta}
                          </i>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
            <section className="panel trace">
              <div className="section-title">
                <div>
                  <span>03</span>
                  <h2>Execution Trace</h2>
                </div>
                <p>Choose a checkpoint to restore its observed state.</p>
              </div>
              <div className="trace-list">
                {!result?.trace.length ? (
                  <div className="empty">
                    Run a program with summary or full tracing to reveal its execution.
                  </div>
                ) : (
                  result.trace.map((row, index) => (
                    <button
                      key={index}
                      className={selectedStep === index ? "selected" : ""}
                      onClick={() => setSelectedStep(index)}
                    >
                      <b>{row.step.toString().padStart(2, "0")}</b>
                      <span lang="he">{row.instruction.source.raw}</span>
                      <strong>{LETTER_NAMES[row.instruction.opcodeIndex]}</strong>
                      <small>
                        {row.changedRegisters.length} registers changed · A∞ {row.alephOlamBefore}→
                        {row.alephOlamAfter}
                      </small>
                      {row.halted && <em>HALT</em>}
                    </button>
                  ))
                )}
              </div>
            </section>
            <section className="panel gates" id="gate-matrix">
              <div className="section-title">
                <div>
                  <span>04</span>
                  <h2>231 Gates</h2>
                </div>
                <div className="controls compact">
                  <label>
                    <input
                      type="checkbox"
                      checked={directed}
                      onChange={(e) => setDirected(e.target.checked)}
                    />{" "}
                    Directed
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={circular}
                      onChange={(e) => setCircular(e.target.checked)}
                    />{" "}
                    Circular
                  </label>
                </div>
              </div>
              <figure className="section-art gates-art">
                <img
                  src="/art/gates-matrix.jpg"
                  alt="Abstract luminous matrix of Hebrew letter-pair relationships"
                  loading="lazy"
                  decoding="async"
                />
                <figcaption>The 22 × 22 analytical field</figcaption>
              </figure>
              <div className="gate-layout">
                <div className="matrix" role="grid" aria-label="22 by 22 gate frequency matrix">
                  {gates.matrix.flatMap((row, r) =>
                    row.map((count, c) => (
                      <button
                        key={`${r}-${c}`}
                        aria-label={`${HEBREW_LETTERS[r]} to ${HEBREW_LETTERS[c]}: ${count}`}
                        title={`${HEBREW_LETTERS[r]}־${HEBREW_LETTERS[c]} · ${count}`}
                        className={count ? "used" : ""}
                        style={{ opacity: count ? Math.min(1, 0.28 + count * 0.22) : 0.08 }}
                        onClick={() => setSelectedGate(`${HEBREW_LETTERS[r]}־${HEBREW_LETTERS[c]}`)}
                      />
                    )),
                  )}
                </div>
                <div className="gate-list">
                  {gates.frequencies.length ? (
                    gates.frequencies.map((item) => (
                      <button
                        className={selectedGate === item.gate ? "selected" : ""}
                        key={item.gate}
                        onClick={() => setSelectedGate(item.gate)}
                      >
                        <span>{item.gate}</span>
                        <b>{item.count}</b>
                        <small>
                          positions {item.occurrences.map((o) => o.startInstruction + 1).join(", ")}
                        </small>
                      </button>
                    ))
                  ) : (
                    <div className="empty">Two instructions open the first gate.</div>
                  )}
                </div>
              </div>
              <div className="lexicon">
                <h3>Lexicon lens</h3>
                <div>
                  {(["exact", "prefix", "candidate"] as const).map((kind) => (
                    <section key={kind}>
                      <h4>{kind}</h4>
                      {matches
                        .filter((x) => x.kind === kind)
                        .slice(0, 8)
                        .map((match) => (
                          <span key={`${kind}-${match.start}-${match.text}`}>{match.text}</span>
                        ))}
                    </section>
                  ))}
                </div>
                <p>
                  Candidate windows are not asserted to be Hebrew words. Exact matches come only
                  from the curated lexicon.
                </p>
              </div>
            </section>
          </div>
        </details>
        <section className="panel chavruta" id="chavruta">
          <div className="section-title">
            <div>
              <span>05</span>
              <h2>IvritCode Chavruta</h2>
            </div>
            <p>Optional programming and study partner—not an oracle or authority.</p>
          </div>
          <figure className="section-art chavruta-art">
            <img
              src="/art/chavruta-flow.jpg"
              alt="Abstract stream of Hebrew letters flowing toward a geometric dialogue structure"
              loading="lazy"
              decoding="async"
            />
            <figcaption>Study through dialogue, computation, and careful distinction</figcaption>
          </figure>
          <textarea
            aria-label="Question for Chavruta"
            placeholder="Ask for a valid program, trace explanation, or experiment…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="toolbar">
            <button className="primary" onClick={ask}>
              Ask Chavruta
            </button>
            {chavruta?.program && (
              <button onClick={() => setSource(chavruta.program)}>Load suggested program</button>
            )}
          </div>
          <p className="assistant-status" role="status">
            {assistantStatus}
          </p>
          {chavruta && (
            <div className="assistant-result">
              <code dir="rtl">{chavruta.program}</code>
              <h3>Explanation</h3>
              <p>{chavruta.explanation}</p>
              <h3>Expected behavior</h3>
              <p>{chavruta.expectedBehavior}</p>
              {chavruta.diagnostics.length > 0 && (
                <ul>
                  {chavruta.diagnostics.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
        <section className="panel open-source" id="about-project">
          <p className="eyebrow">Free to explore</p>
          <h2>IvritCode belongs to curious minds</h2>
          <p>
            IvritCode is free, experimental, educational, and open source. Students, programmers,
            Hebrew learners, artists, researchers, teachers, and anyone curious about language and
            computation are welcome to explore.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#try">
              Try IvritCode
            </a>
            <a
              className="button"
              href="https://github.com/Richardatf/IvritCode"
              target="_blank"
              rel="noreferrer"
            >
              View the source code
            </a>
          </div>
        </section>
      </main>
      <footer>
        <span>IvritCode.org · Experimental software</span>
        <span>
          Base-22 notation is not traditional gematria. Computation is implemented; interpretation
          remains exploratory.
        </span>
      </footer>
    </div>
  );
}
