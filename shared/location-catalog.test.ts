import { describe, expect, it } from "vitest";
import {
  childTypesFor,
  isValidChildType,
  locationSlug,
  locationTypeRank,
  locationTypes,
} from "./location-catalog";

describe("location catalog rules", () => {
  it("accepts every parent/child shape the shipped catalog already contains", () => {
    // Taken from the 597 rows as they stand. A rule that rejected one of these
    // would make part of the site uneditable.
    const shipped: Array<[string, string]> = [
      ["country", "city"],
      ["country", "district"],
      ["city", "thana"],
      ["city", "upazila"],
      ["city", "area"],
      ["district", "upazila"],
      ["district", "area"],
      ["thana", "subdivision"],
      ["thana", "area"],
    ];
    for (const [parent, child] of shipped) {
      expect(isValidChildType(parent as never, child as never), `${parent} -> ${child}`).toBe(true);
    }
  });

  it("refuses a child that would sit at or above its parent", () => {
    expect(isValidChildType("area", "city")).toBe(false);
    expect(isValidChildType("city", "country")).toBe(false);
    // Siblings, so neither may hold the other.
    expect(isValidChildType("city", "district")).toBe(false);
    expect(isValidChildType("thana", "upazila")).toBe(false);
  });

  it("offers only the types that may go beneath a parent", () => {
    expect(childTypesFor("thana")).toEqual(["subdivision", "area"]);
    expect(childTypesFor("area")).toEqual([]);
    expect(childTypesFor("country")).toEqual(["division", "district", "city", "upazila", "thana", "subdivision", "area"]);
  });

  it("ranks every type it lists, so no type can slip through unranked", () => {
    for (const type of locationTypes) expect(typeof locationTypeRank[type]).toBe("number");
  });

  it("makes ids in the style of the stored ones", () => {
    expect(locationSlug("Mirpur Section 10")).toBe("mirpur-section-10");
    expect(locationSlug("  Cox's Bazar  ")).toBe("cox-s-bazar");
  });

  it("returns nothing for a label with no Latin letters, so the caller falls back", () => {
    // A Bangla label slugifies to an empty string; an empty id would collide
    // with itself, so db.ts generates one instead.
    expect(locationSlug("মিরপুর")).toBe("");
  });
});
