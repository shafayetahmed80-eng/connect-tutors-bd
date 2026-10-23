import { describe, expect, it } from "vitest";
import { buildCombinedCityLocationOptions } from "./registration-location-selector";

const rows = [
  { id: "dhaka-city", label: "Dhaka City", type: "city", parentId: null },
  { id: "ctg-city", label: "Chattogram City", type: "city", parentId: null },
  { id: "mirpur", label: "Mirpur", type: "thana", parentId: "dhaka-city" },
  { id: "uttara", label: "Uttara", type: "thana", parentId: "dhaka-city" },
  { id: "dhanmondi", label: "Dhanmondi", type: "area", parentId: "dhaka-city" },
  { id: "mirpur-10", label: "Mirpur-10", type: "area", parentId: "mirpur" },
  { id: "uttara-7", label: "Sector 7", type: "subdivision", parentId: "uttara" },
  { id: "halishahar", label: "Halishahar", type: "thana", parentId: "ctg-city" },
  { id: "halishahar-a", label: "Block A", type: "area", parentId: "halishahar" },
] as const;

describe("buildCombinedCityLocationOptions", () => {
  it("includes only the selected City's parent locations and child sub-areas with disambiguating labels", () => {
    expect(buildCombinedCityLocationOptions("dhaka-city", rows)).toEqual([
      { id: "dhanmondi", label: "Dhanmondi", type: "area", parentId: "dhaka-city" },
      { id: "mirpur", label: "Mirpur", type: "thana", parentId: "dhaka-city" },
      { id: "uttara", label: "Uttara", type: "thana", parentId: "dhaka-city" },
      { id: "mirpur-10", label: "Mirpur-10 — Mirpur", type: "area", parentId: "mirpur" },
      { id: "uttara-7", label: "Sector 7 — Uttara", type: "subdivision", parentId: "uttara" },
    ]);
  });

  it("returns no cross-city locations and safely handles a City with no children", () => {
    expect(buildCombinedCityLocationOptions("missing-city", rows)).toEqual([]);
    expect(buildCombinedCityLocationOptions("ctg-city", rows)).toEqual([
      { id: "halishahar", label: "Halishahar", type: "thana", parentId: "ctg-city" },
      { id: "halishahar-a", label: "Block A — Halishahar", type: "area", parentId: "halishahar" },
    ]);
  });

  it("suppresses a direct Area when the same City has an identically named direct Thana", () => {
    const duplicateRows = [
      { id: "ctg-city", label: "Chattogram City", type: "city", parentId: null },
      { id: "bandar-thana", label: "Bandar", type: "thana", parentId: "ctg-city" },
      { id: "bandar-area", label: "Bandar", type: "area", parentId: "ctg-city" },
      { id: "bay-terminal", label: "Bay Terminal", type: "area", parentId: "ctg-city" },
    ] as const;

    expect(buildCombinedCityLocationOptions("ctg-city", duplicateRows)).toEqual([
      { id: "bandar-thana", label: "Bandar", type: "thana", parentId: "ctg-city" },
      { id: "bay-terminal", label: "Bay Terminal", type: "area", parentId: "ctg-city" },
    ]);
  });

  it("keeps a single entry when two direct locations resolve to the same visible label", () => {
    const rows = [
      { id: "dhaka-city", label: "Dhaka City", type: "city", parentId: null },
      { id: "adabor-thana", label: "Adabor", type: "thana", parentId: "dhaka-city" },
      { id: "adabor-upazila", label: "Adabor", type: "upazila", parentId: "dhaka-city" },
      { id: "adabor-subdiv", label: "Adabor", type: "subdivision", parentId: "dhaka-city" },
    ] as const;

    expect(buildCombinedCityLocationOptions("dhaka-city", rows)).toEqual([
      { id: "adabor-thana", label: "Adabor", type: "thana", parentId: "dhaka-city" },
    ]);
  });

  it("folds a child that carries its own parent's name into the parent instead of showing 'Name — Name'", () => {
    const rows = [
      { id: "dhaka-city", label: "Dhaka City", type: "city", parentId: null },
      { id: "adabor-thana", label: "Adabor", type: "thana", parentId: "dhaka-city" },
      { id: "adabor-area", label: "Adabor", type: "area", parentId: "adabor-thana" },
    ] as const;

    expect(buildCombinedCityLocationOptions("dhaka-city", rows)).toEqual([
      { id: "adabor-thana", label: "Adabor", type: "thana", parentId: "dhaka-city" },
    ]);
  });

  it("collapses a genuine duplicate seed row and never emits a repeated id or label", () => {
    const rows = [
      { id: "dhaka-city", label: "Dhaka City", type: "city", parentId: null },
      { id: "mohammadpur", label: "Mohammadpur", type: "thana", parentId: "dhaka-city" },
      { id: "mohammadpur", label: "Mohammadpur", type: "thana", parentId: "dhaka-city" },
      { id: "mohammadpur-dup", label: "Mohammadpur", type: "thana", parentId: "dhaka-city" },
    ] as const;

    const options = buildCombinedCityLocationOptions("dhaka-city", rows);
    expect(options).toEqual([
      { id: "mohammadpur", label: "Mohammadpur", type: "thana", parentId: "dhaka-city" },
    ]);
    expect(new Set(options.map(option => option.id)).size).toBe(options.length);
    expect(new Set(options.map(option => option.label.toLocaleLowerCase())).size).toBe(options.length);
  });
  it("resolves newly added tuition locations under Dhaka and Chattogram without collisions", () => {
    const customRows = [
      { id: "dhaka-city", label: "Dhaka", type: "city", parentId: "bd" },
      { id: "dhaka-area-nikunja-1", label: "Nikunja 1", type: "area", parentId: "dhaka-city" },
      { id: "dhaka-area-nikunja-2", label: "Nikunja 2", type: "area", parentId: "dhaka-city" },
      { id: "dhaka-area-niketon", label: "Niketon", type: "area", parentId: "dhaka-city" },
      { id: "dhaka-area-kazipara", label: "Kazipara", type: "area", parentId: "dhaka-city" },
      { id: "dhaka-area-shewrapara", label: "Shewrapara", type: "area", parentId: "dhaka-city" },
      { id: "chattogram-city", label: "Chattogram", type: "city", parentId: "bd" },
      { id: "chattogram-area-2-no-gate", label: "2 No Gate", type: "area", parentId: "chattogram-city" },
    ] as const;

    const dhakaOptions = buildCombinedCityLocationOptions("dhaka-city", customRows);
    expect(dhakaOptions.map(opt => opt.label)).toEqual([
      "Kazipara",
      "Niketon",
      "Nikunja 1",
      "Nikunja 2",
      "Shewrapara",
    ]);

    const ctgOptions = buildCombinedCityLocationOptions("chattogram-city", customRows);
    expect(ctgOptions.map(opt => opt.label)).toEqual([
      "2 No Gate",
    ]);
  });
  it("resolves Phase 2 tuition locations under Dhaka, Chattogram, and Narayanganj", () => {
    const rows = [
      { id: "dhaka-city", label: "Dhaka", type: "city", parentId: "bd" },
      { id: "dhaka-area-lalmatia", label: "Lalmatia", type: "area", parentId: "dhaka-city" },
      { id: "dhaka-area-segunbagicha", label: "Segunbagicha", type: "area", parentId: "dhaka-city" },
      { id: "chattogram-city", label: "Chattogram", type: "city", parentId: "bd" },
      { id: "chattogram-area-cheragi-pahar", label: "Cheragi Pahar", type: "area", parentId: "chattogram-city" },
      { id: "narayanganj-district", label: "Narayanganj", type: "district", parentId: "bd" },
      { id: "narayanganj-area-chashara-more", label: "Chashara More", type: "area", parentId: "narayanganj-district" },
    ] as const;

    const dhakaOpts = buildCombinedCityLocationOptions("dhaka-city", rows);
    expect(dhakaOpts.map(o => o.label)).toEqual(["Lalmatia", "Segunbagicha"]);

    const ctgOpts = buildCombinedCityLocationOptions("chattogram-city", rows);
    expect(ctgOpts.map(o => o.label)).toEqual(["Cheragi Pahar"]);

    const ngOpts = buildCombinedCityLocationOptions("narayanganj-district", rows);
    expect(ngOpts.map(o => o.label)).toEqual(["Chashara More"]);
  });
  it("resolves Phase 3 tuition locations under new education hubs (Bogura, Jashore, Kushtia)", () => {
    const rows = [
      { id: "bogura-city", label: "Bogura", type: "city", parentId: "bd" },
      { id: "bogura-area-jaleshwaritola", label: "Jaleshwaritola", type: "area", parentId: "bogura-city" },
      { id: "bogura-area-shatmatha", label: "Shatmatha Bogura", type: "area", parentId: "bogura-city" },
      { id: "jashore-city", label: "Jashore", type: "city", parentId: "bd" },
      { id: "jashore-area-palbari-more", label: "Palbari More Jashore", type: "area", parentId: "jashore-city" },
      { id: "kushtia-city", label: "Kushtia", type: "city", parentId: "bd" },
      { id: "kushtia-area-ns-road", label: "NS Road Kushtia", type: "area", parentId: "kushtia-city" },
    ] as const;

    const boguraOpts = buildCombinedCityLocationOptions("bogura-city", rows);
    expect(boguraOpts.map(o => o.label)).toEqual(["Jaleshwaritola", "Shatmatha Bogura"]);

    const jashoreOpts = buildCombinedCityLocationOptions("jashore-city", rows);
    expect(jashoreOpts.map(o => o.label)).toEqual(["Palbari More Jashore"]);

    const kushtiaOpts = buildCombinedCityLocationOptions("kushtia-city", rows);
    expect(kushtiaOpts.map(o => o.label)).toEqual(["NS Road Kushtia"]);
  });
});
