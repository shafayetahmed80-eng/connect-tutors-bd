import { describe, expect, it } from "vitest";
import { degreeTitleSuggestions, historyLevelsBefore, historyLevelsLeft } from "./tutor-education";

describe("historyLevelsLeft", () => {
  it("offers both levels while none is taken", () => {
    expect(historyLevelsLeft([])).toEqual(["Honours", "Masters"]);
    expect(historyLevelsLeft(["", undefined, null])).toEqual(["Honours", "Masters"]);
  });

  it("leaves only the level that is still free", () => {
    expect(historyLevelsLeft(["Honours"])).toEqual(["Masters"]);
    expect(historyLevelsLeft(["Masters", ""])).toEqual(["Honours"]);
  });

  it("leaves nothing once both are taken, whatever else is in the list", () => {
    expect(historyLevelsLeft(["Honours", "Masters"])).toEqual([]);
    expect(historyLevelsLeft(["SSC", "Masters", "Honours", "HSC"])).toEqual([]);
  });
});

describe("historyLevelsLeft below the University Section's level", () => {
  it("holds only the degrees before the section's own", () => {
    expect(historyLevelsLeft([], "Masters")).toEqual(["Honours"]);
    expect(historyLevelsLeft([], "Honours")).toEqual([]);
  });

  it("still takes each level once", () => {
    expect(historyLevelsLeft(["Honours"], "Masters")).toEqual([]);
    expect(historyLevelsLeft(["Masters"], "Masters")).toEqual(["Honours"]);
  });

  it("allows either until the section says which", () => {
    expect(historyLevelsLeft([], null)).toEqual(["Honours", "Masters"]);
    expect(historyLevelsLeft([], "")).toEqual(["Honours", "Masters"]);
    expect(historyLevelsBefore(undefined)).toEqual(["Honours", "Masters"]);
  });
});

describe("degreeTitleSuggestions", () => {
  it("suggests a bachelor's titles for Honours and a master's for Masters", () => {
    expect(degreeTitleSuggestions("Honours")).toContain("BSc");
    expect(degreeTitleSuggestions("Honours")).not.toContain("MSc");
    expect(degreeTitleSuggestions("Masters")).toContain("MSc");
    expect(degreeTitleSuggestions("Masters")).not.toContain("BSc");
  });

  it("suggests board exams for the two school sections", () => {
    expect(degreeTitleSuggestions("SSC")).toEqual(expect.arrayContaining(["SSC", "Dakhil", "O Level"]));
    expect(degreeTitleSuggestions("SSC")).not.toContain("HSC");
    expect(degreeTitleSuggestions("HSC")).toEqual(expect.arrayContaining(["HSC", "Alim", "A Level"]));
    expect(degreeTitleSuggestions("HSC")).not.toContain("BSc");
  });

  it("suggests both until a level is chosen", () => {
    for (const level of ["", undefined, null]) {
      expect(degreeTitleSuggestions(level)).toEqual(expect.arrayContaining(["BSc", "MSc"]));
    }
  });
});
