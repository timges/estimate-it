import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/vrt",
  use: {
    baseURL: "http://localhost:8790",
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
    },
  },
});
