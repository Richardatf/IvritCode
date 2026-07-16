// src/vm.ts
//
// IvritCode VM — v1.0 core
// 23 registers (22 letters א–ת + Aleph-Olam A), base-22 arithmetic (0..21).
// Letters act as 23-wide operators on the full state, no privileged quartet.
//
// This file intentionally does NOT handle niqqud or trop yet; it only
// implements the base letter semantics for pure letter programs.

export const N_LETTERS = 22;
export const N_REGS = 23; // 22 letters + A

// Hebrew letters in register / operator order
export const LETTERS = "אבגדהוזחטיכלמנסעפצקרשת".split("");

// Map from letter -> index (0..21)
const LETTER_INDEX = new Map<string, number>(
  LETTERS.map((ch, idx) => [ch, idx])
);

// Index of Aleph-Olam (A) in the state vector
export const INDEX_A = 22;

// State type: fixed-length vector of length 23
export type State = number[];

/**
 * Normalize a raw integer into Z_22 (0..21).
 */
function mod22(x: number): number {
  let r = x % 22;
  if (r < 0) r += 22;
  return r;
}

/**
 * Balanced representative for "sign" semantics:
 * interpret elements of Z22 as integers in [-11..10].
 * e.g., 0..10 stay 0..10, 11..21 map to -11..-1.
 */
function asBalanced(x: number): number {
  const r = mod22(x);
  return r <= 10 ? r : r - 22;
}

/**
 * sign on Z22 via balanced representative.
 * sign(0) = 0; sign(positive) = 1; sign(negative) = -1.
 */
function signZ22(x: number): number {
  const y = asBalanced(x);
  if (y > 0) return 1;
  if (y < 0) return -1;
  return 0;
}

function prevIndex(i: number): number {
  return (i - 1 + N_LETTERS) % N_LETTERS;
}

function nextIndex(i: number): number {
  return (i + 1) % N_LETTERS;
}

/**
 * Create a fresh zeroed state: all registers = 0.
 */
export function makeZeroState(): State {
  return new Array(N_REGS).fill(0);
}

/**
 * Clone a state.
 */
export function cloneState(state: State): State {
  return state.slice();
}

/**
 * Apply a single IvritCode letter to a state, returning a NEW state.
 * If the character is not a recognized IvritCode letter, the state is returned unchanged.
 *
 * All arithmetic is performed in Z_22 (mod 22).
 */
