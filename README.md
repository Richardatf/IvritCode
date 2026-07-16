# IvritCode · עבריתקוד

**Twenty-two operators. Twenty-three registers. One deterministic symbolic machine.**

[IvritCode.org](https://ivritcode.org) introduces an experimental programming language rooted in Hebrew letter structure. Hebrew source is parsed in logical Unicode order and executed over 22 visible letter registers plus the distinguished numeric Aleph Olam register.

IvritCode is implemented computation. Quantum Etz Chaim is its broader conceptual research architecture—not a claim that this software runs on quantum hardware. Outputs do not prove mystical truths, raw strings are not automatically Hebrew words, and the Chavruta is not a religious authority.

## Quick start

Requires Node.js 22 or newer.

```bash
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

Run a first program:

```bash
npm run cli -- run examples/bereshit.ivc
```

```ivritcode
# Six operators in logical Unicode order
בראשית
```

## Architecture

```text
apps/web          React + Vite IvritCode Observatory
apps/cli          UTF-8 command-line interface
packages/core     deterministic VM, state, traces, policy
packages/unicode  Hebrew Unicode parser and source locations
packages/analysis 231-Gates occurrences, frequencies, matrix
packages/lexicon  normalized lexical classification and data
netlify/functions optional validated Chavruta endpoint
archive/          preserved prototypes, excluded from builds
```

The core has no DOM or browser dependency. The web and CLI consume the same published workspace API.

## Machine model

Registers `R[0]..R[21]` correspond to `א..ת`; `R[22]` is Aleph Olam. Every stored value is an integer in `Z₂₂`, `0..21`. Balanced interpretation maps `0..10` to themselves and `11..21` to `-11..-1`.

Aleph Olam is a numeric register. Program names, step counts, hashes, permissions, timing metadata, strict mode, and halt state live separately in `ExecutionContext`.

## The 22 operations

| Letter | Name   | Technical v1.0 operation                       |
| ------ | ------ | ---------------------------------------------- |
| א      | Aleph  | Stable frame checkpoint                        |
| ב      | Bet    | Add registers `0..10` into `11..21`            |
| ג      | Gimel  | Multiply paired halves                         |
| ד      | Dalet  | Compute opposing pair differences              |
| ה      | Heh    | Reveal balanced signs; sum into Aleph Olam     |
| ו      | Vav    | Exchange the two eleven-register halves        |
| ז      | Zayin  | Increment visible registers                    |
| ח      | Chet   | Decrement visible registers                    |
| ט      | Tet    | Square visible registers; sum squares          |
| י      | Yod    | Broadcast Aleph Olam into visible registers    |
| כ      | Kaf    | Four-register circular window sum              |
| ל      | Lamed  | Balanced global measure and recenter           |
| מ      | Mem    | Three-register circular smoothing              |
| נ      | Nun    | Balanced negation of all registers             |
| ס      | Samekh | Rotate visible registers by Aleph Olam         |
| ע      | Ayin   | Maximum shifted half-correlation               |
| פ      | Peh    | Expose visible Aleph into Aleph Olam and edges |
| צ      | Tsadi  | Compare halves and expose the dominant extreme |
| ק      | Qof    | Mirror and incline by destination index        |
| ר      | Resh   | Reseed from Aleph Olam using Bet as stride     |
| ש      | Shin   | Circular quadratic mixing                      |
| ת      | Tav    | Seal by rotating circular quartets             |

`תּ` executes Tav's sealed checkpoint and explicitly halts. Plain Tav does not halt; natural end-of-input does.

## Unicode, niqqud, and cantillation

The parser uses NFD internally while retaining original source. It tracks line, column, code-point offset, UTF-16 offset, and raw marked instruction text. Final letters normalize as `ך→כ`, `ם→מ`, `ן→נ`, `ף→פ`, `ץ→צ` while retaining the original character.

Sheva, Hiriq, Tzere, Segol, Patach, Qamatz, Holam, Qubutz, Dagesh, Shin Dot, and Sin Dot are recognized. Cantillation marks are named where known and retained in order. In permissive mode they are neutral; strict mode rejects semantics not implemented in v1.0. Cantillation grouping and control flow are reserved for later releases.

## State initialization and base 22

The API supports zero state, deterministic numeric seed, deterministic Hebrew seed, and explicit 23-value state. Utilities convert decimal and multi-digit base 22, Hebrew index notation, and balanced values. Hebrew rendering is an IvritCode notation layer—not traditional gematria.

```ts
import { executeProgram, makeZeroState, parseProgram } from "@ivritcode/core";

const result = executeProgram(parseProgram("בראשית"), {
  initialState: makeZeroState(),
  trace: "full",
});
```

## CLI

```bash
ivritcode run examples/bereshit.ivc
ivritcode check examples/bereshit.ivc
ivritcode trace examples/bereshit.ivc --format text
ivritcode trace examples/bereshit.ivc --format json
ivritcode trace examples/bereshit.ivc --format ndjson
ivritcode disassemble examples/niqqud-parsing.ivc
ivritcode gates examples/gates.ivc
ivritcode lexicon examples/bereshit.ivc
ivritcode convert --decimal 231
ivritcode repl
ivritcode info
```

The REPL supports `:help`, `:state`, `:reset`, `:seed`, `:trace`, `:gates`, `:strict`, and `:quit`.

## IvritCode Observatory

The Observatory provides the Source Chamber, Register Observatory, Execution Trace, 231 Gates, lexicon lens, and optional Chavruta. It includes RTL editing without source reversal, step playback, uploads/downloads, initial-state modes, ring/grid/table registers, trace restoration, a 22×22 accessible matrix, dark/light/system/high-contrast themes, and reduced-motion support.

Start it with `npm run dev`. The production output is `apps/web/dist`.

## 231 Gates and lexicon

Gate analysis defaults to directed, non-circular pairs with repeated letters included, so `א־ב` differs from `ב־א`. Options enable undirected, circular, and repeat-filtered analysis. Results include every occurrence and a 22×22 frequency matrix.

Lexicon analysis removes niqqud and normalizes final forms for comparison. It separates exact matches, prefixes, and raw candidates. Candidates are never presented as confirmed words.

## IvritCode Chavruta

The optional Chavruta is a programming and study partner. The browser remains fully functional without it. API keys stay in Netlify Functions.

```bash
cp .env.example .env
# set OPENAI_API_KEY only for local Chavruta development
npx netlify dev
```

Requests are method-checked, length-limited, origin-controlled, rate-limit-ready, and timed out. Model output follows a JSON schema and generated programs pass through the real parser before being marked valid.

## Security and policy

The VM performs no filesystem, network, shell, dynamic evaluation, or arbitrary host operations. `ExecutionPolicy` is a conventional extension point for future privileged behavior; it is not machine conscience. No secret is required for builds, tests, the CLI, or the Observatory.

## Testing and quality

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

CI runs reproducible installation, formatting, linting, type-checking, tests, and all workspace builds without secrets.

## Deployment

`netlify.toml` publishes `apps/web/dist`, bundles functions from `netlify/functions`, provides SPA routing, and sets security and immutable asset-cache headers. Configure production origins and OpenAI variables in Netlify, never in frontend source.

## Status and roadmap

Implemented: all 22 operators, 23-register state, Unicode parsing, marks, explicit/natural halting, trace modes, limits, gates, lexicon, CLI, Observatory, Chavruta validation, CI, and Netlify configuration.

Experimental: symbolic interpretation, Hebrew seeding, lexicon heuristics, and policy composition. Reserved: general niqqud transformations and cantillation structure/control flow.

The recommended v1.1 milestone is a small, versioned niqqud semantics set, richer curated lexicon provenance, and browser user-flow automation.

See [CONTRIBUTING.md](CONTRIBUTING.md) and the documents in [`docs/`](docs/). IvritCode is released under the repository's MIT license.
