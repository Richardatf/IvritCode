# Unicode

Parsing uses NFD internally and iterates code points, not raw UTF-16 indices. Diagnostics retain raw marked text plus line, column, code-point offset, and UTF-16 offset. Final forms normalize to canonical operator letters while `originalLetter` preserves the source. Detached or unknown Hebrew marks produce `UnicodeSequenceError` in strict Unicode mode.
