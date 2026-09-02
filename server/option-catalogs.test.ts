import { describe, expect, it } from "vitest";
import { MAX_OPTION_NAME_LENGTH, findOptionCatalog, optionCatalogIds, optionCatalogs } from "@shared/option-catalogs";
import { optionCatalogNameSchema, optionCatalogSchema } from "./site-content";

describe("option catalog registry", () => {
  it("describes every catalog it declares, so no tab renders without help text", () => {
    expect(optionCatalogs.map(catalog => catalog.id)).toEqual([...optionCatalogIds]);
    for (const catalog of optionCatalogs) {
      expect(catalog.label.length, catalog.id).toBeGreaterThan(0);
      expect(catalog.usedFor.length, catalog.id).toBeGreaterThan(0);
      expect(catalog.itemLabel.length, catalog.id).toBeGreaterThan(0);
    }
  });

  it("leaves the 300-row Institute and Department lists out", () => {
    // They need paging and a search box of their own; dropping them into this
    // screen would render every row at once.
    expect(findOptionCatalog("universities")).toBeUndefined();
    expect(findOptionCatalog("faculty-departments")).toBeUndefined();
  });
});

describe("option catalog admin input", () => {
  it("accepts only the catalogs the registry declares", () => {
    for (const id of optionCatalogIds) {
      expect(optionCatalogSchema.safeParse(id).success, id).toBe(true);
    }
    // An unknown key would otherwise index straight into the table map.
    for (const bad of ["universities", "users", "", "__proto__"]) {
      expect(optionCatalogSchema.safeParse(bad).success, bad).toBe(false);
    }
  });

  it("trims the name so a stray space cannot create a near-duplicate row", () => {
    const result = optionCatalogNameSchema.safeParse("  Higher Mathematics  ");

    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("Higher Mathematics");
  });

  it("rejects a blank name and one longer than the column", () => {
    expect(optionCatalogNameSchema.safeParse("   ").success).toBe(false);
    expect(optionCatalogNameSchema.safeParse("x".repeat(MAX_OPTION_NAME_LENGTH)).success).toBe(true);
    // varchar(160) would silently truncate rather than fail.
    expect(optionCatalogNameSchema.safeParse("x".repeat(MAX_OPTION_NAME_LENGTH + 1)).success).toBe(false);
  });
});
