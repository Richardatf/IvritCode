import { describe, expect, it } from "vitest";
import { handler, validateModelOutput, validateRequest } from "./chavruta.js";
describe("Chavruta function", () => {
  it("validates methods and bodies", async () => {
    expect((await handler({ httpMethod: "GET", headers: {} })).statusCode).toBe(405);
    expect(validateRequest({ body: "{" }).error).toMatch(/JSON/);
    expect(validateRequest({ body: JSON.stringify({ prompt: " " }) }).error).toMatch(/non-empty/);
    expect(validateRequest({ body: JSON.stringify({ prompt: "a".repeat(4001) }) }).error).toMatch(
      /exceeds/,
    );
  });
  it("works without API configuration", async () =>
    expect(
      (await handler({ httpMethod: "POST", headers: {}, body: JSON.stringify({ prompt: "help" }) }))
        .statusCode,
    ).toBe(503));
  it("validates generated programs through the parser", () => {
    const valid = validateModelOutput({
      program: "אבג",
      explanation: "x",
      expectedBehavior: "y",
      gatesToWatch: [],
      warnings: [],
    });
    expect(valid.valid).toBe(true);
    expect(() => validateModelOutput({})).toThrow(/field/);
  });
});
