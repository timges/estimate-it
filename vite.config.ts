import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/ws": {
        target: "http://localhost:8790",
        ws: true,
      },
      "/api": {
        target: "http://localhost:8790",
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  css: {
    modules: {
      localsConvention: "camelCase",
    },
  },
});
