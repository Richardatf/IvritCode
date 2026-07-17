import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeGates } from "@ivritcode/analysis";
import {
  ALEPH_OLAM_INDEX,
  HEBREW_LETTERS,
  LETTER_NAMES,
  createState,
  executeProgram,
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
import { IVRIT_LANGUAGE_SPEC, QEC_SCHEMA_VERSION } from "@qec/spec";
import { downloadProgram, initialState, type InitialMode } from "./logic.js";
const SAMPLE = "# IvritCode · בראשית\nב ר א ש י ת";
const QEC_SAMPLE = "יִ $r1, 5";
const DEMO_SAMPLE = "בראשית";
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
    fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ivritcode-theme", theme);
  }, [theme]);
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
  const runDemo = () => {
    const seeded = Array(23).fill(0);
    seeded[ALEPH_OLAM_INDEX] = 9;
    setDemoResult(executeProgram(demoSource, { initialState: createState(seeded), trace: "full" }));
    setShowDemoSteps(false);
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
      </nav>
      <main>
        <section className="panel landing-video" aria-labelledby="landing-video-title">
          <div className="landing-video-copy">
            <p className="eyebrow">Meet IvritCode</p>
            <h2 id="landing-video-title">See the idea in motion</h2>
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
            <textarea
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
            {!demoResult ? (
              <>
                <h3>Your pattern is ready to explore.</h3>
                <p>
                  Press <b>Run the letters</b> to see a plain-language explanation.
                </p>
              </>
            ) : (
              <>
                <h3>Your program used {demoResult.program.instructions.length} Hebrew letters.</h3>
                <p>Each letter changed or preserved the machine&apos;s pattern in sequence.</p>
                {new Set(demoResult.finalState.slice(0, 22)).size === 22 ? (
                  <p className="pattern-callout">
                    <b>A complete spectrum appeared:</b> every base-22 value appears once.
                  </p>
                ) : (
                  <p className="pattern-callout">
                    <b>A new pattern appeared.</b> The visible letter positions now contain{" "}
                    {new Set(demoResult.finalState.slice(0, 22)).size} distinct values.
                  </p>
                )}
                {demoResult.program.instructions.some((item) => item.letter === "י") && (
                  <p>
                    Yod used Aleph Olam as a starting point and unfolded its influence across all
                    twenty-two letter positions. It created a related pattern rather than copying
                    one value everywhere.
                  </p>
                )}
                <button onClick={() => setShowDemoSteps((current) => !current)}>
                  {showDemoSteps ? "Hide each step" : "See each step"}
                </button>
              </>
            )}
          </div>
          {demoResult && showDemoSteps && (
            <div className="simple-steps">
              {demoResult.trace.map((step) => {
                const info = publicOperator(step.instruction.letter);
                return (
                  <article key={step.step}>
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
            <div className="friendly-gates">
              {["ב־ר", "ר־א", "א־ש", "ש־י", "י־ת"].map((gate) => (
                <span key={gate} lang="he">
                  {gate}
                </span>
              ))}
            </div>
            <p>
              The twenty-two letters form 231 unordered pairs. Run a program to see which pairs
              appear; the full matrix stays inside Advanced details.
            </p>
          </article>
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
                    and Malkhut.
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
