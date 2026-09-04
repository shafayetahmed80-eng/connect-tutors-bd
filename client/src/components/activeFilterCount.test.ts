import { describe, expect, it } from "vitest";
import { countActiveFilters } from "./activeFilterCount";

const defaults = { query: "", status: "all", subject: "", page: 1, budgetMaximum: undefined as number | undefined };

describe("countActiveFilters", () => {
  it("counts nothing on an untouched set", () => {
    expect(countActiveFilters({ ...defaults }, defaults)).toBe(0);
  });

  it("counts each filter that differs from its own default", () => {
    expect(countActiveFilters({ ...defaults, query: "mirpur", status: "new" }, defaults)).toBe(2);
  });

  it("treats every flavour of empty as untouched", () => {
    // Screens spell "not filtering" differently - "", "all", undefined - and a
    // cleared box must not read as a filter.
    expect(countActiveFilters({ ...defaults, subject: "", budgetMaximum: undefined }, defaults)).toBe(0);
  });

  it("leaves paging out of it", () => {
    // Turning to page three is not a filter, and counting it would put
    // "1 active" on a panel nobody has touched.
    expect(countActiveFilters({ ...defaults, page: 3 }, defaults, { ignore: ["page"] })).toBe(0);
  });

  it("counts only the keys a panel owns when asked", () => {
    // Two panels on one screen share one filter object; each should report its
    // own controls rather than the other's.
    const filters = { ...defaults, query: "mirpur", status: "new" };
    expect(countActiveFilters(filters, defaults, { only: ["status"] })).toBe(1);
    expect(countActiveFilters(filters, defaults, { only: ["query"] })).toBe(1);
    expect(countActiveFilters(filters, defaults, { only: ["subject"] })).toBe(0);
  });

  it("counts a number that was typed", () => {
    expect(countActiveFilters({ ...defaults, budgetMaximum: 5000 }, defaults)).toBe(1);
  });
});
