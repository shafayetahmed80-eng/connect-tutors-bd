import { describe, expect, it } from "vitest";
import { buildTutorFilterOptions } from "./tutor-filter-options";

const cityLabels = new Map([["dhaka", "Dhaka"], ["sylhet", "Sylhet"]]);

describe("buildTutorFilterOptions", () => {
  it("offers each City once, with the areas Tutors teach from under it, sorted by name", () => {
    const options = buildTutorFilterOptions([
      { cityLocationId: "dhaka", locationId: "uttara", locationLabel: "Uttara" },
      { cityLocationId: "dhaka", locationId: "adabor", locationLabel: "Adabor" },
      { cityLocationId: "dhaka", locationId: "adabor", locationLabel: "Adabor" },
      { cityLocationId: "sylhet", locationId: "zindabazar", locationLabel: "Zindabazar" },
    ], cityLabels, []);
    expect(options.cities).toEqual([{ id: "dhaka", label: "Dhaka" }, { id: "sylhet", label: "Sylhet" }]);
    expect(options.locationsByCity).toEqual({
      dhaka: [{ id: "adabor", label: "Adabor" }, { id: "uttara", label: "Uttara" }],
      sylhet: [{ id: "zindabazar", label: "Zindabazar" }],
    });
  });

  it("offers every subject a Tutor has picked, once, sorted, by the name the catalog gives it", () => {
    const options = buildTutorFilterOptions([
      { cityLocationId: "dhaka", locationId: "adabor", locationLabel: "Adabor" },
    ], cityLabels, ["Physics", "Mathematics", "Physics", " Biology ", ""]);
    expect(options.subjects).toEqual(["Biology", "Mathematics", "Physics"]);
  });

  it("keeps the subjects of a Tutor with no City yet and leaves them out of the places", () => {
    const options = buildTutorFilterOptions([
      { cityLocationId: null, locationId: "adabor", locationLabel: "Adabor" },
    ], cityLabels, ["Chemistry"]);
    expect(options.cities).toEqual([]);
    expect(options.locationsByCity).toEqual({});
    expect(options.subjects).toEqual(["Chemistry"]);
  });

  it("offers no subjects while no Tutor has picked one", () => {
    expect(buildTutorFilterOptions([], cityLabels, []).subjects).toEqual([]);
  });

  it("falls back to the id when a City has no label on file", () => {
    const options = buildTutorFilterOptions([{ cityLocationId: "khulna", locationId: "sonadanga", locationLabel: null }], cityLabels, []);
    expect(options.cities).toEqual([{ id: "khulna", label: "khulna" }]);
    expect(options.locationsByCity.khulna).toEqual([{ id: "sonadanga", label: "sonadanga" }]);
  });
});
