import { describe, expect, it } from "vitest";
import { compileIvrit, tokenize } from "../src/index.js";
const SOURCE = "יִ $r1, 5";
describe("IvritCode 0.1 vertical slice", () => {
  it("preserves original code points and source spans", () => {
    const tokens = tokenize(SOURCE);
    expect(tokens[0]).toMatchObject({
      kind: "letter",
      text: "י",
      codePoints: ["U+05D9"],
      start: 0,
      end: 1,
    });
    expect(tokens[1]).toMatchObject({ kind: "modifier", text: "ִ", codePoints: ["U+05B4"] });
    expect(tokens.map((token) => SOURCE.slice(token.start, token.end))).toEqual(
      tokens.map((token) => token.text),
    );
  });
  it("parses ADD integer mode and emits an allowlisted Python AST representation", () => {
    const compilation = compileIvrit(SOURCE);
    expect(compilation.diagnostics).toEqual([]);
    expect(compilation.program.instructions[0]).toMatchObject({
      opcode: "י",
      opcodeName: "ADD",
      modifier: { name: "hiriq", semantic: "integer" },
      operands: [
        { kind: "register", name: "r1" },
        { kind: "integer", value: 5 },
      ],
    });
    expect(compilation.ir).toEqual([
      { operation: "add_int", opcode: "י", register: "r1", value: 5 },
    ]);
    expect(compilation.pythonSource).toContain("r1 = int(r1) + 5");
    expect(JSON.stringify(compilation.pythonAst)).not.toMatch(/Import|Attribute|Exec|Eval/);
  });
  it("round-trips NFC and NFD source to identical semantics", () =>
    expect(compileIvrit(SOURCE.normalize("NFC")).ir).toEqual(
      compileIvrit(SOURCE.normalize("NFD")).ir,
    ));
  it("rejects ambiguous combining-mark sequences with code-point diagnostics", () => {
    const compilation = compileIvrit("יִּ $r1, 5");
    expect(compilation.diagnostics.join(" ")).toMatch(/Ambiguous modifier sequence/);
    expect(compilation.diagnostics.join(" ")).toMatch(/U\+05B4/);
    expect(compilation.program.validationStatus).toBe("invalid");
  });
});
