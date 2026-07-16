import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const cli = resolve("apps/cli/dist/index.js");
describe("CLI", () => {
  it("uses useful exit codes", () => {
    expect(spawnSync(process.execPath, [cli], { encoding: "utf8" }).status).toBe(2);
    expect(
      spawnSync(process.execPath, [cli, "check", resolve("examples/bereshit.ivc")], {
        encoding: "utf8",
      }).status,
    ).toBe(0);
    expect(
      spawnSync(process.execPath, [cli, "check", "missing.ivc"], { encoding: "utf8" }).status,
    ).toBe(1);
  });
  it("prints UTF-8 and JSON", () => {
    expect(
      spawnSync(process.execPath, [cli, "run", resolve("examples/bereshit.ivc")], {
        encoding: "utf8",
      }).stdout,
    ).toContain("Aleph Olam");
    expect(
      spawnSync(
        process.execPath,
        [cli, "gates", resolve("examples/gates.ivc"), "--format", "json"],
        { encoding: "utf8" },
      ).stdout,
    ).toContain('"matrix"');
  });
  it("converts decimal", () =>
    expect(
      spawnSync(process.execPath, [cli, "convert", "--decimal", "231"], { encoding: "utf8" })
        .stdout,
    ).toContain("231₁₀"));
});
