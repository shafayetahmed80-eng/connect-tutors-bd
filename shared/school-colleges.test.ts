import { describe, expect, it } from "vitest";
import { parseBulkSchoolColleges } from "./school-colleges";

describe("parseBulkSchoolColleges", () => {
  it("reads a name per line, using the default division when a line has none", () => {
    const { rows, invalidLines } = parseBulkSchoolColleges("Notre Dame College\nRajshahi Collegiate School", "dhaka");
    expect(rows).toEqual([
      { name: "Notre Dame College", division: "dhaka" },
      { name: "Rajshahi Collegiate School", division: "dhaka" },
    ]);
    expect(invalidLines).toEqual([]);
  });

  it("lets a line name its own division, by value or by label, overriding the default", () => {
    const { rows } = parseBulkSchoolColleges("Notre Dame College, Dhaka\nChittagong Collegiate School, chattogram", "sylhet");
    expect(rows).toEqual([
      { name: "Notre Dame College", division: "dhaka" },
      { name: "Chittagong Collegiate School", division: "chattogram" },
    ]);
  });

  it("keeps a comma that is part of the name when the text after it is not a division", () => {
    const { rows } = parseBulkSchoolColleges("Ideal School, Motijheel", "dhaka");
    expect(rows).toEqual([{ name: "Ideal School, Motijheel", division: "dhaka" }]);
  });

  it("skips blank lines and tidies extra whitespace", () => {
    const { rows } = parseBulkSchoolColleges("\n  Viqarunnisa Noon School  \n\n", "dhaka");
    expect(rows).toEqual([{ name: "Viqarunnisa Noon School", division: "dhaka" }]);
  });

  it("reports a line as invalid when it has no division of its own and no default", () => {
    const { rows, invalidLines } = parseBulkSchoolColleges("Notre Dame College\nAB", null);
    expect(rows).toEqual([]);
    expect(invalidLines).toEqual(["Notre Dame College", "AB"]);
  });

  it("reports a too-short name as invalid even with a division", () => {
    const { rows, invalidLines } = parseBulkSchoolColleges("AB, Dhaka", "sylhet");
    expect(rows).toEqual([]);
    expect(invalidLines).toEqual(["AB, Dhaka"]);
  });
});
