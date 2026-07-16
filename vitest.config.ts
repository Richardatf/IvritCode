import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: [
      "packages/*/tests/**/*.test.ts",
      "apps/*/tests/**/*.test.ts",
      "netlify/functions/**/*.test.ts",
    ],
    coverage: { reporter: ["text", "html"] },
  },
});
