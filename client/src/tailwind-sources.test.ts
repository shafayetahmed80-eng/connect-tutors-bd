import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { tutorPreferenceToneClass } from "../../shared/job-card";

/*
 * The site is built with client/ as its root, and Tailwind only generates the classes it finds
 * under that root. The Male / Female / Any colours live in shared/job-card.ts, so without this
 * source line only the one colour that also appeared in a test file under client/ was ever built.
 */
describe("Tailwind reads shared/ for class names", () => {
  it("is told to scan the shared folder", () => {
    const css = readFileSync(resolve(__dirname, "index.css"), "utf8");
    expect(css).toMatch(/@source\s+"\.\.\/\.\.\/shared"\s*;/);
  });

  it("gives each preference its own colour", () => {
    const tones = (["male", "female", "any"] as const).map(tutorPreferenceToneClass);
    expect(new Set(tones).size).toBe(3);
  });
});
