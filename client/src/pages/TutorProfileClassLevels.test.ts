import { describe, expect, it } from "vitest";
import { expandGroupedClassLevelIds, getGroupedClassLevelSelector } from "./TutorProfileClassLevels";

const levels = [
  { id: "play", name: "Play" },
  { id: "nursery", name: "Nursery" },
  { id: "kg", name: "KG" },
  { id: "c1", name: "Class 1" },
  { id: "c2", name: "Class 2" },
  { id: "c3", name: "Class 3" },
  { id: "c4", name: "Class 4" },
  { id: "c5", name: "Class 5" },
  { id: "c6", name: "Class 6" },
  { id: "c7", name: "Class 7" },
  { id: "c8", name: "Class 8" },
  { id: "ssc", name: "SSC" },
  { id: "hsc", name: "HSC" },
  { id: "olevel", name: "O Levels" },
  { id: "alevel", name: "A Levels" },
];

describe("Tutor Profile grouped Class Levels", () => {
  it("shows approved Class 1–5 and Class 6–8 groups instead of individual Class 1–8 options", () => {
    const selector = getGroupedClassLevelSelector(levels);
    expect(selector.options.map(option => option.label)).toEqual([
      "Play",
      "Nursery",
      "KG",
      "Class 1–5",
      "Class 6–8",
      "SSC",
      "HSC",
      "O Levels",
      "A Levels",
    ]);
  });

  it("expands a selected range to its underlying legacy class IDs before draft persistence", () => {
    const selector = getGroupedClassLevelSelector(levels);
    expect(expandGroupedClassLevelIds(["group-class-1-5", "ssc"], selector.groupedIds)).toEqual([
      "c1", "c2", "c3", "c4", "c5", "ssc",
    ]);
  });
});
