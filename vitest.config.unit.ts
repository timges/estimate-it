import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "test/unit/store.test.ts",
      "test/unit/dictionary.test.ts",
      "test/unit/estimates.test.ts",
      "test/unit/github-url.test.ts",
      "test/unit/import-utils.test.ts",
    ],
  },
});
