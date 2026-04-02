import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    extends: "./vitest.config.cf.ts",
    test: {
      include: ["test/unit/room.test.ts", "test/integration/**/*.test.ts"],
    },
  },
  {
    extends: "./vitest.config.unit.ts",
  },
  {
    test: {
      name: "components",
      include: ["test/components/**/*.test.tsx"],
      environment: "jsdom",
      setupFiles: ["test/components/setup.ts"],
      globals: true,
      css: { modules: { classNameStrategy: "non-scoped" } },
    },
  },
]);
