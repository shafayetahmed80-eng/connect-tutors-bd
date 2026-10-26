import { describe, expect, it } from "vitest";
import {
  getRecommendedSubjectNamesForDepartment,
  sortAndBadgeSubjectsForDepartment,
} from "./department-subject-mapping";

describe("Department to Subject Recommendations", () => {
  it("returns recommended subjects for Mathematics", () => {
    const subjects = getRecommendedSubjectNamesForDepartment("Department of Mathematics");
    expect(subjects).toContain("Mathematics");
    expect(subjects).toContain("Higher Mathematics");
    expect(subjects).toContain("Statistics");
    expect(subjects).toContain("General Science");
  });

  it("returns recommended subjects for Electrical & Electronic Engineering (EEE)", () => {
    const subjects = getRecommendedSubjectNamesForDepartment("Electrical and Electronic Engineering");
    expect(subjects).toContain("Physics");
    expect(subjects).toContain("Mathematics");
    expect(subjects).toContain("Higher Mathematics");
    expect(subjects).toContain("ICT");
  });

  it("returns recommended subjects for Computer Science (CSE)", () => {
    const subjects = getRecommendedSubjectNamesForDepartment("Computer Science and Engineering");
    expect(subjects).toContain("ICT");
    expect(subjects).toContain("Computer Science");
    expect(subjects).toContain("Programming");
    expect(subjects).toContain("Mathematics");
  });

  it("returns recommended subjects for Medicine / MBBS", () => {
    const subjects = getRecommendedSubjectNamesForDepartment("MBBS / Medicine");
    expect(subjects).toContain("Biology");
    expect(subjects).toContain("General Science");
    expect(subjects).toContain("Chemistry");
  });

  it("returns recommended subjects for Chemistry / Pharmacy", () => {
    const subjects = getRecommendedSubjectNamesForDepartment("Department of Pharmacy");
    expect(subjects).toContain("Chemistry");
    expect(subjects).toContain("Biology");
  });

  it("returns recommended subjects for English Literature", () => {
    const subjects = getRecommendedSubjectNamesForDepartment("English Language and Literature");
    expect(subjects).toEqual(["English", "Spoken English", "IELTS Preparation"]);
  });

  it("returns recommended subjects for Business / Accounting", () => {
    const subjects = getRecommendedSubjectNamesForDepartment("Accounting and Information Systems");
    expect(subjects).toContain("Accounting");
    expect(subjects).toContain("Finance and Banking");
    expect(subjects).toContain("Business Entrepreneurship");
  });

  it("returns recommended subjects for Economics", () => {
    const subjects = getRecommendedSubjectNamesForDepartment("Department of Economics");
    expect(subjects).toContain("Economics");
    expect(subjects).toContain("Statistics");
    expect(subjects).toContain("Mathematics");
  });

  it("returns recommended subjects for Islamic Studies", () => {
    const subjects = getRecommendedSubjectNamesForDepartment("Islamic Studies and Arabic");
    expect(subjects).toContain("Islam and Moral Education");
    expect(subjects).toContain("Arabic");
    expect(subjects).toContain("Quran and Tajweed");
  });

  it("handles Bengali department names (e.g. পদার্থবিজ্ঞান, গণিত, ইংরেজি)", () => {
    expect(getRecommendedSubjectNamesForDepartment("গণিত বিভাগ")).toContain("Mathematics");
    expect(getRecommendedSubjectNamesForDepartment("পদার্থ বিজ্ঞান")).toContain("Physics");
    expect(getRecommendedSubjectNamesForDepartment("ইংরেজি বিভাগ")).toContain("English");
  });

  it("returns empty array for unknown, empty, or null department names", () => {
    expect(getRecommendedSubjectNamesForDepartment("")).toEqual([]);
    expect(getRecommendedSubjectNamesForDepartment(null)).toEqual([]);
    expect(getRecommendedSubjectNamesForDepartment(undefined)).toEqual([]);
    expect(getRecommendedSubjectNamesForDepartment("Unknown Mystery Dept 12345")).toEqual([]);
  });

  it("sorts and badges recommended subjects to the top of the options list", () => {
    const catalogOptions = [
      { id: "1", label: "Bangla" },
      { id: "2", label: "Accounting" },
      { id: "3", label: "Mathematics" },
      { id: "4", label: "Physics" },
      { id: "5", label: "Higher Mathematics" },
    ];

    const sorted = sortAndBadgeSubjectsForDepartment(catalogOptions, "Mathematics");

    expect(sorted[0].label).toBe("Mathematics");
    expect(sorted[0].badge).toBe("Recommended");

    expect(sorted[1].label).toBe("Higher Mathematics");
    expect(sorted[1].badge).toBe("Recommended");

    // Other options follow without badge
    expect(sorted[2].badge).toBeUndefined();
    expect(sorted[3].badge).toBeUndefined();
    expect(sorted[4].badge).toBeUndefined();

    // Verify all original options are preserved
    expect(sorted.map(s => s.id)).toHaveLength(5);
  });

  it("leaves options unchanged if no department is specified", () => {
    const catalogOptions = [
      { id: "1", label: "Bangla" },
      { id: "2", label: "English" },
    ];
    const sorted = sortAndBadgeSubjectsForDepartment(catalogOptions, "");
    expect(sorted).toEqual(catalogOptions);
  });
});
