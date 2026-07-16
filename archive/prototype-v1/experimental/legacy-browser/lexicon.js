// src/lexicon.js
//
// IvritLexicon helper for IvritCode.
//
// Responsibilities:
//  - Load a Hebrew lexicon JSON once (with caching).
//  - Compute letter salience from a finished IvritCode run.
//  - Select Hebrew words and roots that resonate with the run.
//  - Return a structured result for UI and/or IvritCodeGPT.
//
// Usage (from index.html or other UI code):
//   await IvritLexicon.loadLexicon();
//   const selection = IvritLexicon.selectWordsForState({
//     letters: VM.LETTERS,
//     finalState,
//     instructions,
//     aIndex: VM.INDEX_A,
//     maxWords: 12
//   });
//
//   selection.words  // array of { word, score, entry }
//   selection.roots  // array of { root, score, words: [...] }

(function () {
  const LEXICON_URL = "./src/data/hebrew-lexicon.json";

  let _lexicon = null;      // full JSON
  let _entries = null;      // entries map
  let _isLoading = false;
  let _loadPromise = null;

  // Standard mispar-hechrechi gematria, used for program gematria comparison.
  const GEMATRIA = {
    "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5,
    "ו": 6, "ז": 7, "ח": 8, "ט": 9, "י": 10,
    "כ": 20, "ך": 20, "ל": 30, "מ": 40, "ם": 40,
    "נ": 50, "ן": 50, "ס": 60, "ע": 70, "פ": 80,
    "ף": 80, "צ": 90, "ץ": 90, "ק": 100, "ר": 200,
    "ש": 300, "ת": 400
  };

  /**
   * Load the lexicon JSON from disk (once) and cache it.
   * Returns a promise that resolves to the full lexicon object.
   */
  async function loadLexicon(url) {
    if (_lexicon && _entries) return _lexicon;

    if (_isLoading && _loadPromise) {
      return _loadPromise;
    }

    _isLoading = true;
    _loadPromise = (async () => {
      const resolvedUrl = url || LEXICON_URL;
      const res = await fetch(resolvedUrl);
      if (!res.ok) {
        throw new Error("Failed to load lexicon JSON: " + res.status);
      }
      const data = await res.json();
      _lexicon = data || {};
      _entries = (_lexicon && _lexicon.entries) || {};
      return _lexicon;
    })();

    try {
      return await _loadPromise;
    } finally {
      _isLoading = false;
    }
  }

  /**
   * Compute program gematria from executed letters (א–ת only).
   */
  function computeProgramGematria(instructions) {
    let total = 0;
    for (const ch of instructions || []) {
      total += GEMATRIA[ch] || 0;
    }
    return total;
  }

  /**
   * Build letter salience based on finalState and instructions.
   *
   * - letters: array of 22 Hebrew letters in register index order.
   * - finalState: numeric array of length >= 23 (0..21 letters, 22 = A).
   * - instructions: array of executed letters.
   *
   * Returns: Map letter -> salience in [0, 1].
   */
  function computeLetterSalience({ letters, finalState, instructions }) {
    const instrCounts = new Map();
    for (const ch of instructions || []) {
      instrCounts.set(ch, (instrCounts.get(ch) || 0) + 1);
    }

    const rawSalience = new Map();
    let maxVal = 0;

    letters.forEach((letter, i) => {
      const base = Number(finalState[i] || 0);  // 0..21
      const count = instrCounts.get(letter) || 0;
      // Weighting: numeric state + 2 * usage count
      const s = base + 2 * count;
      rawSalience.set(letter, s);
      if (s > maxVal) maxVal = s;
    });

    const salience = new Map();
    if (maxVal <= 0) {
      // All zero — return zeros
      letters.forEach(letter => salience.set(letter, 0));
      return salience;
    }

    // Normalize to [0,1]
    letters.forEach(letter => {
      const s = rawSalience.get(letter) || 0;
      salience.set(letter, s / maxVal);
    });

    return salience;
  }

  /**
   * Core scoring for a single word entry.
   *
   * Inputs:
   *  - entry: the lexicon entry for the word.
   *  - word: the word string.
   *  - salience: Map(letter -> salience [0,1]).
   *  - programGematria: number (gematria of executed letters).
   *
   * Output:
   *  - score: numeric (higher == stronger resonance).
   *  - components: optional debug breakdown.
   */
  function scoreWord(entry, word, salience, programGematria) {
    const letters = Array.from(word);
    if (letters.length === 0) return { score: 0, components: null };

    // Coverage: average salience of the letters that appear in the word.
    let sumSalience = 0;
    let countSalience = 0;
    letters.forEach(ch => {
      if (salience.has(ch)) {
        sumSalience += salience.get(ch) || 0;
        countSalience += 1;
      }
    });
    if (countSalience === 0) {
      return { score: 0, components: null };
    }
    const coverage = sumSalience / countSalience;  // [0,1]

    // Gematria resonance: closer gematria to programGematria = higher score.
    const wordGem = typeof entry.gematria === "number" ? entry.gematria : 0;
    const deltaGem = Math.abs(wordGem - programGematria);
    // Simple soft scoring: 1 / (1 + delta/scale)
    const scale = 100; // adjust as needed
    const gemScore = 1 / (1 + deltaGem / scale); // ~1 when close, decays as delta grows

    // Frequency (if present): 1..5 → normalize to [0,1]
    const freqRaw = typeof entry.frequency === "number" ? entry.frequency : 3;
    const freqScore = Math.min(Math.max(freqRaw, 1), 5) / 5;

    // Combine with weights (tune as desired).
    const wCoverage = 0.6;
    const wGem = 0.25;
    const wFreq = 0.15;

    const score =
      wCoverage * coverage +
      wGem * gemScore +
      wFreq * freqScore;

    return {
      score,
      components: {
        coverage,
        gemScore,
        freqScore,
        wordGem,
        deltaGem
      }
    };
  }

  /**
   * Select words and roots that resonate with the current engine run.
   *
   * options = {
   *   letters: string[]      // Hebrew letters in register order (VM.LETTERS)
   *   finalState: number[]   // length >= 23
   *   instructions: string[] // executed letters
   *   aIndex?: number        // index of A in finalState (not strictly needed)
   *   maxWords?: number      // how many words to return
   * }
   *
   * Returns:
   * {
   *   words: [
   *     {
   *       word: string,
   *       score: number,
   *       entry: {...},          // original lexicon entry
   *       components: {...}      // breakdown: coverage, gemScore, etc.
   *     },
   *     ...
   *   ],
   *   roots: [
   *     {
   *       root: string,
   *       score: number,
   *       words: string[]        // words carrying this root in the selection
   *     },
   *     ...
   *   ],
   *   programGematria: number
   * }
   */
  function selectWordsForState(options) {
    if (!_entries) {
      console.warn(
        "IvritLexicon: selectWordsForState called before loadLexicon(). Returning empty selection."
      );
      return {
        words: [],
        roots: [],
        programGematria: 0
      };
    }

    const {
      letters,
      finalState,
      instructions,
      aIndex = 22,
      maxWords = 12
    } = options || {};

    if (!Array.isArray(letters) || letters.length === 0) {
      return { words: [], roots: [], programGematria: 0 };
    }
    if (!Array.isArray(finalState) || finalState.length === 0) {
      return { words: [], roots: [], programGematria: 0 };
    }

    const programGematria = computeProgramGematria(instructions || []);
    const salience = computeLetterSalience({
      letters,
      finalState,
      instructions: instructions || []
    });

    const scoredWords = [];

    for (const [word, entry] of Object.entries(_entries)) {
      const { score, components } = scoreWord(
        entry,
        word,
        salience,
        programGematria
      );
      if (score > 0) {
        scoredWords.push({ word, score, entry, components });
      }
    }

    scoredWords.sort((a, b) => b.score - a.score);
    const selectedWords = scoredWords.slice(0, maxWords);

    // Aggregate by root
    const rootMap = new Map();
    selectedWords.forEach(w => {
      const root = w.entry.root || w.word;
      const prev = rootMap.get(root) || { root, score: 0, words: [] };
      prev.score += w.score;
      if (!prev.words.includes(w.word)) {
        prev.words.push(w.word);
      }
      rootMap.set(root, prev);
    });

    const roots = Array.from(rootMap.values());
    roots.sort((a, b) => b.score - a.score);

    return {
      words: selectedWords,
      roots,
      programGematria
    };
  }

  // Expose as global
  window.IvritLexicon = {
    loadLexicon,
    selectWordsForState
  };
})();
