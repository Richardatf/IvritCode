import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { executeProgram } from "../src/lib.js";
import { validateRequest } from "../netlify/functions/chavruta.js";

describe("integration surfaces", () => {
  it("exposes browser-facing engine behavior", () => {
    expect(executeProgram("בראשית").trace).toHaveLength(6);
  });
  it("returns useful CLI exit codes", () => {
    const cli = resolve("dist/cli.js");
    expect(spawnSync(process.execPath, [cli], { encoding: "utf8" }).status).toBe(2);
    expect(spawnSync(process.execPath, [cli, "check", resolve("examples/bereshit.ivc")], { encoding: "utf8" }).status).toBe(0);
  });
  it("validates Chavruta requests", () => {
    expect(validateRequest({ body: "{" }).error).toMatch(/valid JSON/);
    expect(validateRequest({ body: JSON.stringify({ prompt: " " }) }).error).toMatch(/non-empty/);
    expect(validateRequest({ body: JSON.stringify({ prompt: "אבג" }) }).prompt).toBe("אבג");
  });
});
