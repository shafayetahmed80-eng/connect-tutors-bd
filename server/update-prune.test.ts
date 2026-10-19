import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// update.sh needs the real host (pnpm, git remote) to run in full, so this reads the script:
// the package-store tidy-up must come only after the site answered, and must never fail the update.
const script = readFileSync(resolve(__dirname, "../update.sh"), "utf8");

describe("update.sh package store tidy-up", () => {
  const prune = script.indexOf("pnpm store prune");

  it("runs once the site has answered, just before reporting success", () => {
    expect(prune).toBeGreaterThan(script.indexOf("if restart_and_check; then"));
    expect(prune).toBeLessThan(script.indexOf("Update finished."));
  });

  it("is best effort: its failure is caught and the update still finishes", () => {
    const line = script.slice(prune, script.indexOf("\n", prune));
    expect(line).toContain("||");
    expect(line).not.toMatch(/\bdie\b|exit 1/);
  });

  it("does not touch the rollback path", () => {
    expect(script.slice(0, script.indexOf("# Node and pnpm live in cPanel"))).not.toContain("pnpm store prune");
  });
});
