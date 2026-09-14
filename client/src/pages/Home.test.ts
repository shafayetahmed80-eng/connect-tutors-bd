import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { homeEditorialImages } from "./Home";

describe("homepage editorial imagery", () => {
  it("ships the Bangladesh-context learning visuals with the site instead of a storage service", () => {
    expect(homeEditorialImages).toEqual({
      hero: "/images/hero.webp",
      homeLearning: "/images/home-learning.webp",
      onlineLearning: "/images/online-learning.webp",
    });
    for (const source of Object.values(homeEditorialImages)) {
      expect(existsSync(path.resolve(import.meta.dirname, "../../public", source.slice(1)))).toBe(true);
    }
  });
});
