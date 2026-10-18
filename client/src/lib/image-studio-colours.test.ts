import { describe, expect, it } from "vitest";
import { checkColourPair, setOwnStudioColours, studioColours, visibleStudioColours, type StudioColourMarks } from "./image-studio-colours";

describe("the Image Section colour pairs", () => {
  it("ships the five the Owner picked, each text readable on its ground", () => {
    expect(studioColours.map(colour => colour.code)).toEqual(["P1", "P4", "P5", "P14", "P15"]);
    for (const colour of studioColours) expect(checkColourPair(colour).ratio, colour.name).toBeGreaterThanOrEqual(7);
  });

  it("adds the Owner's own as O1, O2 in saved order, and archives and stars like fonts", () => {
    setOwnStudioColours([
      { id: "own-aaaaaaaaaaaa", name: "One", ground: "#000000", text: "#ffffff", accent: "#ff0000" },
      { id: "own-bbbbbbbbbbbb", name: "Two", ground: "#ffffff", text: "#000000", accent: "#00ff00" },
    ]);
    const marks: StudioColourMarks = new Map([["own-bbbbbbbbbbbb", { starred: true, archived: false }], ["mint", { starred: false, archived: true }]]);

    const ids = visibleStudioColours({ marks }).map(colour => colour.id);
    expect(ids[0]).toBe("own-bbbbbbbbbbbb");
    expect(ids).not.toContain("mint");
    expect(visibleStudioColours({ marks }).find(colour => colour.id === "own-aaaaaaaaaaaa")?.code).toBe("O1");
    expect(visibleStudioColours({ marks, showArchived: true }).map(colour => colour.id)).toEqual(["mint"]);
    setOwnStudioColours([]);
  });

  it("judges a pair by the contrast of its text on its ground", () => {
    expect(checkColourPair({ ground: "#ffffff", text: "#f0f0f0" }).readable).toBe(false);
    expect(checkColourPair({ ground: "#0b4b86", text: "#ffffff" }).readable).toBe(true);
  });
});
