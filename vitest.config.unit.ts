import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/unit/store.test.ts", "test/unit/dictionary.test.ts"],
  },
});