export function stepLetter(state: State, letter: string): State {
  if (!LETTER_INDEX.has(letter)) {
    // Not an IvritCode opcode, no-op
    return state.slice();
  }

  const idx = LETTER_INDEX.get(letter)!;
  const old = state;
  const next = state.slice(); // we'll overwrite positions as needed

  const A = old[INDEX_A];

  switch (letter) {
    case "א": {
      // Alef — Identity / Frame (no-op on full state)
      return old.slice();
    }

    case "ב": {
      // Bet — Pairwise Addition: first half into second half
      for (let i = 0; i <= 10; i++) {
        const j = i + 11;
        next[j] = mod22(old[j] + old[i]);
      }
      return next;
    }

    case "ג": {
      // Gimel — Pairwise Multiplication: first half into second half
      for (let i = 0; i <= 10; i++) {
        const j = i + 11;
        next[j] = mod22(old[j] * old[i]);
      }
      return next;
    }

    case "ד": {
      // Dalet — Difference pairs between halves
      for (let i = 0; i <= 10; i++) {
        const j = i + 11;
        const x = old[i];
        const y = old[j];
        next[i] = mod22(y - x);
        next[j] = mod22(x - y);
      }
      return next;
    }

    case "ה": {
      // Hei — Sign map across all letter registers, A = sum of signs
      let sumSign = 0;
      for (let i = 0; i < N_LETTERS; i++) {
        const s = signZ22(old[i]);
        next[i] = mod22(s); // sign is -1,0,1 mapped to 21,0,1 in Z22
        sumSign += s;
      }
      next[INDEX_A] = mod22(sumSign);
      return next;
    }

    case "ו": {
      // Vav — Swap halves: r[i] ↔ r[i+11] for i=0..10
      for (let i = 0; i <= 10; i++) {
        const j = i + 11;
        next[i] = old[j];
        next[j] = old[i];
      }
      return next;
    }

    case "ז": {
      // Zayin — Increment all letter registers, A += 22
      for (let i = 0; i < N_LETTERS; i++) {
        next[i] = mod22(old[i] + 1);
      }
      next[INDEX_A] = mod22(A + N_LETTERS); // +22 -> 0 in Z22, but keep spec
      return next;
    }

    case "ח": {
      // Chet — Decrement all letter registers, A -= 22
      for (let i = 0; i < N_LETTERS; i++) {
        next[i] = mod22(old[i] - 1);
      }
      next[INDEX_A] = mod22(A - N_LETTERS);
      return next;
    }

    case "ט": {
      // Tet — Square all letters, A = sum of squares
      let sumSq = 0;
      for (let i = 0; i < N_LETTERS; i++) {
        const sq = old[i] * old[i];
        const v = mod22(sq);
        next[i] = v;
        sumSq += sq;
      }
      next[INDEX_A] = mod22(sumSq);
      return next;
    }

    case "י": {
      // Yod — Broadcast A into all letter registers
      for (let i = 0; i < N_LETTERS; i++) {
        next[i] = A;
      }
      // A unchanged
      return next;
    }

    case "כ": {
      // Kaf — Sliding window sum of 4 (self + next3)
      for (let i = 0; i < N_LETTERS; i++) {
        const a = old[i];
        const b = old[nextIndex(i)];
        const c = old[nextIndex(nextIndex(i))];
        const d = old[nextIndex(nextIndex(nextIndex(i)))];
        next[i] = mod22(a + b + c + d);
      }
      // A unchanged (base semantics)
      return next;
    }

    case "ל": {
      // Lamed — Global sum & recenter
      let S = 0;
      for (let i = 0; i < N_LETTERS; i++) {
        // Use balanced rep for sum, then reduce at the end
        S += asBalanced(old[i]);
      }
      // A gets sum mod 22
      next[INDEX_A] = mod22(S);
      const mu = Math.trunc(S / N_LETTERS); // integer mean in Z sense
      for (let i = 0; i < N_LETTERS; i++) {
        next[i] = mod22(asBalanced(old[i]) - mu);
      }
      return next;
    }

    case "מ": {
      // Mem — Moving average (3-point), A = average of smoothed letters
      let sumSmooth = 0;
      for (let i = 0; i < N_LETTERS; i++) {
        const prev = asBalanced(old[prevIndex(i)]);
        const curr = asBalanced(old[i]);
        const nxt = asBalanced(old[nextIndex(i)]);
        const mean = Math.trunc((prev + curr + nxt) / 3);
        next[i] = mod22(mean);
        sumSmooth += mean;
      }
      const avg = Math.trunc(sumSmooth / N_LETTERS);
      next[INDEX_A] = mod22(avg);
      return next;
    }

    case "נ": {
      // Nun — Global negation (letters and A)
      for (let i = 0; i < N_LETTERS; i++) {
        next[i] = mod22(-asBalanced(old[i]));
      }
      next[INDEX_A] = mod22(-asBalanced(A));
      return next;
    }

    case "ס": {
      // Samekh — Rotation by A
      const kRaw = asBalanced(A); // rotation amount from balanced A
      const k = ((kRaw % N_LETTERS) + N_LETTERS) % N_LETTERS;
      for (let i = 0; i < N_LETTERS; i++) {
        const from = (i - k + N_LETTERS) % N_LETTERS;
        next[i] = old[from];
      }
      // A unchanged
      return next;
    }

    case "ע": {
      // Ayin — Max correlation between halves under shifts 0..10
      let maxC = asBalanced(old[0]) * asBalanced(old[11]); // seed
      for (let s = 0; s <= 10; s++) {
        let C = 0;
        for (let i = 0; i <= 10; i++) {
          const left = asBalanced(old[i]);
          const right = asBalanced(
            old[(i + 11 + s) % N_LETTERS]
          );
          C += left * right;
        }
        if (s === 0 || C > maxC) {
          maxC = C;
        }
      }
      // Letters unchanged
      for (let i = 0; i < N_LETTERS; i++) {
        next[i] = old[i];
      }
      next[INDEX_A] = mod22(maxC);
      return next;
    }

    case "פ": {
      // Pe — Expose Alef (r[0]) into A and neighbors
      const alef = old[0];
      for (let i = 0; i < N_LETTERS; i++) {
        next[i] = old[i];
      }
      next[INDEX_A] = alef;
      // Bet (1) and Tav (21) receive from Alef
      next[1] = mod22(old[1] + alef);
      next[21] = mod22(old[21] + alef);
      return next;
    }

    case "צ": {
      // Tsadi — Compare halves, expose extreme
      let S1 = 0;
      let S2 = 0;
      for (let i = 0; i <= 10; i++) {
        S1 += asBalanced(old[i]);
      }
      for (let i = 11; i <= 21; i++) {
        S2 += asBalanced(old[i]);
      }

      let Anew = 0;
      if (S1 > S2) Anew = 1;
      else if (S1 < S2) Anew = -1;
      else Anew = 0;
      next[INDEX_A] = mod22(Anew);

      // Copy letters by default
      for (let i = 0; i < N_LETTERS; i++) {
        next[i] = old[i];
      }

      if (S1 > S2) {
        // First half dominates: expose max of first half at Alef (0)
        let maxVal = asBalanced(old[0]);
        for (let i = 1; i <= 10; i++) {
          const v = asBalanced(old[i]);
          if (v > maxVal) maxVal = v;
        }
        next[0] = mod22(maxVal);
      } else if (S1 < S2) {
        // Second half dominates: expose max of second half at Tav (21)
        let maxVal = asBalanced(old[11]);
        for (let i = 12; i <= 21; i++) {
          const v = asBalanced(old[i]);
          if (v > maxVal) maxVal = v;
        }
        next[21] = mod22(maxVal);
      }
      return next;
    }

    case "ק": {
      // Qof — Mirror & tilt
      for (let i = 0; i < N_LETTERS; i++) {
        const mirrored = old[N_LETTERS - 1 - i];
        next[i] = mod22(mirrored + i);
      }
      // A unchanged
      return next;
    }

    case "ר": {
      // Resh — Reseed from A with stride taken from Bet (r[1]) or 1
      const strideRaw = asBalanced(old[1]);
      const stride = strideRaw === 0 ? 1 : strideRaw;
      for (let i = 0; i < N_LETTERS; i++) {
        const val = asBalanced(A) + i * stride;
        next[i] = mod22(val);
      }
      // A unchanged
      return next;
    }

    case "ש": {
      // Shin — Nonlinear mix over alphabet in blocks of 4
      // We'll read from `old` and write into `next` block-wise
      // Blocks: 0,4,8,12,16,20 (indices mod 22)
      // (a,b,g,d) => (a^2 + b, b^2 + g, g^2 + d, d^2 + a)
      for (let base = 0; base < N_LETTERS; base += 4) {
        const i0 = base % N_LETTERS;
        const i1 = (base + 1) % N_LETTERS;
        const i2 = (base + 2) % N_LETTERS;
        const i3 = (base + 3) % N_LETTERS;

        const a = asBalanced(old[i0]);
        const b = asBalanced(old[i1]);
        const g = asBalanced(old[i2]);
        const d = asBalanced(old[i3]);

        next[i0] = mod22(a * a + b);
        next[i1] = mod22(b * b + g);
        next[i2] = mod22(g * g + d);
        next[i3] = mod22(d * d + a);
      }

      // Compute max |r[i]| after mixing for A
      let maxAbs = 0;
      for (let i = 0; i < N_LETTERS; i++) {
        const v = asBalanced(next[i]);
        const abs = Math.abs(v);
        if (abs > maxAbs) maxAbs = abs;
      }
      next[INDEX_A] = mod22(maxAbs);
      return next;
    }

    case "ת": {
      // Tav — Quartet rotation over alphabet in blocks of 4
      // (a,b,c,d) => (c,d,a,b)
      for (let base = 0; base < N_LETTERS; base += 4) {
        const i0 = base % N_LETTERS;
        const i1 = (base + 1) % N_LETTERS;
        const i2 = (base + 2) % N_LETTERS;
        const i3 = (base + 3) % N_LETTERS;

        const a = old[i0];
        const b = old[i1];
        const c = old[i2];
        const d = old[i3];

        next[i0] = c;
        next[i1] = d;
        next[i2] = a;
        next[i3] = b;
      }
      // A unchanged
      return next;
    }

    default: {
      // Unknown letter (should not happen because of initial check)
      return old.slice();
    }
  }
}

/**
 * Extract only IvritCode letters (א–ת) from a string.
 */
export function extractProgramLetters(source: string): string[] {
  const out: string[] = [];
  for (const ch of source) {
    if (LETTER_INDEX.has(ch)) {
      out.push(ch);
    }
  }
  return out;
}

/**
 * Run a program (string) on an initial state.
 *
 * Returns final state plus an execution trace:
 * each step contains the letter, index, before, and after.
 */
export interface StepTrace {
  index: number;
  letter: string;
  before: State;
  after: State;
}

export interface RunResult {
  finalState: State;
  trace: StepTrace[];
  instructions: string[];
}

export function runProgram(
  initial: State,
  programText: string,
  maxSteps: number = 1000
): RunResult {
  const instructions = extractProgramLetters(programText);
  const trace: StepTrace[] = [];

  let current = cloneState(initial);
  const steps = Math.min(instructions.length, maxSteps);

  for (let i = 0; i < steps; i++) {
    const letter = instructions[i];
    const before = cloneState(current);
    const after = stepLetter(current, letter);
    trace.push({ index: i, letter, before, after });
    current = after;
  }

  return {
    finalState: current,
    trace,
    instructions
  };
}
