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

    expect(plan.universities).toHaveLength(311);
    expect(new Set(normalizedUniversities).size).toBe(plan.universities.length);
    expect(normalizedUniversities).toEqual(
      expect.arrayContaining([
        "university of dhaka",
        "north south university (nsu)",
        "brac university (bracu)",
        "east west university (ewu)",
        // medical / dental colleges, the former DU seven colleges, and the catch-all
        "dhaka medical college",
        "armed forces medical college (afmc)",
        "bangladesh medical college",
        "dhaka dental college",
        "government titumir college",
        "others",
      ])
    );
    // "Others" is spread first so it always sorts to the top of Institute search.
    expect(normalizedUniversities[0]).toBe("others");
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

  it("builds one flat, deduplicated Department/Subject vocabulary with no Faculty layer", () => {
    const plan = buildTutorProfileCatalogSeedPlan();

    expect(plan).not.toHaveProperty("faculties");
    const departmentNames = plan.departments.map(option => option.normalizedName);
    expect(departmentNames).toEqual(
      expect.arrayContaining([
        "bangla",
        "english",
        "computer science and engineering",
        "bachelor of medicine, bachelor of surgery (mbbs)",
        "bachelor of dental surgery (bds)",
        "others",
      ]),
    );
    expect(new Set(departmentNames).size).toBe(plan.departments.length);
    expect(plan.departments.every(option => option.active === 1)).toBe(true);
    expect(plan.departments.map((_, index) => index + 1)).toEqual(
      plan.departments.map(option => option.sortOrder),
    );
  });

  it("keeps hierarchy records unique and preserves controlled profile selector options", () => {
    const plan = buildTutorProfileCatalogSeedPlan();
    const optionGroups = [
      plan.departments,
      plan.subjects,
      plan.classLevels,
      plan.curricula,
      plan.studentTypes,
      plan.languages,
    ];

    expect(plan.departments.length).toBeGreaterThan(100);
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
