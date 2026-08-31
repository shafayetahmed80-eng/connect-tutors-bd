import { defineConfig } from "vitest/config";
import path from "path";
import { readFileSync } from "node:fs";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    // The heavier jsdom component tests (full Tutor Profile workspace render with
    // many mocked queries + several userEvent steps) run close to the 5s default
    // and tip over under load; give every test more headroom. A genuinely broken
    // test still fails fast with an assertion error, not a timeout.
    testTimeout: 20000,
    hookTimeout: 20000,
    // Deterministic secrets so crypto-dependent server tests (guardian intake
    // handoff signing, admin invite/2FA key material) run without a sourced .env.
    env: {
      JWT_SECRET: process.env.JWT_SECRET ?? "vitest-deterministic-secret",
      VITE_APP_ID: process.env.VITE_APP_ID ?? "vitest",
      // Database-backed tests read process.env.DATABASE_URL directly. Fall back
      // to the value in .env so `npm test` works without a shell-exported one.
      ...(process.env.DATABASE_URL
        ? { DATABASE_URL: process.env.DATABASE_URL }
        : (() => {
            try {
              const m = readFileSync(path.resolve(templateRoot, ".env"), "utf8").match(/^DATABASE_URL=(.*)$/m);
              return m ? { DATABASE_URL: m[1].trim() } : {};
            } catch {
              return {};
            }
          })()),
    },
  },
});
