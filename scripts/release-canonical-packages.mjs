import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { canonicalPackageNames, releaseOrder } from "./canonical-package-set.mjs";

const publish = process.argv.includes("--publish");
const root = process.cwd();
const canonicalPackages = new Set(canonicalPackageNames);

function runNpm(args, cwd) {
  const npmEntry = process.env.npm_execpath;
  const command = process.platform === "win32" && npmEntry ? process.execPath : "npm";
  const commandArgs = command === process.execPath ? [npmEntry, ...args] : args;
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(
      [`npm ${args.join(" ")} failed in ${cwd}`, result.stdout, result.stderr]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result.stdout.trim();
}

async function manifestFor(directory) {
  const filename = path.join(root, directory, "package.json");
  return JSON.parse(await readFile(filename, "utf8"));
}

async function registryHasVersion(name, version) {
  const response = await fetch(
    `https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (response.status === 404) return false;
  if (!response.ok) {
    throw new Error(`Registry lookup for ${name}@${version} returned ${response.status}`);
  }
  return true;
}

const manifests = await Promise.all(releaseOrder.map(manifestFor));
const releasedNames = new Set(manifests.map(({ name }) => name));

for (const manifest of manifests) {
  if (manifest.private) throw new Error(`${manifest.name} is marked private`);
  if (manifest.publishConfig?.access !== "public") {
    throw new Error(`${manifest.name} must set publishConfig.access to public`);
  }
  if (!manifest.files?.includes("dist")) {
    throw new Error(`${manifest.name} must publish only its dist payload`);
  }

  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    if (dependency.startsWith("@ivritcode/") || dependency.startsWith("@qec/")) {
      if (!releasedNames.has(dependency)) {
        throw new Error(`${manifest.name} depends on unreleased internal package ${dependency}`);
      }
    }
  }
}

console.log(`Canonical package release ${publish ? "publish" : "verification"}:`);

for (const [index, directory] of releaseOrder.entries()) {
  const manifest = manifests[index];
  const packageDirectory = path.join(root, directory);
  const packOutput = JSON.parse(runNpm(["pack", "--dry-run", "--json"], packageDirectory));
  const files = packOutput[0]?.files?.map(({ path: filename }) => filename) ?? [];

  for (const required of ["package.json", "dist/index.js", "dist/index.d.ts"]) {
    if (!files.includes(required)) {
      throw new Error(`${manifest.name} package payload is missing ${required}`);
    }
  }

  const label = canonicalPackages.has(manifest.name) ? "canonical" : "runtime";
  console.log(`- ${manifest.name}@${manifest.version} (${label}, ${files.length} files)`);

  if (!publish) continue;
  if (await registryHasVersion(manifest.name, manifest.version)) {
    console.log(`  already published; skipped`);
    continue;
  }
  runNpm(["publish", "--access", "public"], packageDirectory);
  console.log(`  published`);
}
