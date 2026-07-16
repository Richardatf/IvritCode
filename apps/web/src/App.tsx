import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeGates } from "@ivritcode/analysis";
import {
  ALEPH_OLAM_INDEX,
  HEBREW_LETTERS,
  INSTRUCTION_DEFINITIONS,
  LETTER_NAMES,
  executeProgram,
  parseProgram,
  stateToLetterStream,
  toBalanced,
  type ExecutionResult,
  type IvritState,
  type TraceMode,
} from "@ivritcode/core";
import { analyzeLexicon, loadLexicon, type LexiconData } from "@ivritcode/lexicon";
import { downloadProgram, initialState, type InitialMode } from "./logic.js";
const SAMPLE = "# IvritCode · בראשית\nב ר א ש י ת";
const MODIFIERS = [
  ["ְ", "Sheva"],
  ["ִ", "Hiriq"],
  ["ֵ", "Tzere"],
  ["ֶ", "Segol"],
  ["ַ", "Patach"],
  ["ָ", "Qamatz"],
  ["ֹ", "Holam"],
  ["ֻ", "Qubutz"],
  ["ּ", "Dagesh"],
  ["ׁ", "Shin dot"],
  ["ׂ", "Sin dot"],
] as const;
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
          <p className="eyebrow">Experimental symbolic computing · v1.0</p>
          <h1>
            <span lang="he">עבריתקוד</span> Observatory
          </h1>
          <p className="lede">
            Twenty-two operators. Twenty-three registers. A precise instrument for exploring Hebrew
            as executable symbolic structure.
          </p>
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
        <a href="#about">What it is</a>
        <a href="#operators">Operators</a>
        <a href="#modifiers">Modifiers</a>
        <a href="#source">Try it</a>
        <a href="#gates">231 Gates</a>
      </nav>
      <main>
        <section className="panel guide" id="about">
          <div className="guide-intro">
            <p className="eyebrow">Start here</p>
            <h2>What is IvritCode?</h2>
            <p className="guide-lede">
              IvritCode is an experimental symbolic programming language in which each Hebrew letter
              is an instruction. A program runs in stored logical order and transforms a circular
              state of 22 visible registers plus one global <i>Aleph Olam</i> register.
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
              <span>Enter Hebrew letters in the Source Chamber.</span>
            </li>
            <li>
              <b>Run</b>
              <span>Execute the program, or step through one letter at a time.</span>
            </li>
            <li>
              <b>Observe</b>
              <span>Watch registers, trace changes, and inspect adjacent-letter gates.</span>
            </li>
          </ol>
          <div className="reference-block" id="operators">
            <div className="reference-heading">
              <div>
                <p className="eyebrow">Instruction menu</p>
                <h2>22 operators</h2>
              </div>
              <p>Select a letter to append it to the Source Chamber.</p>
            </div>
            <div className="operator-menu">
              {INSTRUCTION_DEFINITIONS.map((operator) => (
                <button
                  key={operator.letter}
                  type="button"
                  onClick={() => setSource((current) => `${current.trimEnd()} ${operator.letter}`)}
                  title={`Add ${operator.name} to the source`}
                >
                  <span lang="he">{operator.letter}</span>
                  <b>{operator.name}</b>
                  <small>{operator.summary}</small>
                  {(operator.readsAlephOlam || operator.writesAlephOlam) && (
                    <em>
                      {operator.readsAlephOlam && "reads A∞"}
                      {operator.readsAlephOlam && operator.writesAlephOlam && " · "}
                      {operator.writesAlephOlam && "writes A∞"}
                    </em>
                  )}
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
                {MODIFIERS.map(([mark, name]) => (
                  <div key={name}>
                    <span lang="he">◌{mark}</span>
                    <b>{name}</b>
                  </div>
                ))}
              </div>
              <div className="modifier-notes">
                <p>
                  <b>Normal mode:</b> niqqud is preserved in the trace but computationally neutral.
                </p>
                <p>
                  <b>Tav + Dagesh (תּ):</b> explicitly halts execution.
                </p>
                <p>
                  <b>Strict modifiers:</b> reports unsupported computational modifiers.
                </p>
                <p>
                  <b>Cantillation:</b> recognized and preserved, with no execution behavior in v1.0.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="chamber panel" id="source">
          <div className="section-title">
            <div>
              <span>01</span>
              <h2>Source Chamber</h2>
            </div>
            <p>Logical order remains intact. The editor alone displays right-to-left.</p>
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
            <input ref={fileRef} hidden type="file" accept=".ivc,text/plain" onChange={upload} />
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
              <select value={traceMode} onChange={(e) => setTraceMode(e.target.value as TraceMode)}>
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
              <h2>Register Observatory</h2>
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
        <section className="panel gates" id="gates">
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
              Candidate windows are not asserted to be Hebrew words. Exact matches come only from
              the curated lexicon.
            </p>
          </div>
        </section>
        <section className="panel chavruta">
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
