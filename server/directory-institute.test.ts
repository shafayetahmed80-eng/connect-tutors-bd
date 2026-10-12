import { describe, expect, it } from "vitest";
import { pickDirectoryEducation } from "./directory-institute";

const record = (qualificationLevel: string | null, instituteName: string | null, majorGroup: string | null = null) => ({ qualificationLevel, instituteName, majorGroup });
const academic = (highestEducation: string | null, universityName: string | null, departmentName: string | null) => ({ highestEducation, universityName, departmentName });

describe("pickDirectoryEducation", () => {
  it("goes Masters, Honours, Higher Secondary, Secondary, with the department of that same level", () => {
    const all = [record("SSC", "Narandia High School", "Science"), record("HSC", "Notre Dame College", "Science"), record("Honours", "University of Dhaka", "Physics"), record("Masters", "Jahangirnagar University", "Applied Physics")];
    expect(pickDirectoryEducation(null, all)).toEqual({ instituteName: "Jahangirnagar University", departmentName: "Applied Physics" });
    expect(pickDirectoryEducation(null, all.slice(0, 3))).toEqual({ instituteName: "University of Dhaka", departmentName: "Physics" });
    expect(pickDirectoryEducation(null, all.slice(0, 2))).toEqual({ instituteName: "Notre Dame College", departmentName: "Science" });
    expect(pickDirectoryEducation(null, all.slice(0, 1))).toEqual({ instituteName: "Narandia High School", departmentName: "Science" });
  });

  it("reads the University Section as the level it holds, and never mixes its department with another level's institute", () => {
    expect(pickDirectoryEducation(academic("Masters", "BUET", "CSE"), [record("Honours", "University of Dhaka", "Physics")])).toEqual({ instituteName: "BUET", departmentName: "CSE" });
    expect(pickDirectoryEducation(academic("Honours", "University of Dhaka", "Physics"), [record("Masters", "Jahangirnagar University", "Applied Physics")])).toEqual({ instituteName: "Jahangirnagar University", departmentName: "Applied Physics" });
    expect(pickDirectoryEducation(academic(null, "BUET", "CSE"), [record("HSC", "Notre Dame College", "Science")])).toEqual({ instituteName: "BUET", departmentName: "CSE" });
  });

  it("skips a record with no name, and is empty when nothing is named", () => {
    expect(pickDirectoryEducation(null, [record("Masters", "  ", "X"), record("SSC", "Narandia High School", "Arts")])).toEqual({ instituteName: "Narandia High School", departmentName: "Arts" });
    expect(pickDirectoryEducation(null, [])).toEqual({ instituteName: null, departmentName: null });
  });
});
