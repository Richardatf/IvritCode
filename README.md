# IvritCode

IvritCode is a deterministic symbolic computing system. Its 22 Hebrew letters are executable operators over exactly 23 numeric registers: 22 visible letter registers and a distinguished Aleph Olam register. Every stored value is an integer in `Z22` (`0..21`). Quantum Etz Chaim is the project’s conceptual computing architecture and research framework, not a claim of established quantum physics or theological authority.

## Status

Version 1.0 consolidates the TypeScript engine, Unicode parser, CLI, browser demo, 231-Gates analysis, lexicon matching, and Chavruta contract. The original 22 transformations from `src/vm.ts` are preserved. The former English stack VM and browser-only toy VM are no longer public execution paths.

Implemented:

- All 22 letter operators and exactly 23 normalized registers
- Immutable stepping, before/after traces, and enforced step limits
- UTF-8 Hebrew parsing with NFD normalization and source locations
- Final forms `ךםןףץ` normalized to `כמנפצ`
- Niqqud and cantillation retention in parsing, traces, and disassembly
- Neutral modifier policy by default and explicit rejection in strict mode
- Directed, non-circular 231-Gates analysis by default
- Raw lexicon windows distinguished from confirmed matches
- CLI, browser app, examples, tests, and a validated Netlify Chavruta endpoint

Experimental or reserved:

- Niqqud has no transformation semantics yet
- Cantillation has no grouping or control-flow semantics yet
- Execution policy hooks, permissions, and deterministic seeds are metadata extension points only
- Symbolic interpretations are exploratory and are not scientific, prophetic, medical, or halachic conclusions

## Machine Model

Registers `0..21` correspond to `א..ת`; register `22` is Aleph Olam. Aleph Olam remains numeric. Engine version, program name, current step, limits, errors, permissions, seeds, and extension metadata live in a separate `ExecutionContext`.

Arithmetic is normalized modulo 22 after each operation. `INSTRUCTION_DEFINITIONS` documents every operator’s name, index, technical description, and Aleph Olam access. The detailed transformations remain in `src/vm.ts`.

## Source Grammar

Hebrew letters are instructions. Whitespace and ordinary punctuation are ignored. `#` begins a comment through the end of the line. Combining marks attach to the preceding letter. Source locations retain filename, line, column, offset, and raw normalized instruction text.

Recognized niqqud includes Sheva, Hiriq, Tzere, Segol, Patach, Qamatz, Holam, Qubutz, Dagesh, Shin Dot, and Sin Dot. Normal execution treats these as neutral while retaining them. `--strict-modifiers` reports an `UnsupportedModifierError`. Cantillation marks are retained and displayed but intentionally have no execution meaning in v1.0.

## Install And Verify

Node.js 20 or newer is required.

```bash
npm install
npm run typecheck
npm test
npm run build
```

`npm test` builds first and then runs Vitest. Public declarations and browser modules are emitted to `dist/`.

## CLI

```bash
npx ivritcode run examples/bereshit.ivc
npx ivritcode check examples/bereshit.ivc
npx ivritcode trace examples/bereshit.ivc
npx ivritcode disassemble examples/niqqud.ivc
npx ivritcode gates examples/gates.ivc
npx ivritcode repl
```

Use `--max-steps N` to set the execution limit and `--strict-modifiers` to reject recognized modifiers without semantics. Failures return a nonzero exit code.

The textual debug assembler accepts canonical names such as `ALEPH BET GIMEL`; it assembles directly to the Hebrew-letter engine. Hebrew remains the primary language.

## Browser

Run `npm run build`, then `npm run dev`, and open `http://localhost:4173`. The editor preserves program order while displaying Hebrew right-to-left. The page uses `dist/web/app.js`, which imports the same parser, VM wrapper, gates, state, and lexicon modules exported by the library. No VM logic is embedded in DOM code.

## 231 Gates

`analyzeGates(letters)` counts repeated adjacent pairs. Defaults are directed and non-circular, so `א־ב` differs from `ב־א`, and the final letter does not connect to the first. Set `directed: false` or `circular: true` explicitly. Combining marks do not form gates because analysis receives normalized base letters.

## Lexicon

`matchLexiconWindows` produces located raw windows and labels each as `confirmed` only when its complete normalized text exists in the supplied lexicon. Missing lexicon data yields unknown windows rather than invented words. `loadLexicon` reports a typed loading error while the browser remains usable without the dataset.

## Chavruta

The Netlify function is a programming and study assistant. It never receives privileged execution access. Configure:

```text
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
CHAVRUTA_ALLOWED_ORIGINS=https://ivritcode.org,https://www.ivritcode.org,http://localhost:4173
CHAVRUTA_TIMEOUT_MS=20000
```

The key stays server-side. The shared response contract is:

```ts
interface ChavrutaResponse {
  program: string;
  explanation: string;
  gatesToWatch: string[];
  warnings: string[];
}
```

Requests are length-limited, CORS is allow-listed, `OPTIONS` is supported, model output uses a JSON schema, and generated programs are checked against the Hebrew grammar.

## Layout

Core modules live under `src/`: alphabet and instruction metadata, parser, state, program execution, VM semantics, gates, lexicon, errors, CLI, and browser adapter. The former stack-machine, Poseidon-style, Ramchal, and React prototype files remain in the history and are excluded from the canonical build because they describe separate experimental systems.

## Roadmap

The next milestone is IvritCode 1.1: specify and test selected niqqud transformations, design a non-speculative cantillation structure model, expand the curated lexicon, and introduce a versioned execution-policy interface. Any technical semantics should remain clearly separated from symbolic or theological interpretation.
