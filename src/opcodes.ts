// IvritCode — Hebrew opcodes + base-22 digits

export type Op =
  | "PUSH"
  | "ADD"
  | "SUB"
  | "MUL"
  | "DIV"
  | "DUP"
  | "SWAP"
  | "DROP"
  | "JMP"
  | "JZ"
  | "PRINT"
  | "HALT";

/**
 * Hebrew letter → opcode
 * א is silent intention: PUSH
 */
export const opcodeMap: Record<string, Op> = {
  "א": "PUSH",
  "ב": "ADD",
  "ג": "SUB",
  "ד": "MUL",
  "ה": "DIV",
  "ו": "DUP",
  "ז": "SWAP",
  "ח": "DROP",
  "ט": "JMP",
  "י": "JZ",
  "כ": "PRINT",
  "ל": "HALT"
};

/**
 * Base-22 digits (Ivrit numerals)
 * א=0 … ת=21
 */
const letters = "אבגדהוזחטיכלמנסעפצקרשת";

export const digitMap: Record<string, number> = Object.fromEntries(
  [...letters].map((ch, i) => [ch, i])
);
