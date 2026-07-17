import {
  HEBREW_LETTERS,
  IVRIT_LANGUAGE_SPEC,
  IVRIT_SPEC_VERSION,
  contentHash,
  metadata,
  type IvritInstruction,
  type QECProgram,
  type Token,
} from "@qec/spec";
export interface QECIRInstruction {
  readonly operation: "add_int" | "legacy_opcode";
  readonly opcode: string;
  readonly register?: string;
  readonly value?: number;
}
export interface Compilation {
  readonly program: QECProgram;
  readonly ir: readonly QECIRInstruction[];
  readonly pythonAst: readonly Record<string, unknown>[];
  readonly pythonSource: string;
  readonly diagnostics: readonly string[];
}
const finalForms: Readonly<Record<string, string>> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const codePoints = (text: string) =>
  [...text].map((item) => `U+${item.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`);
export const tokenize = (source: string): readonly Token[] => {
  const tokens: Token[] = [];
  const modifierMarks = new Set(
    IVRIT_LANGUAGE_SPEC.modifiers.flatMap((item) =>
      [...item.mark].filter((mark) => /\p{M}/u.test(mark)),
    ),
  );
  const controlMarks = new Set(IVRIT_LANGUAGE_SPEC.controlMarks.map((item) => item.mark));
  const pattern =
    /#[^\n]*|"(?:\\.|[^"\\])*"|\$r(?:[1-9]|1\d|2[0-2])|-?\d+\.\d+|-?\d+|,|\n|[A-Za-z_][A-Za-z0-9_]*|[\u05D0-\u05EA]|[\u0591-\u05C7]/gu;
  for (const match of source.matchAll(pattern)) {
    const text = match[0],
      normalized = text.normalize("NFD"),
      start = match.index;
    const kind: Token["kind"] = text.startsWith("#")
      ? "comment"
      : text.startsWith("$r")
        ? "register"
        : text === ","
          ? "comma"
          : text === "\n"
            ? "newline"
            : /^-?\d+$/.test(text)
              ? "integer"
              : /^-?\d+\.\d+$/.test(text)
                ? "float"
                : text.startsWith('"')
                  ? "string"
                  : modifierMarks.has(text)
                    ? "modifier"
                    : controlMarks.has(text)
                      ? "control"
                      : /^[\u05D0-\u05EA]$/u.test(text)
                        ? "letter"
                        : "identifier";
    tokens.push({
      kind,
      text,
      normalized,
      start,
      end: start + text.length,
      codePoints: codePoints(text),
    });
  }
  return tokens;
};
export const compileIvrit = (source: string): Compilation => {
  const tokens = tokenize(source),
    diagnostics: string[] = [],
    instructions: IvritInstruction[] = [],
    ir: QECIRInstruction[] = [];
  for (const token of tokens) {
    if (token.kind === "identifier" && /[\u0591-\u05C7]/u.test(token.text))
      diagnostics.push(
        `Unsupported Hebrew mark ${token.codePoints.join(" ")} at [${token.start},${token.end}). Remove it or choose a mark defined by ${IVRIT_SPEC_VERSION}.`,
      );
  }
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]!;
    if (token.kind !== "letter") continue;
    const base = [...token.normalized][0]!,
      opcode = (finalForms[base] ?? base) as (typeof HEBREW_LETTERS)[number];
    if (!HEBREW_LETTERS.includes(opcode)) {
      diagnostics.push(`Unsupported opcode at ${token.start}.`);
      continue;
    }
    const opcodeDefinition = IVRIT_LANGUAGE_SPEC.opcodes.find((item) => item.letter === opcode)!;
    let cursor = index + 1;
    const modifierTokens: Token[] = [];
    while (tokens[cursor]?.kind === "modifier") modifierTokens.push(tokens[cursor++]!);
    if (modifierTokens.length > 1)
      diagnostics.push(
        `Ambiguous modifier sequence ${modifierTokens.map((item) => item.text).join("")} (${modifierTokens.flatMap((item) => item.codePoints).join(" ")}) at [${modifierTokens[0]!.start},${modifierTokens.at(-1)!.end}). IvritCode 0.1 accepts one typed modifier per opcode.`,
      );
    const originalModifierOrder = modifierTokens.map((item) => item.text).join("");
    if (originalModifierOrder && originalModifierOrder !== originalModifierOrder.normalize("NFD"))
      diagnostics.push(
        `Reordered combining marks at ${modifierTokens[0]!.start}; expected canonical order ${codePoints(originalModifierOrder.normalize("NFD")).join(" ")}.`,
      );
    if (new Set(modifierTokens.map((item) => item.text)).size !== modifierTokens.length)
      diagnostics.push(
        `Duplicate modifier on ${token.text} at ${token.start}: ${modifierTokens.flatMap((item) => item.codePoints).join(" ")}.`,
      );
    const modifierDefinition = modifierTokens.length
      ? IVRIT_LANGUAGE_SPEC.modifiers.find((item) => item.mark === modifierTokens[0]!.text)
      : IVRIT_LANGUAGE_SPEC.modifiers[0]!;
    if (!modifierDefinition)
      diagnostics.push(
        `Unknown modifier ${modifierTokens[0]?.codePoints.join(" ")} at ${modifierTokens[0]?.start}.`,
      );
    const register = tokens[cursor],
      comma = tokens[cursor + 1],
      integer = tokens[cursor + 2];
    const controls = tokens
      .filter(
        (item) =>
          item.kind === "control" &&
          item.start >= token.start &&
          item.start <
            (tokens.find((item) => item.kind === "newline" && item.start > token.start)?.start ??
              source.length),
      )
      .map((item) => {
        const definition = IVRIT_LANGUAGE_SPEC.controlMarks.find(
          (entry) => entry.mark === item.text,
        )!;
        return { name: definition.name, semantic: definition.semantic };
      });
    if (
      opcode === "י" &&
      modifierDefinition?.name === "hiriq" &&
      register?.kind === "register" &&
      comma?.kind === "comma" &&
      integer?.kind === "integer"
    ) {
      instructions.push({
        opcode,
        opcodeName: opcodeDefinition.name,
        modifier: { name: modifierDefinition.name, semantic: modifierDefinition.semantic },
        controlMarks: controls,
        operands: [
          { kind: "register", name: register.text.slice(1) },
          { kind: "integer", value: Number(integer.text) },
        ],
        start: token.start,
        end: integer.end,
      });
      ir.push({
        operation: "add_int",
        opcode,
        register: register.text.slice(1),
        value: Number(integer.text),
      });
      index = cursor + 2;
    } else {
      instructions.push({
        opcode,
        opcodeName: opcodeDefinition.name,
        modifier: {
          name: modifierDefinition?.name ?? "invalid",
          semantic: modifierDefinition?.semantic ?? "invalid",
        },
        controlMarks: controls,
        operands: [],
        start: token.start,
        end: modifierTokens.at(-1)?.end ?? token.end,
      });
      ir.push({ operation: "legacy_opcode", opcode });
      index = cursor - 1;
    }
  }
  const programBase = {
    ...metadata("@qec/ivrit-compiler", "private", [
      { uri: "memory:source", start: 0, end: source.length },
    ]),
    source,
    tokens,
    instructions,
  };
  const program: QECProgram = {
    ...programBase,
    validationStatus: diagnostics.length ? "invalid" : "valid",
    contentHash: contentHash(programBase),
  };
  const pythonAst = ir.map((item) =>
    item.operation === "add_int"
      ? {
          type: "Assign",
          target: { type: "Name", id: item.register },
          value: {
            type: "BinOp",
            left: { type: "Call", allowlisted: "int", argument: item.register },
            op: "Add",
            right: { type: "Constant", value: item.value },
          },
        }
      : { type: "Expr", legacyOpcode: item.opcode },
  );
  const pythonSource = ir
    .map((item) =>
      item.operation === "add_int"
        ? `${item.register} = int(${item.register}) + ${item.value}`
        : `# legacy opcode ${item.opcode}`,
    )
    .join("\n");
  return {
    program,
    ir,
    pythonAst,
    pythonSource: `# Generated by ${IVRIT_SPEC_VERSION}; inspect before use.\n${pythonSource}`,
    diagnostics,
  };
};
