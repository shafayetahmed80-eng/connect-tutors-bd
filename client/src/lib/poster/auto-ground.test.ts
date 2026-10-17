import { describe, expect, it } from "vitest";
import { AUTO_GROUND_BY_CURRICULUM, AUTO_GROUND_FALLBACK, autoGroundForCurricula } from "./auto-ground";
import { legibleGround } from "./palette";

describe("the ground Auto picks", () => {
  it("is the curriculum's own colour for a poster about one curriculum", () => {
    expect(autoGroundForCurricula(["English Medium"])).toBe("#0e2442");
    expect(autoGroundForCurricula(["English Version"])).toBe("#0e3b43");
    expect(autoGroundForCurricula(["Bangla Medium"])).toBe("#0b3d2e");
    expect(autoGroundForCurricula(["Madrasa Medium"])).toBe("#2e1a47");
    expect(autoGroundForCurricula(["Admission Test"])).toBe("#3a0b17");
  });

  it("is the same one for the same curriculum named twice", () => {
    expect(autoGroundForCurricula(["Bangla Medium", "Bangla Medium", " Bangla Medium "])).toBe("#0b3d2e");
  });

  it("is the design's own colour (null) for several curricula, or none", () => {
    expect(autoGroundForCurricula(["English Medium", "Bangla Medium"])).toBeNull();
    expect(autoGroundForCurricula([])).toBeNull();
    expect(autoGroundForCurricula(["", "  "])).toBeNull();
  });

  it("is a neutral slate for a curriculum with no colour of its own", () => {
    expect(autoGroundForCurricula(["Test Preparation"])).toBe(AUTO_GROUND_FALLBACK);
    expect(autoGroundForCurricula(["Something The Owner Added Later"])).toBe(AUTO_GROUND_FALLBACK);
  });

  it("gives each curriculum a different colour, every one drawn exactly as it is", () => {
    const colours = Object.values(AUTO_GROUND_BY_CURRICULUM);
    expect(new Set(colours).size).toBe(colours.length);
    expect(colours).not.toContain(AUTO_GROUND_FALLBACK);
    for (const colour of [...colours, AUTO_GROUND_FALLBACK]) expect(legibleGround(colour).ground, colour).toBe(colour);
  });
});
