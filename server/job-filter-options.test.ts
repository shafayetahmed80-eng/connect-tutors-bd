import { describe, expect, it } from "vitest";
import { buildJobFilterOptions, type JobFilterOptionRow } from "./job-filter-options";

const row = (over: Partial<JobFilterOptionRow>): JobFilterOptionRow => ({
  cityLocationId: "dhaka", locationId: "banasree", locationLabel: "Banasree, Dhaka", tuitionType: "home", daysPerWeek: 3,
  category: "Bangla Medium", classCourse: "Class 5", subjects: JSON.stringify(["Math", "English"]), ...over,
});

const cities = new Map([["dhaka", "Dhaka"], ["ctg", "Chattogram"]]);

describe("buildJobFilterOptions", () => {
  it("offers each value once, sorted, from the tuitions it is given", () => {
    const options = buildJobFilterOptions([
      row({}),
      row({ tuitionType: "online", daysPerWeek: 5, classCourse: "Class 8", subjects: JSON.stringify(["Physics"]), category: "English Version" }),
      row({ daysPerWeek: 3 }),
    ], cities);

    expect(options.tuitionTypes).toEqual(["home", "online"]);
    expect(options.daysPerWeek).toEqual([3, 5]);
    expect(options.classesByCategory).toEqual({ "Bangla Medium": ["Class 5"], "English Version": ["Class 8"] });
    expect(options.subjectsByClass).toEqual({ "Class 5": ["English", "Math"], "Class 8": ["Physics"] });
  });

  it("pairs a City with its areas, naming the area without its City", () => {
    const options = buildJobFilterOptions([
      row({}),
      row({ cityLocationId: "ctg", locationId: "agrabad", locationLabel: "Agrabad, Chattogram" }),
      row({ cityLocationId: "ctg", locationId: "nasirabad", locationLabel: "Nasirabad" }),
    ], cities);

    expect(options.cities).toEqual([{ id: "ctg", label: "Chattogram" }, { id: "dhaka", label: "Dhaka" }]);
    expect(options.locationsByCity.dhaka).toEqual([{ id: "banasree", label: "Banasree" }]);
    expect(options.locationsByCity.ctg).toEqual([{ id: "agrabad", label: "Agrabad" }, { id: "nasirabad", label: "Nasirabad" }]);
  });

  it("keeps a tuition with no area, and reads a broken subject list as no subjects", () => {
    const noArea = { locationId: null, locationLabel: null };
    const options = buildJobFilterOptions([
      row(noArea),
      row({ ...noArea, classCourse: "Class 6", subjects: "not json" }),
      row({ ...noArea, classCourse: "Class 7", subjects: JSON.stringify([" Math ", 3, ""]) }),
    ], cities);

    expect(options.locationsByCity).toEqual({});
    expect(options.cities).toEqual([{ id: "dhaka", label: "Dhaka" }]);
    expect(options.subjectsByClass["Class 6"]).toEqual([]);
    expect(options.subjectsByClass["Class 7"]).toEqual(["Math"]);
  });

  it("falls back to the City's id when its label is not known", () => {
    expect(buildJobFilterOptions([row({ cityLocationId: "unknown-city", locationId: null })], new Map()).cities).toEqual([{ id: "unknown-city", label: "unknown-city" }]);
  });
});
