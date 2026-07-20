import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { canonicalPackageNames, releaseOrder } from "./canonical-package-set.mjs";

const root = process.cwd();

function command(name) {
  if (process.platform === "win32" && name === "npm" && process.env.npm_execpath) {
    return process.execPath;
  }
  return name;
}

function run(executable, args, cwd) {
  const commandArgs =
    executable === "npm" && command(executable) === process.execPath
      ? [process.env.npm_execpath, ...args]
      : args;
  const result = spawnSync(command(executable), commandArgs, {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      [`${executable} ${args.join(" ")} failed`, result.stdout, result.stderr]
        .filter(Boolean)
        .join("\n"),
    );
  }
  return result.stdout.trim();
}

const sandbox = await mkdtemp(path.join(tmpdir(), "ivritcode-canonical-smoke-"));

try {
  const dependencies = {};

  for (const directory of releaseOrder) {
    const packageDirectory = path.join(root, directory);
    const manifest = JSON.parse(
      await readFile(path.join(packageDirectory, "package.json"), "utf8"),
    );
    const packed = JSON.parse(
      run("npm", ["pack", "--json", "--pack-destination", sandbox], packageDirectory),
    );
    const filename = packed[0]?.filename;
    if (!filename) throw new Error(`npm pack returned no filename for ${manifest.name}`);
    dependencies[manifest.name] = `file:./${filename}`;
  }

  await writeFile(
    path.join(sandbox, "package.json"),
    `${JSON.stringify({ private: true, type: "module", dependencies }, null, 2)}\n`,
  );

  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], sandbox);

  const smokeProgram = `
    const names = ${JSON.stringify(canonicalPackageNames)};
    for (const name of names) {
      const api = await import(name);
      const exports = Object.keys(api);
      if (exports.length === 0) throw new Error(name + " exports no API");
      console.log(name + ": " + exports.length + " exports");
    }
  `;
  console.log(run("node", ["--input-type=module", "--eval", smokeProgram], sandbox));
  console.log("Canonical package consumer smoke test passed.");
} finally {
  const resolvedSandbox = path.resolve(sandbox);
  const resolvedTemp = path.resolve(tmpdir());
  if (!resolvedSandbox.startsWith(`${resolvedTemp}${path.sep}`)) {
    throw new Error(`Refusing to remove non-temporary path: ${resolvedSandbox}`);
  }
  await rm(resolvedSandbox, { recursive: true, force: true });
}
