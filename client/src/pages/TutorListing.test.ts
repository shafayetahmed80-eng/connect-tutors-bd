import { describe, expect, it } from "vitest";
import { getActiveFilterChips, getDirectoryFilterControlId, type ListingState } from "./TutorListing";

const defaultFilters: ListingState = {
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
};

describe("Tutor Directory mobile filter summary", () => {
  it("shows one dismissible chip per applied filter and ignores default values", () => {
    expect(getActiveFilterChips(defaultFilters)).toEqual([]);

    expect(getActiveFilterChips({
      ...defaultFilters,
      query: "  mathematics ",
      city: "Dhaka",
      mode: "online",
      subjects: ["Mathematics", "Physics"],
      verifiedOnly: true,
      minFee: 5000,
    })).toEqual([
      { key: "query", label: "Search: mathematics" },
      { key: "city", label: "Dhaka" },
      { key: "mode", label: "Online tuition" },
      { key: "subjects:Mathematics", label: "Mathematics" },
      { key: "subjects:Physics", label: "Physics" },
      { key: "verifiedOnly", label: "Verified" },
      { key: "fee", label: "From ৳5,000" },
    ]);
  });

  it("uses distinct accessible control IDs for the desktop rail and mobile filter sheet", () => {
    expect(getDirectoryFilterControlId("desktop", "country")).toBe("listing-country");
    expect(getDirectoryFilterControlId("mobile", "country")).toBe("mobile-listing-country");
    expect(getDirectoryFilterControlId("desktop", "subjects")).not.toBe(getDirectoryFilterControlId("mobile", "subjects"));
  });
});
