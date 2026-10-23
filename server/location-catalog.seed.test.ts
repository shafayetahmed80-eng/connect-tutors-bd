import { describe, expect, it } from "vitest";
import { suppliedLocations } from "./location-catalog.seed";
import { isValidChildType, locationTypes, type LocationType } from "@shared/location-catalog";

/**
 * The shipped catalog is data, and data rots quietly. These check the file
 * itself rather than the database, so a bad export is caught before it is
 * seeded anywhere.
 */
describe("shipped location catalog", () => {
  const byId = new Map(suppliedLocations.map(row => [row.id, row]));

  it("carries the whole tree, not a fragment", () => {
    // A fresh `db:migrate` alone gives 162 rows with two cities and no thanas,
    // which is why this file exists at all.
    expect(suppliedLocations.length).toBe(738);
  });

  it("has exactly one root, and it is the country", () => {
    const roots = suppliedLocations.filter(row => row.parentId === null);
    expect(roots).toHaveLength(1);
    expect(roots[0]).toMatchObject({ id: "bd", type: "country" });
  });

  it("gives every id once", () => {
    expect(byId.size).toBe(suppliedLocations.length);
  });

  it("leaves nothing orphaned", () => {
    // A row whose parent is missing is a row no breadcrumb reaches.
    const orphans = suppliedLocations.filter(row => row.parentId !== null && !byId.has(row.parentId));
    expect(orphans.map(row => row.id)).toEqual([]);
  });

  it("lists a parent before its children, because the seed inserts in file order", () => {
    const seen = new Set<string>();
    for (const row of suppliedLocations) {
      if (row.parentId !== null) {
        expect(seen.has(row.parentId), `${row.id} comes before its parent ${row.parentId}`).toBe(true);
      }
      seen.add(row.id);
    }
  });

  it("obeys the same rank rule the Admin editor enforces", () => {
    // Otherwise the Owner could not have added these rows themselves, and the
    // shipped data would contradict the screen that edits it.
    for (const row of suppliedLocations) {
      if (row.parentId === null) continue;
      const parent = byId.get(row.parentId)!;
      expect(
        isValidChildType(parent.type as LocationType, row.type as LocationType),
        `${parent.type} -> ${row.type} (${row.id})`,
      ).toBe(true);
    }
  });

  it("uses only types the schema declares", () => {
    for (const row of suppliedLocations) {
      expect(locationTypes as readonly string[], row.id).toContain(row.type);
    }
  });

  it("has no two places sharing a name under one parent", () => {
    // The unique index is (parentId, type, label); a clash would make the seed
    // fail partway through on a fresh database.
    const seen = new Set<string>();
    for (const row of suppliedLocations) {
      const key = `${row.parentId ?? "-"}|${row.type}|${row.label}`;
      expect(seen.has(key), `duplicate: ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it("labels every row and keeps them inside the column", () => {
    for (const row of suppliedLocations) {
      expect(row.label.trim().length, row.id).toBeGreaterThan(0);
      expect(row.label.length, row.id).toBeLessThanOrEqual(160);
      expect(row.id.length, row.id).toBeLessThanOrEqual(80);
    }
  });
  it("includes high-demand residential and tuition locations across major divisions", () => {
    const keyLocations = [
      { id: "dhaka-area-nikunja-1", label: "Nikunja 1", parentId: "dhaka-city" },
      { id: "dhaka-area-nikunja-2", label: "Nikunja 2", parentId: "dhaka-city" },
      { id: "dhaka-area-niketon", label: "Niketon", parentId: "dhaka-city" },
      { id: "dhaka-area-kazipara", label: "Kazipara", parentId: "dhaka-city" },
      { id: "dhaka-area-shewrapara", label: "Shewrapara", parentId: "dhaka-city" },
      { id: "chattogram-area-2-no-gate", label: "2 No Gate", parentId: "chattogram-city" },
      { id: "sylhet-area-shahi-eidgah", label: "Shahi Eidgah", parentId: "sylhet-city" },
      { id: "rajshahi-area-vodra-more", label: "Vodra More", parentId: "rajshahi-city" },
      { id: "khulna-area-moylapota-more", label: "Moylapota More", parentId: "khulna-city" },
      { id: "barishal-area-natun-bazar", label: "Natun Bazar", parentId: "barishal-city" },
      { id: "mymensingh-area-ganginarpar-more", label: "Ganginarpar More", parentId: "mymensingh-city" },
      { id: "rangpur-area-jahaj-company-more", label: "Jahaj Company More", parentId: "rangpur-city" },
    ];

    for (const expected of keyLocations) {
      const match = byId.get(expected.id);
      expect(match).toBeDefined();
      expect(match).toMatchObject({
        id: expected.id,
        label: expected.label,
        parentId: expected.parentId,
        type: "area",
      });
    }
  });
});
