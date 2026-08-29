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
