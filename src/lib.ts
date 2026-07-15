export { HEBREW_LETTERS, FINAL_FORMS, LETTER_NAMES, type HebrewLetter } from "./alphabet.js";
export { assemble } from "./assembler.js";
export { analyzeGates, type GateFrequency, type GateOptions } from "./gates.js";
export { matchLexiconWindows, loadLexicon, normalizeHebrew, type CandidateWindow, type LexiconData } from "./lexicon.js";
export { parseProgram, extractProgramLetters, type IvritProgram, type ParseOptions } from "./parser.js";
export { executeProgram, stepInstruction, disassembleProgram, type ExecutionContext, type ExecutionTrace, type RunResult, type ExecuteOptions } from "./program.js";
export { makeZeroState, normalizeState, stateToLetterStream, REGISTER_COUNT, ALEPH_OLAM_INDEX, type IvritState } from "./state.js";
export { INSTRUCTION_DEFINITIONS, type ParsedInstruction, type NiqqudModifier, type CantillationMark, type InstructionDefinition } from "./instruction.js";
export * from "./errors.js";
