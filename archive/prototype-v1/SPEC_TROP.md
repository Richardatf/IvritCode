# IvritCode Specification — Trop (Cantillation) Semantics  
## SPEC_TROP.md  
### Version v0.2 (Draft / Canonical)

> _“The niqqud give breath to the letters.  
> The trop give form to the breath.”_

This document defines the **cantillation (ṭeʿamim / trop) semantics** for IvritCode.

Trop do **not** change the arithmetic meaning of letters.  
They define **structure, grouping, and control flow**:  
how instructions are gathered into phrases, blocks, conditions, and loops.

---

## 1. Role of Trop in IvritCode

### 1.1 Structural layer

- Letters (א–ת): **what** operation occurs.
- Niqqud: **how** the operation behaves.
- Trop: **when, where, and under what conditions** operations occur.

Trop operate at the **phrase / block level**, not purely at the single-instruction level.

---

## 2. Program as a Musical Structure

An IvritCode program is parsed as:

- A **linear sequence of instructions**, each with:
  - base letter
  - niqqud set
  - trop set

From this, the interpreter constructs:

- **Phrases** (tight groupings)
- **Blocks** (units of execution)
- **Control-flow edges** between blocks

This mirrors Masoretic reading:
- conjunctive trop bind words together,
- disjunctive trop separate clauses,
- terminal trop end verses.

---

## 3. Semantic Axes for Trop

Each trop may affect one or more of the following axes:

| Axis | Name | Description |
|-----|------|-------------|
| B | Block | Start/end of execution blocks |
| G | Grouping | How instructions bind into phrases |
| C | Condition | Conditional execution based on A |
| L | Looping | Repetition / iteration of blocks |
| J | Join | Merge points / synchronization |

---

## 4. Execution Model

### 4.1 Parsing stages

1. **Lexing**
   - Read Hebrew text with letters, niqqud, trop.
   - Produce a linear instruction list.

2. **Phrase grouping**
   - Conjunctive trop merge adjacent instructions into phrases.

3. **Block construction**
   - Disjunctive trop split phrases into blocks.
   - Terminal trop close blocks definitively.

4. **Control-flow graph (CFG)**
   - Blocks become nodes.
   - Trop define conditional and looping edges.

Execution then proceeds deterministically over the CFG.

---

## 5. Trop Families and Semantics

Trop are grouped into **semantic families**.  
Each individual mark inherits the family behavior.

---

## 6. Conjunctive Trop — Tight Binding

**Purpose:** Bind multiple instructions into a single phrase.  
They indicate that the marked instruction is **not a boundary**.

### Examples (family, not exhaustive):

- Munach
- Mercha
- Mahpach
- Darga

### Semantics:

- **Axes:** G
- Instructions joined by conjunctives are executed:
  - sequentially,
  - without block separation,
  - as a single phrase for control-flow purposes.

### Effect:

- No implicit branching or halting.
- Phrase executes fully once entered.

---

## 7. Disjunctive Trop — Block Boundaries

**Purpose:** Separate phrases into blocks with logical pauses.

### 7.1 Weak Disjunctives (minor pauses)

Examples:
- Tifcha
- Zakef Qatan

**Semantics:**

- **Axes:** B
- End the current phrase.
- Start a new block, but with **implicit fall-through**.

Execution:
- Block A completes → Block B executes unconditionally next.

---

### 7.2 Strong Disjunctives (major pauses)

Examples:
- Etnaḥta
- Zakef Gadol

**Semantics:**

- **Axes:** B, C
- End current block.
- Introduce **conditional execution** for the following block.

Canonical condition:
- `if A > 0` then execute next block  
- else skip to the following boundary.

This gives IvritCode its first native **if-statement**.

---

## 8. Terminal Trop — Block & Program Termination

Examples:
- Sof Pasuq

### Semantics:

- **Axes:** B, J
- Close the current block.
- No fall-through beyond this point unless explicitly looped.

Effects may include:
- committing A as a checkpoint,
- halting execution if no loop edge returns here.

---

## 9. Looping Trop — Repetition Structures

Certain trop are interpreted as **loop markers**.

Examples:
- Kadma
- Geresh
- Gershayim

### Semantics:

- **Axes:** L, C
- Define looping edges in the control-flow graph.

Canonical patterns:

### 9.1 While-loop

- Marked block repeats **while A ≠ 0**.
- A is evaluated at block end unless overridden by niqqud.

### 9.2 Do-while loop

- Block executes at least once.
- Condition checked after first execution.

Loop direction (forward/backward) is determined by:
- relative position of the trop to block boundaries.

---

## 10. Join Trop — Synchronization

Certain conjunctive-disjunctive hybrids act as **join points**.

Examples:
- Revia
- Zarqa

### Semantics:

- **Axes:** J
- Multiple incoming control-flow paths converge.
- Execution continues only after all required predecessor paths complete.

This allows:
- structured convergence,
- future parallel semantics (without nondeterminism).

---

## 11. Interaction with Niqqud

- Trop define **where blocks start/end and how they repeat**.
- Niqqud inside a block define:
  - addressing,
  - immediates,
  - purity,
  - A-interaction.

Important rule:

> **Niqqud never alter control flow.  
> Trop never alter arithmetic semantics.**

The layers remain cleanly separated.

---

## 12. Determinism

IvritCode trop semantics are fully deterministic:

- No randomness.
- Loop counts and conditions depend only on A and state.
- Same text + same initial state ⇒ same execution graph and result.

---

## 13. Relationship to Other Specs

- `SPEC.md` — Base letter semantics
- `SPEC_NIQQUD.md` — Modifier semantics
- `SPEC_TROP.md` — This document

Together these form the complete conceptual language.

---

## 14. Future Extensions

- Named blocks / verses
- Explicit halting trop
- Parallel phrase evaluation (with deterministic joins)
- Visual CFG rendering for pedagogy

All extensions must preserve determinism.

---

_End of SPEC_TROP.md_
