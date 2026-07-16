import OpenAI from "openai";
import { parseProgram } from "@ivritcode/core";
const MAX_PROMPT_LENGTH = 4000,
  requests = new Map<string, { count: number; reset: number }>();
export interface ChavrutaResponse {
  readonly program: string;
  readonly explanation: string;
  readonly expectedBehavior: string;
  readonly gatesToWatch: readonly string[];
  readonly warnings: readonly string[];
  readonly valid: boolean;
  readonly diagnostics: readonly string[];
}
const headers = (origin?: string) => {
  const allowed = (process.env.CHAVRUTA_ALLOWED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((x) => x.trim());
  return {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    ...(origin && allowed.includes(origin)
      ? { "access-control-allow-origin": origin, vary: "Origin" }
      : {}),
  };
};
const reply = (statusCode: number, body: unknown, origin?: string) => ({
  statusCode,
  headers: headers(origin),
  body: JSON.stringify(body),
});
export function validateRequest(event: { body?: string | null }) {
  let body: unknown;
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return { error: "Request body must be valid JSON." };
  }
  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as any).prompt !== "string" ||
    !(body as any).prompt.trim()
  )
    return { error: "A non-empty prompt string is required." };
  if ((body as any).prompt.length > MAX_PROMPT_LENGTH)
    return { error: `Prompt exceeds ${MAX_PROMPT_LENGTH} characters.` };
  return {
    prompt: (body as any).prompt.trim(),
    source:
      typeof (body as any).source === "string"
        ? (body as any).source.slice(0, MAX_PROMPT_LENGTH)
        : "",
  };
}
export function validateModelOutput(value: unknown): ChavrutaResponse {
  if (!value || typeof value !== "object") throw new Error("Model output is not an object.");
  const item = value as Record<string, unknown>;
  for (const field of ["program", "explanation", "expectedBehavior"] as const)
    if (typeof item[field] !== "string")
      throw new Error(`Model output field ${field} must be a string.`);
  for (const field of ["gatesToWatch", "warnings"] as const)
    if (
      !Array.isArray(item[field]) ||
      !(item[field] as unknown[]).every((x) => typeof x === "string")
    )
      throw new Error(`Model output field ${field} must be a string array.`);
  const diagnostics: string[] = [];
  let valid = true;
  try {
    parseProgram(item.program as string);
  } catch (error) {
    valid = false;
    diagnostics.push(error instanceof Error ? error.message : String(error));
  }
  return {
    program: item.program as string,
    explanation: item.explanation as string,
    expectedBehavior: item.expectedBehavior as string,
    gatesToWatch: (item.gatesToWatch as string[]).slice(0, 20),
    warnings: (item.warnings as string[]).slice(0, 20),
    valid,
    diagnostics,
  };
}
function rateLimited(key: string) {
  const now = Date.now(),
    entry = requests.get(key);
  if (!entry || entry.reset < now) {
    requests.set(key, { count: 1, reset: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 20;
}
export async function handler(event: any) {
  const origin = event.headers?.origin ?? event.headers?.Origin;
  if (event.httpMethod === "OPTIONS")
    return { statusCode: 204, headers: headers(origin), body: "" };
  if (event.httpMethod !== "POST") return reply(405, { error: "Method not allowed." }, origin);
  if (rateLimited(event.headers?.["x-nf-client-connection-ip"] ?? "anonymous"))
    return reply(429, { error: "Too many requests. Try again shortly." }, origin);
  const request = validateRequest(event);
  if (request.error) return reply(400, { error: request.error }, origin);
  if (!process.env.OPENAI_API_KEY)
    return reply(
      503,
      { error: "Chavruta is not configured. The Observatory remains available." },
      origin,
    );
  const controller = new AbortController(),
    timeout = setTimeout(
      () => controller.abort(),
      Number(process.env.CHAVRUTA_TIMEOUT_MS ?? 20_000),
    );
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      response = await client.responses.create(
        {
          model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
          instructions:
            "You are IvritCode Chavruta, a programming and study partner. Generate only valid Hebrew-letter IvritCode, whitespace, punctuation, niqqud, cantillation, and # comments. Never claim spiritual, scientific, or religious authority. Clearly separate implemented behavior from interpretation.",
          input: `Request: ${request.prompt}\nCurrent source: ${request.source}`,
          text: {
            format: {
              type: "json_schema",
              name: "chavruta_response",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  program: { type: "string" },
                  explanation: { type: "string" },
                  expectedBehavior: { type: "string" },
                  gatesToWatch: { type: "array", items: { type: "string" } },
                  warnings: { type: "array", items: { type: "string" } },
                },
                required: [
                  "program",
                  "explanation",
                  "expectedBehavior",
                  "gatesToWatch",
                  "warnings",
                ],
              },
            },
          },
        },
        { signal: controller.signal },
      );
    return reply(200, validateModelOutput(JSON.parse(response.output_text)), origin);
  } catch (error) {
    console.error("Chavruta request failed", error instanceof Error ? error.name : "UnknownError");
    return reply(
      error instanceof Error && error.name === "AbortError" ? 504 : 502,
      { error: "Chavruta request failed safely." },
      origin,
    );
  } finally {
    clearTimeout(timeout);
  }
}
