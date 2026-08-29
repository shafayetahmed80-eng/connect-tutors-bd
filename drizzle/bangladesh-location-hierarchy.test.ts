import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const hierarchyMigrationPath = resolve(import.meta.dirname, "0010_bangladesh_location_hierarchy.sql");

describe("supplied Bangladesh Tutor Profile location hierarchy", () => {
  it("seeds thana, upazila, subdivision, and area branches with stable parent links", () => {
    expect(existsSync(hierarchyMigrationPath)).toBe(true);

    const migration = readFileSync(hierarchyMigrationPath, "utf8");

    expect(migration).toContain("'dhaka-thana-uttara', 'Uttara', 'thana', 'Bangladesh', 'dhaka-city'");
    expect(migration).toContain("'dhaka-uttara-sector-1', 'Uttara Sector 1', 'subdivision', 'Bangladesh', 'dhaka-thana-uttara'");
    expect(migration).toContain("'chattogram-thana-halishahar', 'Halishahar', 'thana', 'Bangladesh', 'chattogram-city'");
    expect(migration).toContain("'chattogram-halishahar-block-a', 'Halishahar Block A', 'subdivision', 'Bangladesh', 'chattogram-thana-halishahar'");
    expect(migration).toContain("'sylhet-upazila-balaganj', 'Balaganj', 'upazila', 'Bangladesh', 'sylhet-city', 1");
    expect(migration).toContain("'tangail-upazila-basail', 'Basail', 'upazila', 'Bangladesh', 'tangail-city'");
    expect(migration).toContain("'sirajganj-upazila-belkuchi', 'Belkuchi', 'upazila', 'Bangladesh', 'sirajganj-city', 1");
    expect(migration).toContain("ON DUPLICATE KEY UPDATE");
  });
});
