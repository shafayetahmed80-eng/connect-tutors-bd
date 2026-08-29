import { describe, expect, it } from "vitest";
import { tutors } from "./tutors";
import { getTutorListingPage, type TutorListingFilters } from "./tutor-listing";

const baseFilters: TutorListingFilters = {
  query: "",
  country: "all",
  city: "all",
  division: "all",
  district: "all",
  mode: "all",
  subjects: [],
  levels: [],
  languages: [],
  gender: "all",
  verifiedOnly: false,
  minFee: undefined,
  maxFee: undefined,
  page: 1,
  pageSize: 2,
};

describe("Tutor Listing contract", () => {
  it("returns only explicitly verified tutors when verified-only is selected", () => {
    const result = getTutorListingPage(tutors, { ...baseFilters, verifiedOnly: true });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((tutor) => tutor.verified)).toBe(true);
  });

  it("supports combined subject, level, gender, language, mode, and fee filters", () => {
    const result = getTutorListingPage(tutors, {
      ...baseFilters,
      subjects: ["Mathematics"],
      levels: ["University"],
      languages: ["English"],
      gender: "male",
      mode: "online",
      minFee: 9000,
      maxFee: 11000,
    });
    expect(result.items.map((tutor) => tutor.id)).toEqual(["t-004"]);
    expect(result.totalItems).toBe(1);
  });

  it("paginates deterministically and clamps an out-of-range page to the last page", () => {
    const pageOne = getTutorListingPage(tutors, { ...baseFilters, page: 1 });
    const lastPage = getTutorListingPage(tutors, { ...baseFilters, page: 99 });
    expect(pageOne.items.map((tutor) => tutor.id)).toEqual(["t-001", "t-002"]);
    expect(lastPage.page).toBe(lastPage.totalPages);
    expect(lastPage.items.length).toBeGreaterThan(0);
  });

  it("returns an empty page safely when filters produce no matches", () => {
    const result = getTutorListingPage(tutors, { ...baseFilters, subjects: ["Nonexistent subject"] });
    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(result.page).toBe(1);
  });
});
