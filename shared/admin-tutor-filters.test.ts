import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADMIN_TUTOR_FILTERS,
  adminTutorFilterAlerts,
  buildAdminTutorFilterInput,
  countAdminTutorFilters,
  reconcileAdminTutorFilters,
} from "./admin-tutor-filters";

describe("buildAdminTutorFilterInput", () => {
  it("sends nothing for a panel nobody has touched", () => {
    expect(buildAdminTutorFilterInput(DEFAULT_ADMIN_TUTOR_FILTERS)).toEqual({});
  });

  it("turns what was typed into what the server takes, and leaves out what is blank", () => {
    const input = buildAdminTutorFilterInput({
      ...DEFAULT_ADMIN_TUTOR_FILTERS,
      verified: "verified",
      gender: "female",
      cityId: " dhaka ",
      locationIds: ["adabor"],
      subjects: ["Physics"],
      experienceFrom: " 3 ",
      experienceTo: "",
      ratingFrom: "4.5",
      joinedFrom: "2026-08-01",
      joinedTo: "2026-09-30",
    });
    expect(input).toEqual({
      verified: "verified",
      gender: "female",
      cityId: "dhaka",
      locationIds: ["adabor"],
      subjects: ["Physics"],
      experienceFrom: 3,
      ratingFrom: 4.5,
      // Whole days: the last one runs to its final moment, or a Tutor who joined at noon would fall outside it.
      joinedFrom: new Date("2026-08-01T00:00:00"),
      joinedTo: new Date("2026-09-30T23:59:59.999"),
    });
  });

  it("reads a box that holds words, a fraction of a year or a rating above five as nothing", () => {
    expect(buildAdminTutorFilterInput({ ...DEFAULT_ADMIN_TUTOR_FILTERS, experienceFrom: "abc", experienceTo: "2.5", ratingFrom: "9", ratingTo: "4.55" })).toEqual({});
  });
});

describe("countAdminTutorFilters", () => {
  it("counts the filters that are narrowing, one each, and not a box that reads as nothing", () => {
    expect(countAdminTutorFilters(DEFAULT_ADMIN_TUTOR_FILTERS)).toBe(0);
    expect(countAdminTutorFilters({ ...DEFAULT_ADMIN_TUTOR_FILTERS, gender: "male", subjects: ["Physics", "Biology"], experienceFrom: "2" })).toBe(3);
    expect(countAdminTutorFilters({ ...DEFAULT_ADMIN_TUTOR_FILTERS, experienceFrom: "abc" })).toBe(0);
  });
});

describe("adminTutorFilterAlerts", () => {
  it("says nothing while every range is the right way round", () => {
    expect(adminTutorFilterAlerts({ ...DEFAULT_ADMIN_TUTOR_FILTERS, experienceFrom: "2", experienceTo: "9", ratingFrom: "3", ratingTo: "5", joinedFrom: "2026-08-01", joinedTo: "2026-08-01" })).toEqual([]);
  });

  it("names each range that is the wrong way round", () => {
    expect(adminTutorFilterAlerts({ ...DEFAULT_ADMIN_TUTOR_FILTERS, experienceFrom: "9", experienceTo: "2", ratingFrom: "5", ratingTo: "3", joinedFrom: "2026-09-01", joinedTo: "2026-08-01" })).toEqual([
      "The lowest experience cannot be above the highest.",
      "The lowest rating cannot be above the highest.",
      "The 'from' date cannot be later than the 'to' date.",
    ]);
  });
});

describe("reconcileAdminTutorFilters", () => {
  const options = { locationsByCity: { dhaka: [{ id: "adabor", label: "Adabor" }], sylhet: [{ id: "zindabazar", label: "Zindabazar" }] } };

  it("keeps the areas that belong to the City chosen", () => {
    expect(reconcileAdminTutorFilters({ ...DEFAULT_ADMIN_TUTOR_FILTERS, cityId: "dhaka", locationIds: ["adabor"] }, options).locationIds).toEqual(["adabor"]);
  });

  it("drops an area when its City is changed or cleared", () => {
    expect(reconcileAdminTutorFilters({ ...DEFAULT_ADMIN_TUTOR_FILTERS, cityId: "sylhet", locationIds: ["adabor"] }, options).locationIds).toEqual([]);
    expect(reconcileAdminTutorFilters({ ...DEFAULT_ADMIN_TUTOR_FILTERS, cityId: "", locationIds: ["adabor"] }, options).locationIds).toEqual([]);
  });
});
