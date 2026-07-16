import OpenAI from "openai";

const MAX_PROMPT_LENGTH = 4000;
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function corsHeaders(event) {
  const configured = (process.env.CHAVRUTA_ALLOWED_ORIGINS || "http://localhost:4173").split(",").map((value) => value.trim());
  const origin = event.headers?.origin || event.headers?.Origin;
  return origin && configured.includes(origin)
    ? { "Access-Control-Allow-Origin": origin, Vary: "Origin", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
    : { "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
}

function response(statusCode, body, headers = {}) {
  return { statusCode, headers: { ...JSON_HEADERS, ...headers }, body: JSON.stringify(body) };
}

export function validateRequest(event) {
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return { error: "Request body must be valid JSON." }; }
  if (typeof body.prompt !== "string" || !body.prompt.trim()) return { error: "A non-empty `prompt` string is required." };
  if (body.prompt.length > MAX_PROMPT_LENGTH) return { error: `Prompt exceeds the ${MAX_PROMPT_LENGTH}-character limit.` };
  return { prompt: body.prompt.trim() };
}

function validProgram(program) {
  const withoutComments = program.normalize("NFD").split(/\r?\n/).map((line) => line.replace(/#.*/, "")).join("\n");
  let hasBase = false;
  for (const ch of withoutComments) {
    if (/[א-תךםןףץ]/u.test(ch)) { hasBase = true; continue; }
    if (/[\u0591-\u05C7]/u.test(ch)) { if (!hasBase) return false; continue; }
    if (/[\s\p{P}]/u.test(ch)) { hasBase = false; continue; }
    return false;
  }
  return true;
}

function validateModelOutput(value) {
  if (!value || typeof value !== "object") throw new Error("Model returned an invalid object.");
  if (typeof value.program !== "string" || typeof value.explanation !== "string" ||
      !Array.isArray(value.gatesToWatch) || !value.gatesToWatch.every((item) => typeof item === "string") ||
      !Array.isArray(value.warnings) || !value.warnings.every((item) => typeof item === "string")) {
    throw new Error("Model response does not match the Chavruta contract.");
  }
  const result = {
    program: value.program,
    explanation: value.explanation,
    gatesToWatch: value.gatesToWatch.slice(0, 20),
    warnings: value.warnings.slice(0, 20),
  };
  if (!validProgram(result.program)) throw new Error("Model generated text outside the IvritCode grammar.");
  return result;
}

export async function handler(event) {
  const cors = corsHeaders(event);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST") return response(405, { error: "Method not allowed." }, cors);
  if (!process.env.OPENAI_API_KEY) return response(503, { error: "Chavruta is not configured." }, cors);
  const validated = validateRequest(event);
  if (validated.error) return response(400, { error: validated.error }, cors);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.CHAVRUTA_TIMEOUT_MS || 20000));
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: [
        "You are IvritCode Chavruta, a study and programming assistant.",
        "Generate only programs composed of the 22 Hebrew letters, combining marks, whitespace, punctuation, and # comments.",
        "Do not use English stack-machine commands. Do not claim spiritual or scientific authority.",
        "Return JSON with program, explanation, gatesToWatch, and warnings.",
      ].join("\n"),
      input: validated.prompt,
      text: { format: { type: "json_schema", name: "chavruta_response", strict: true, schema: {
        type: "object", additionalProperties: false,
        properties: {
          program: { type: "string" }, explanation: { type: "string" },
          gatesToWatch: { type: "array", items: { type: "string" } },
          warnings: { type: "array", items: { type: "string" } },
        },
        required: ["program", "explanation", "gatesToWatch", "warnings"],
      } } },
    }, { signal: controller.signal });
    return response(200, validateModelOutput(JSON.parse(completion.output_text)), cors);
  } catch (error) {
    console.error("Chavruta request failed", error instanceof Error ? error.message : error);
    return response(error?.name === "AbortError" ? 504 : 502, { error: "Chavruta request failed." }, cors);
  } finally { clearTimeout(timeout); }
}
