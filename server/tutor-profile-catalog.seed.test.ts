import { describe, expect, it } from "vitest";
import {
  buildTutorProfileCatalogSeedPlan,
  normalizeCatalogName,
} from "./tutor-profile-catalog.seed";

describe("Tutor Profile academic catalog seed plan", () => {
  it("normalizes selector names deterministically for database uniqueness", () => {
    expect(normalizeCatalogName("  University  of  Dhaka ")).toBe(
      "university of dhaka"
    );
    expect(normalizeCatalogName("North South University")).toBe(
      "north south university"
    );
  });

  it("uses the supplied Bangladesh university directory as the Institute source", () => {
    const plan = buildTutorProfileCatalogSeedPlan();
    const normalizedUniversities = plan.universities.map(
      university => university.normalizedName
    );

    expect(plan.universities).toHaveLength(169);
    expect(new Set(normalizedUniversities).size).toBe(plan.universities.length);
    expect(normalizedUniversities).toEqual(
      expect.arrayContaining([
        "university of dhaka",
        "north south university (nsu)",
        "brac university (bracu)",
        "east west university (ewu)",
      ])
    );
  });

  it("keeps Chittagong institution names canonical and distinct", () => {
    const plan = buildTutorProfileCatalogSeedPlan();
    const chittagongNames = plan.universities
      .filter(university => university.normalizedName.includes("chittagong"))
      .map(university => university.name);

    expect(chittagongNames).toContain("University of Chittagong");
    expect(chittagongNames).toContain("Chittagong Medical University");
    expect(chittagongNames).not.toContain("Chittagong Medical University (CMU)");
    expect(new Set(plan.universities.map(university => university.normalizedName)).size).toBe(plan.universities.length);
  });

  it("preserves the supplied Institute → Faculty → Department/Subject chain", () => {
    const plan = buildTutorProfileCatalogSeedPlan();
    const university = "University of Dhaka";
    const faculty = "Faculty of Arts";
    const department = "Department of Bangla";

    expect(plan.universities.map(option => option.normalizedName)).toContain(
      normalizeCatalogName(university)
    );
    expect(plan.faculties).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          universityNormalizedName: normalizeCatalogName(university),
          name: faculty,
          normalizedName: normalizeCatalogName(faculty),
        }),
      ])
    );
    expect(plan.departments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          universityNormalizedName: normalizeCatalogName(university),
          facultyNormalizedName: normalizeCatalogName(faculty),
          name: department,
          normalizedName: normalizeCatalogName(department),
        }),
      ])
    );
  });

  it("links every Faculty and Department/Subject to its seeded parent", () => {
    const plan = buildTutorProfileCatalogSeedPlan();
    const universityNames = new Set(
      plan.universities.map(university => university.normalizedName)
    );
    const facultyKeys = new Set(
      plan.faculties.map(
        faculty => `${faculty.universityNormalizedName}:${faculty.normalizedName}`
      )
    );

    for (const faculty of plan.faculties) {
      expect(universityNames.has(faculty.universityNormalizedName)).toBe(true);
    }
    for (const department of plan.departments) {
      expect(
        facultyKeys.has(
          `${department.universityNormalizedName}:${department.facultyNormalizedName}`
        )
      ).toBe(true);
    }
  });

  it("keeps hierarchy records unique and preserves controlled profile selector options", () => {
    const plan = buildTutorProfileCatalogSeedPlan();
    const departmentKeys = plan.departments.map(
      department =>
        `${department.universityNormalizedName}:${department.facultyNormalizedName}:${department.normalizedName}`
    );
    const optionGroups = [
      plan.subjects,
      plan.classLevels,
      plan.curricula,
      plan.studentTypes,
      plan.languages,
    ];

    expect(plan.faculties.length).toBeGreaterThan(0);
    expect(plan.departments.length).toBeGreaterThan(1_000);
    expect(new Set(departmentKeys).size).toBe(plan.departments.length);
    expect(plan.subjects.map(subject => subject.normalizedName)).toEqual(
      expect.arrayContaining(["mathematics", "bangla", "english", "ict"])
    );
    expect(plan.classLevels.map(level => level.name)).toContain("SSC");
    expect(plan.curricula.map(curriculum => curriculum.name)).toEqual(
      expect.arrayContaining(["Bangladesh National Curriculum", "English Medium"])
    );

    for (const options of optionGroups) {
      expect(new Set(options.map(option => option.normalizedName)).size).toBe(
        options.length
      );
      expect(options.map(option => option.sortOrder)).toEqual(
        options.map((_, index) => index + 1)
      );
      expect(options.every(option => option.active === 1)).toBe(true);
    }
  });
});
