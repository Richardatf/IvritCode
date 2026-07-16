// src/tokenizer.ts

export type Token =
  | { kind: "label"; name: string }
  | { kind: "instr"; op: string; args: string[] };

export function tokenize(source: string): Token[] {
  const lines = source.split(/\r?\n/);
  const tokens: Token[] = [];

  for (const rawLine of lines) {
    // strip comments starting with ; or #
    const line = rawLine.split(";")[0].split("#")[0].trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts.length === 0) continue;

    // label: "loop:"
    if (parts[0].endsWith(":")) {
      const name = parts[0].slice(0, -1);
      if (!name) continue;
      tokens.push({ kind: "label", name });
      if (parts.length > 1) {
        // label + instruction on same line, e.g. "loop: PUSH 1"
        const op = parts[1].toUpperCase();
        const args = parts.slice(2);
        tokens.push({ kind: "instr", op, args });
      }
      continue;
    }

    const op = parts[0].toUpperCase();
    const args = parts.slice(1);
    tokens.push({ kind: "instr", op, args });
  }

  return tokens;
}
