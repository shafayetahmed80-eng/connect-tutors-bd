import { describe, expect, it } from "vitest";
import { buildTutorFilterOptions } from "./tutor-filter-options";

const cityLabels = new Map([["dhaka", "Dhaka"], ["sylhet", "Sylhet"]]);

describe("buildTutorFilterOptions", () => {
  it("offers each City once, with the areas Tutors teach from under it, sorted by name", () => {
    const options = buildTutorFilterOptions([
      { cityLocationId: "dhaka", locationId: "uttara", locationLabel: "Uttara", subjects: null },
      { cityLocationId: "dhaka", locationId: "adabor", locationLabel: "Adabor", subjects: null },
      { cityLocationId: "dhaka", locationId: "adabor", locationLabel: "Adabor", subjects: null },
      { cityLocationId: "sylhet", locationId: "zindabazar", locationLabel: "Zindabazar", subjects: null },
    ], cityLabels);
    expect(options.cities).toEqual([{ id: "dhaka", label: "Dhaka" }, { id: "sylhet", label: "Sylhet" }]);
    expect(options.locationsByCity).toEqual({
      dhaka: [{ id: "adabor", label: "Adabor" }, { id: "uttara", label: "Uttara" }],
      sylhet: [{ id: "zindabazar", label: "Zindabazar" }],
    });
  });

  it("offers every subject any Tutor teaches, once, sorted, reading the stored JSON list", () => {
    const options = buildTutorFilterOptions([
      { cityLocationId: "dhaka", locationId: "adabor", locationLabel: "Adabor", subjects: JSON.stringify(["Physics", "Mathematics"]) },
      { cityLocationId: "dhaka", locationId: "uttara", locationLabel: "Uttara", subjects: JSON.stringify(["Physics", " Biology "]) },
    ], cityLabels);
    expect(options.subjects).toEqual(["Biology", "Mathematics", "Physics"]);
  });

  it("keeps a Tutor with no City yet for their subjects and leaves them out of the places", () => {
    const options = buildTutorFilterOptions([
      { cityLocationId: null, locationId: "adabor", locationLabel: "Adabor", subjects: JSON.stringify(["Chemistry"]) },
    ], cityLabels);
    expect(options.cities).toEqual([]);
    expect(options.locationsByCity).toEqual({});
    expect(options.subjects).toEqual(["Chemistry"]);
  });

  it("reads a subjects value that is missing or is not a list as no subjects, not as a failure", () => {
    const options = buildTutorFilterOptions([
      { cityLocationId: "dhaka", locationId: "adabor", locationLabel: "Adabor", subjects: "not json" },
      { cityLocationId: "dhaka", locationId: "uttara", locationLabel: "Uttara", subjects: JSON.stringify({ not: "a list" }) },
      { cityLocationId: "dhaka", locationId: "mirpur", locationLabel: "Mirpur", subjects: "" },
    ], cityLabels);
    expect(options.subjects).toEqual([]);
  });

  it("falls back to the id when a City has no label on file", () => {
    const options = buildTutorFilterOptions([{ cityLocationId: "khulna", locationId: "sonadanga", locationLabel: null, subjects: null }], cityLabels);
    expect(options.cities).toEqual([{ id: "khulna", label: "khulna" }]);
    expect(options.locationsByCity.khulna).toEqual([{ id: "sonadanga", label: "sonadanga" }]);
  });
});
