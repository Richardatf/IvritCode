// vm.js
// IvritCode v1.0 core VM — attaches to window.IvritVM (no modules).
//
// 23 registers:
//   r[0..21] = Hebrew letters א..ת
//   r[22]    = A (Aleph-Olam, global register)
//
// All arithmetic is performed in Z_22 (0..21).

(function (global) {
  "use strict";

  const HEBREW_LETTERS = "אבגדהוזחטיכלמנסעפצקרשת";
  const N_LETTERS = 22;
  const N_REGS = 23; // 22 letters + A
  const INDEX_A = 22;

  // Map letter → index
  const LETTER_INDEX = {};
  for (let i = 0; i < HEBREW_LETTERS.length; i++) {
    LETTER_INDEX[HEBREW_LETTERS[i]] = i;
  }

  // ----------------- Helpers: Z_22 arithmetic ------------------------------

  function mod22(x) {
    var r = x % 22;
    if (r < 0) r += 22;
    return r;
  }

  // Balanced representative in [-11..10]
  function asBalanced(x) {
    var r = mod22(x);
    return r <= 10 ? r : r - 22;
  }

  // sign in Z22 via balanced rep: -1,0,1
  function signZ22(x) {
    var y = asBalanced(x);
    if (y > 0) return 1;
    if (y < 0) return -1;
    return 0;
  }

  function prevIndex(i) {
    return (i - 1 + N_LETTERS) % N_LETTERS;
  }

  function nextIndex(i) {
    return (i + 1) % N_LETTERS;
  }

  // ----------------- State constructors ------------------------------------

  function createState() {
    // fresh zeroed state
    return new Array(N_REGS).fill(0);
  }

  function cloneState(state) {
    return state.slice();
  }

  // ----------------- Core step: single letter ------------------------------

  function stepLetter(state, letter) {
    if (!LETTER_INDEX.hasOwnProperty(letter)) {
      // not an opcode, no-op
      return state.slice();
    }

    var old = state;
    var next = state.slice();
    var A = old[INDEX_A];

    switch (letter) {
      case "א":
        // Alef — Identity / Frame (no-op)
        return old.slice();

      case "ב":
        // Bet — Pairwise Addition: first half into second half
        for (var i = 0; i <= 10; i++) {
          var j = i + 11;
          next[j] = mod22(old[j] + old[i]);
        }
        return next;

      case "ג":
        // Gimel — Pairwise Multiplication: first half into second half
        for (var i2 = 0; i2 <= 10; i2++) {
          var j2 = i2 + 11;
          next[j2] = mod22(old[j2] * old[i2]);
        }
        return next;

      case "ד":
        // Dalet — Difference pairs between halves
        for (var i3 = 0; i3 <= 10; i3++) {
          var j3 = i3 + 11;
          var x = old[i3];
          var y = old[j3];
          next[i3] = mod22(y - x);
          next[j3] = mod22(x - y);
        }
        return next;

      case "ה":
        // Hei — Sign map, A = sum of signs
        var sumSign = 0;
        for (var i4 = 0; i4 < N_LETTERS; i4++) {
          var s = signZ22(old[i4]);
          // map -1,0,1 into Z22 (21,0,1)
          next[i4] = mod22(s);
          sumSign += s;
        }
        next[INDEX_A] = mod22(sumSign);
        return next;

      case "ו":
        // Vav — Swap halves
        for (var i5 = 0; i5 <= 10; i5++) {
          var j5 = i5 + 11;
          next[i5] = old[j5];
          next[j5] = old[i5];
        }
        return next;

      case "ז":
        // Zayin — Increment all letters, A += 22
        for (var i6 = 0; i6 < N_LETTERS; i6++) {
          next[i6] = mod22(old[i6] + 1);
        }
        next[INDEX_A] = mod22(A + N_LETTERS); // +22 -> 0, but kept for spec clarity
        return next;

      case "ח":
        // Chet — Decrement all letters, A -= 22
        for (var i7 = 0; i7 < N_LETTERS; i7++) {
          next[i7] = mod22(old[i7] - 1);
        }
        next[INDEX_A] = mod22(A - N_LETTERS);
        return next;

      case "ט":
        // Tet — Square all letters, A = sum of squares
        var sumSq = 0;
        for (var i8 = 0; i8 < N_LETTERS; i8++) {
          var sq = old[i8] * old[i8];
          var v = mod22(sq);
          next[i8] = v;
          sumSq += sq;
        }
        next[INDEX_A] = mod22(sumSq);
        return next;

      case "י":
        // Yod — Broadcast A into all letter registers
        for (var i9 = 0; i9 < N_LETTERS; i9++) {
          next[i9] = A;
        }
        return next;

      case "כ":
        // Kaf — Sliding window sum of 4
        for (var i10 = 0; i10 < N_LETTERS; i10++) {
          var a = old[i10];
          var b = old[nextIndex(i10)];
          var c = old[nextIndex(nextIndex(i10))];
          var d = old[nextIndex(nextIndex(nextIndex(i10)))];
          next[i10] = mod22(a + b + c + d);
        }
        return next;

      case "ל":
        // Lamed — Global sum & recenter
        var S = 0;
        for (var i11 = 0; i11 < N_LETTERS; i11++) {
          S += asBalanced(old[i11]);
        }
        next[INDEX_A] = mod22(S);
        var mu = Math.trunc(S / N_LETTERS);
        for (var i12 = 0; i12 < N_LETTERS; i12++) {
          next[i12] = mod22(asBalanced(old[i12]) - mu);
        }
        return next;

      case "מ":
        // Mem — Moving average (3-point), A = average of smoothed field
        var sumSmooth = 0;
        for (var i13 = 0; i13 < N_LETTERS; i13++) {
          var prev = asBalanced(old[prevIndex(i13)]);
          var curr = asBalanced(old[i13]);
          var nxt = asBalanced(old[nextIndex(i13)]);
          var mean = Math.trunc((prev + curr + nxt) / 3);
          next[i13] = mod22(mean);
          sumSmooth += mean;
        }
        var avg = Math.trunc(sumSmooth / N_LETTERS);
        next[INDEX_A] = mod22(avg);
        return next;

      case "נ":
        // Nun — Global negation (letters & A)
        for (var i14 = 0; i14 < N_LETTERS; i14++) {
          next[i14] = mod22(-asBalanced(old[i14]));
        }
        next[INDEX_A] = mod22(-asBalanced(A));
        return next;

      case "ס":
        // Samekh — Rotation by A
        var kRaw = asBalanced(A);
        var k = ((kRaw % N_LETTERS) + N_LETTERS) % N_LETTERS;
        for (var i15 = 0; i15 < N_LETTERS; i15++) {
          var from = (i15 - k + N_LETTERS) % N_LETTERS;
          next[i15] = old[from];
        }
        return next;

      case "ע":
        // Ayin — Max correlation between halves under shifts 0..10 → A
        var maxC = null;
        for (var s = 0; s <= 10; s++) {
          var C = 0;
          for (var i16 = 0; i16 <= 10; i16++) {
            var left = asBalanced(old[i16]);
            var right = asBalanced(old[(i16 + 11 + s) % N_LETTERS]);
            C += left * right;
          }
          if (maxC === null || C > maxC) maxC = C;
        }
        for (var i17 = 0; i17 < N_LETTERS; i17++) {
          next[i17] = old[i17];
        }
        next[INDEX_A] = mod22(maxC == null ? 0 : maxC);
        return next;

      case "פ":
        // Pe — Expose Alef locally & globally
        var alef = old[0];
        for (var i18 = 0; i18 < N_LETTERS; i18++) {
          next[i18] = old[i18];
        }
        next[INDEX_A] = alef;
        next[1] = mod22(old[1] + alef);
        next[21] = mod22(old[21] + alef);
        return next;

      case "צ":
        // Tsadi — Compare halves, expose extremes
        var S1 = 0;
        var S2 = 0;
        for (var i19 = 0; i19 <= 10; i19++) {
          S1 += asBalanced(old[i19]);
        }
        for (var j19 = 11; j19 <= 21; j19++) {
          S2 += asBalanced(old[j19]);
        }

        var Anew = 0;
        if (S1 > S2) Anew = 1;
        else if (S1 < S2) Anew = -1;
        next[INDEX_A] = mod22(Anew);

        // Copy letters by default
        for (var i20 = 0; i20 < N_LETTERS; i20++) {
          next[i20] = old[i20];
        }

        if (S1 > S2) {
          var max1 = asBalanced(old[0]);
          for (var i21 = 1; i21 <= 10; i21++) {
            var v1 = asBalanced(old[i21]);
            if (v1 > max1) max1 = v1;
          }
          next[0] = mod22(max1);
        } else if (S1 < S2) {
          var max2 = asBalanced(old[11]);
          for (var i22 = 12; i22 <= 21; i22++) {
            var v2 = asBalanced(old[i22]);
            if (v2 > max2) max2 = v2;
          }
          next[21] = mod22(max2);
        }
        return next;

      case "ק":
        // Qof — Mirror & tilt
        for (var i23 = 0; i23 < N_LETTERS; i23++) {
          var mirrored = old[N_LETTERS - 1 - i23];
          next[i23] = mod22(mirrored + i23);
        }
        return next;

      case "ר":
        // Resh — Reseed from A with stride from Bet (or 1)
        var strideRaw = asBalanced(old[1]);
        var stride = strideRaw === 0 ? 1 : strideRaw;
        for (var i24 = 0; i24 < N_LETTERS; i24++) {
          var val = asBalanced(A) + i24 * stride;
          next[i24] = mod22(val);
        }
        return next;

      case "ש":
        // Shin — Nonlinear mix in blocks of 4, A = max |r[i]|
        for (var base = 0; base < N_LETTERS; base += 4) {
          var i0 = base % N_LETTERS;
          var i1b = (base + 1) % N_LETTERS;
          var i2b = (base + 2) % N_LETTERS;
          var i3b = (base + 3) % N_LETTERS;

          var a0 = asBalanced(old[i0]);
          var b0 = asBalanced(old[i1b]);
          var g0 = asBalanced(old[i2b]);
          var d0 = asBalanced(old[i3b]);

          next[i0] = mod22(a0 * a0 + b0);
          next[i1b] = mod22(b0 * b0 + g0);
          next[i2b] = mod22(g0 * g0 + d0);
          next[i3b] = mod22(d0 * d0 + a0);
        }

        var maxAbs = 0;
        for (var i25 = 0; i25 < N_LETTERS; i25++) {
          var v = Math.abs(asBalanced(next[i25]));
          if (v > maxAbs) maxAbs = v;
        }
        next[INDEX_A] = mod22(maxAbs);
        return next;

      case "ת":
        // Tav — Quartet rotation in blocks of 4
        for (var base2 = 0; base2 < N_LETTERS; base2 += 4) {
          var j0 = base2 % N_LETTERS;
          var j1b = (base2 + 1) % N_LETTERS;
          var j2b = (base2 + 2) % N_LETTERS;
          var j3b = (base2 + 3) % N_LETTERS;

          var aa = old[j0];
          var bb = old[j1b];
          var cc = old[j2b];
          var dd = old[j3b];

          next[j0] = cc;
          next[j1b] = dd;
          next[j2b] = aa;
          next[j3b] = bb;
        }
        return next;

      default:
        // Should not happen
        return old.slice();
    }
  }

  // ----------------- Program helpers ---------------------------------------

  function extractProgramLetters(source) {
    var out = [];
    for (var i = 0; i < source.length; i++) {
      var ch = source[i];
      if (LETTER_INDEX.hasOwnProperty(ch)) out.push(ch);
    }
    return out;
  }

  // Step trace structure:
  // { index, letter, before, after }
  function runProgram(initialState, programText, maxSteps) {
    if (typeof maxSteps !== "number" || maxSteps <= 0) {
      maxSteps = 1000;
    }

    var instructions = extractProgramLetters(programText || "");
    var trace = [];
    var current = cloneState(initialState);

    var steps = Math.min(instructions.length, maxSteps);
    for (var i = 0; i < steps; i++) {
      var letter = instructions[i];
      var before = cloneState(current);
      var after = stepLetter(current, letter);
      trace.push({
        index: i,
        letter: letter,
        before: before,
        after: after
      });
      current = after;
    }

    return {
      finalState: current,
      trace: trace,
      instructions: instructions
    };
  }

  // Convenience wrapper: IvritVM.run(programText, { initialState, maxSteps })
  function run(programText, opts) {
    opts = opts || {};
    var initial =
      opts.initialState && Array.isArray(opts.initialState)
        ? opts.initialState
        : createState();
    var maxSteps = typeof opts.maxSteps === "number" ? opts.maxSteps : 1000;
    return runProgram(initial, programText || "", maxSteps);
  }

  // ----------------- Export on global --------------------------------------

  global.IvritVM = {
    LETTERS: HEBREW_LETTERS.split(""),
    N_LETTERS: N_LETTERS,
    N_REGS: N_REGS,
    INDEX_A: INDEX_A,

    createState: createState,
    cloneState: cloneState,
    stepLetter: stepLetter,
    extractProgramLetters: extractProgramLetters,
    runProgram: runProgram,
    run: run
  };
})(typeof window !== "undefined" ? window : this);
