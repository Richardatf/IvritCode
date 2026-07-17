import { copyFile, mkdir } from "node:fs/promises";
await mkdir(new URL("../packages/qec-spec/src/", import.meta.url), { recursive: true });
await copyFile(
  new URL("../spec/ivritcode-0.1.json", import.meta.url),
  new URL("../packages/qec-spec/src/ivritcode-0.1.json", import.meta.url),
);
