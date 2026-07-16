# IVRITCODE — COMPLETE LANGUAGE SPECIFICATION
## Version 1.0 (Canonical)

---

## 0. Preamble

IvritCode is a deterministic, symbolic programming language whose surface form is written in Hebrew letters, niqqud, and cantillation marks.

IvritCode is:
- deterministic,
- finite-state,
- reproducible,
- and computationally well-defined.

IvritCode is **not**:
- a ritual system,
- a theurgical engine,
- a divinatory tool,
- or a source of metaphysical claims.

Any symbolic, Kabbalistic, or gematria-based interpretations belong strictly to the **commentary layer**, which is non-executing and observational.

---

## 1. Alphabet, Registers, and State

### 1.1 Registers

IvritCode defines **23 registers**:

| Index | Name | Description |
|-----:|------|-------------|
| 0–21 | א–ת | One register per Hebrew letter |
| 22 | A | Aleph-Olam (hidden global register) |

### 1.2 Machine State

The full machine state is:

\[
S = (r_0,\dots,r_{21},A)
\]

where each component is an element of \(\mathbb{Z}_{22}\).

---

## 2. Numeric Domain (Base-22 Arithmetic)

### 2.1 Ring of Values

All arithmetic in IvritCode is performed in:

\[
\mathbb{Z}_{22} = \{0,1,\dots,21\}
\]

All results are reduced modulo 22 before being written to a register.

### 2.2 Invariant

At all times:

\[
\forall i \in \{0,\dots,22\},\quad r_i \in \{0,\dots,21\}
\]

---

## 3. Program Text and Parsing

### 3.1 Valid Glyphs

An IvritCode program may contain:
- Hebrew letters (א–ת) → operators
- Niqqud marks → semantic modifiers
- Cantillation (trop) → structural syntax
- Whitespace and punctuation → ignored

### 3.2 Parsing Pipeline

1. Unicode normalization
2. Letter tokenization
3. Modifier attachment (niqqud)
4. Structural grouping (cantillation)
5. Execution

---

## 4. Execution Model

- IvritCode is **strictly deterministic**
- No randomness
- No hidden state
- No I/O at the language level
- Each instruction transforms the full state \(S\)

Execution proceeds left-to-right unless redirected by cantillation structure.

---

## 5. Letter Semantics (23-Wide Core)

All semantics below operate on the **entire alphabet**, not a privileged subset.

Arithmetic is always modulo 22.

### א — Alef (Identity)
No operation.

---

### ב — Bet (Pairwise Addition)
For i = 0..10:
- rᵢ₊₁₁ ← rᵢ₊₁₁ + rᵢ

---

### ג — Gimel (Pairwise Multiplication)
For i = 0..10:
- rᵢ₊₁₁ ← rᵢ₊₁₁ · rᵢ

---

### ד — Dalet (Difference Pairs)
For i = 0..10:
- rᵢ ← rᵢ₊₁₁ − rᵢ
- rᵢ₊₁₁ ← rᵢ − rᵢ₊₁₁

---

### ה — Hei (Sign Map)
For all i:
- rᵢ ← sign(rᵢ)
- A ← Σ rᵢ

---

### ו — Vav (Swap Halves)
For i = 0..10:
- swap rᵢ ↔ rᵢ₊₁₁

---

### ז — Zayin (Increment All)
For all i:
- rᵢ ← rᵢ + 1
- A ← A + 22

---

### ח — Chet (Decrement All)
For all i:
- rᵢ ← rᵢ − 1
- A ← A − 22

---

### ט — Tet (Square All)
For all i:
- rᵢ ← rᵢ²
- A ← Σ rᵢ

---

### י — Yod (Broadcast A)
For all i:
- rᵢ ← A

---

### כ — Kaf (Sliding Window Sum)
For all i:
- rᵢ ← rᵢ + rᵢ₊₁ + rᵢ₊₂ + rᵢ₊₃

(indices modulo 22)

---

### ל — Lamed (Global Sum & Recenter)
- A ← Σ rᵢ
- μ ← ⌊A / 22⌋
- rᵢ ← rᵢ − μ

---

### מ — Mem (Moving Average)
For all i:
- rᵢ ← ⌊(rᵢ₋₁ + rᵢ + rᵢ₊₁)/3⌋
- A ← average(rᵢ)

---

### נ — Nun (Global Negation)
For all i:
- rᵢ ← −rᵢ
- A ← −A

---

### ס — Samekh (Rotation by A)
Let k = A mod 22:
- rᵢ ← rᵢ₋ₖ

---

### ע — Ayin (Max Correlation)
For s = 0..10:
- Cₛ = Σ rᵢ · rᵢ₊₁₁₊ₛ
- A ← max(Cₛ)

---

### פ — Pe (Expose Alef)
- A ← r₀
- r₁ ← r₁ + r₀
- r₂₁ ← r₂₁ + r₀

---

### צ — Tsadi (Compare Halves)
- S₁ = Σ r₀..r₁₀
- S₂ = Σ r₁₁..r₂₁
- A ← sign(S₁ − S₂)

Expose max of dominant half to Alef or Tav.

---

### ק — Qof (Mirror)
For all i:
- rᵢ ← r₂₁₋ᵢ + i

---

### ר — Resh (Reseed from A)
Let s = r₁ or 1:
- rᵢ ← A + i·s

---

### ש — Shin (Nonlinear Mix)
Apply quartet mix in blocks of 4 across alphabet.
- A ← max |rᵢ|

---

### ת — Tav (Quartet Rotation)
Rotate each block of 4:
- (a,b,c,d) → (c,d,a,b)

---

## 6. Niqqud — Semantic Modifiers

Niqqud modify **how** a letter operates, never **which** letter operates.

Examples of modifier classes:
- Intensity (repeat / scale)
- Scope (local vs global)
- Source (literal vs derived)
- Purity / polarity

Niqqud do not introduce new operators.

---

## 7. Cantillation — Structural Syntax

Cantillation marks define:
- grouping
- sequencing
- repetition
- conditional flow

They act on **phrases**, not individual letters.

Cantillation never changes arithmetic semantics.

---

## 8. Commentary Layer (Non-Executable)

The commentary layer may include:
- gematria
- symbolic readings
- register visualizations
- narrative explanations

This layer:
- observes execution
- never alters state
- is explicitly non-authoritative

IvritCodeGPT belongs to this layer.

---

## 9. Determinism & Safety

Given identical program text and initial state:
- final state is guaranteed identical.

IvritCode is finite, bounded, and safe to execute.

---

## 10. Versioning

- v1.0 defines the canonical language
- future versions may extend modifiers or syntax
- core letter semantics and base-22 arithmetic are invariant
