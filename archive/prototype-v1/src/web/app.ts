import { HEBREW_LETTERS } from "../alphabet.js";
import { analyzeGates } from "../gates.js";
import { loadLexicon, matchLexiconWindows, type LexiconData } from "../lexicon.js";
import { executeProgram } from "../program.js";
import { stateToLetterStream } from "../state.js";

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
const programInput = byId<HTMLTextAreaElement>("program-input");
const traceOutput = byId("trace-output");
const registerOutput = byId("register-output");
const letterStream = byId("letter-stream");
const gateList = byId("gate-list");
const wordList = byId("word-list");
const errorOutput = byId("error-output");
let lexicon: LexiconData | undefined;

loadLexicon("./src/data/hebrew-lexicon.json").then((data) => { lexicon = data; }).catch(() => { lexicon = undefined; });

function setText(element: HTMLElement | null, text: string): void { if (element) element.textContent = text; }

function run(): void {
  if (!programInput) return;
  try {
    const result = executeProgram(programInput.value, { maxSteps: 1000, filename: "browser.ivc" });
    setText(errorOutput, "");
    setText(traceOutput, result.trace.map((row) => `${row.index} ${row.instruction.source.raw} ${row.before.join(",")} -> ${row.after.join(",")}`).join("\n") || "No instructions executed.");
    setText(registerOutput, result.finalState.map((value, index) => `${index === 22 ? "A" : HEBREW_LETTERS[index]}=${value}`).join("  "));
    const stream = stateToLetterStream(result.finalState);
    setText(letterStream, stream);
    const gates = analyzeGates([...stream] as typeof HEBREW_LETTERS[number][]);
    setText(gateList, `231 Gates\n${gates.map((gate) => `${gate.gate} · ${gate.count}`).join("\n") || "No gates."}`);
    const candidates = matchLexiconWindows(stream, lexicon);
    const confirmed = candidates.filter((candidate) => candidate.status === "confirmed");
    setText(wordList, `Lexicon matches\n${confirmed.map((candidate) => `${candidate.text} @ ${candidate.start}`).join("\n") || "No confirmed matches."}\n\nRaw windows: ${candidates.length}`);
  } catch (error) { setText(errorOutput, error instanceof Error ? `${error.name}: ${error.message}` : String(error)); }
}

byId("run-button")?.addEventListener("click", run);
byId("sample-button")?.addEventListener("click", () => { if (programInput) programInput.value = "בראשית\n# Hebrew letters are instructions"; });
byId("reset-button")?.addEventListener("click", () => { if (programInput) programInput.value = ""; [traceOutput, registerOutput, letterStream, gateList, wordList, errorOutput].forEach((element) => setText(element, "")); });
programInput?.addEventListener("keydown", (event) => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); run(); } });

const promptInput = byId<HTMLTextAreaElement>("gpt-input");
const promptOutput = byId("gpt-output");
byId("gpt-send-button")?.addEventListener("click", async () => {
  const prompt = promptInput?.value.trim();
  if (!prompt) return;
  setText(promptOutput, "Asking Chavruta...");
  try {
    const response = await fetch("/.netlify/functions/chavruta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
    const data = await response.json() as { program?: string; explanation?: string; gatesToWatch?: string[]; warnings?: string[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
    if (data.program && programInput) programInput.value = data.program;
    setText(promptOutput, `${data.explanation ?? ""}\nGates: ${(data.gatesToWatch ?? []).join(", ")}\n${(data.warnings ?? []).join("\n")}`);
  } catch (error) { setText(promptOutput, error instanceof Error ? error.message : String(error)); }
});
byId("gpt-clear-button")?.addEventListener("click", () => { if (promptInput) promptInput.value = ""; setText(promptOutput, ""); });
