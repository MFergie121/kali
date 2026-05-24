import { defineConfig } from "vitest/config";

// Minimal, isolated runner for pure-function unit tests. Deliberately does not
// load the SvelteKit/Vite plugin chain — the only tests today are plain TS
// helpers with no SvelteKit or DB imports.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
