import { describe, expect, it } from "vitest";
import { degreeTitleSuggestions, historyLevelsLeft, historyLevelsOffered } from "./tutor-education";

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

describe("what the history offers beside the University Section's own degree", () => {
  it("offers the Honours beside a Masters, whatever the study status", () => {
    for (const status of ["studying", "graduated", "professional", "", null, undefined]) {
      expect(historyLevelsLeft([], "Masters", status)).toEqual(["Honours"]);
    }
  });

  it("offers a Masters beside an Honours only once the Honours is behind them", () => {
    expect(historyLevelsLeft([], "Honours", "graduated")).toEqual(["Masters"]);
    expect(historyLevelsLeft([], "Honours", "professional")).toEqual(["Masters"]);
    // Still reading for it, or not said: someone reading for an Honours cannot have a Masters.
    expect(historyLevelsLeft([], "Honours", "studying")).toEqual([]);
    expect(historyLevelsLeft([], "Honours", "")).toEqual([]);
    expect(historyLevelsLeft([], "Honours", undefined)).toEqual([]);
  });

  it("still takes each level once", () => {
    expect(historyLevelsLeft(["Honours"], "Masters", "graduated")).toEqual([]);
    expect(historyLevelsLeft(["Masters"], "Honours", "graduated")).toEqual([]);
    expect(historyLevelsLeft(["Masters"], "Masters", "graduated")).toEqual(["Honours"]);
  });

  it("allows either until the section says which level it holds", () => {
    expect(historyLevelsLeft([], null, "studying")).toEqual(["Honours", "Masters"]);
    expect(historyLevelsLeft([], "")).toEqual(["Honours", "Masters"]);
    expect(historyLevelsOffered(undefined)).toEqual(["Honours", "Masters"]);
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
