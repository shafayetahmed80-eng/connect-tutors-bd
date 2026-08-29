import { describe, expect, it } from "vitest";
import {
  JOB_ID_PATTERN,
  buildJobTitle,
  canTransitionJobState,
  createPaginationMeta,
  isJobExpired,
  normalizeJobBoardFilters,
  type JobBoardFilters,
  type JobLifecycleState,
  validateManualJobId,
} from "./job-board.contract";

describe("job board lifecycle contract", () => {
  it("allows only approved review, publication, and matching transitions", () => {
    expect(canTransitionJobState("draft", "submitted")).toBe(true);
    expect(canTransitionJobState("submitted", "reviewing")).toBe(true);
    expect(canTransitionJobState("reviewing", "approved")).toBe(true);
    expect(canTransitionJobState("unpublished", "published")).toBe(true);
    expect(canTransitionJobState("published", "matched")).toBe(false);
    expect(canTransitionJobState("approved", "published")).toBe(false);
    expect(canTransitionJobState("published", "closed")).toBe(true);
    expect(canTransitionJobState("closed", "published")).toBe(false);
  });

  it("keeps publication and matching state axes independent", () => {
    const states: JobLifecycleState[] = ["approved", "published", "matched", "closed"];
    expect(states).toContain("published");
    expect(canTransitionJobState("published", "matched")).toBe(false);
    expect(canTransitionJobState("matched", "closed")).toBe(false);
  });

  it("validates the provisional manual Job ID policy without accepting unsafe values", () => {
    expect(JOB_ID_PATTERN.test("CT-MAN-AB12CD")).toBe(true);
    expect(validateManualJobId("CT-MAN-AB12CD")).toEqual("CT-MAN-AB12CD");
    expect(() => validateManualJobId("ct-man-ab12cd")).toThrow();
    expect(() => validateManualJobId("CT-MAN-ABC 123")).toThrow();
    expect(() => validateManualJobId("CT-MAN-AB12")).toThrow();
  });

  it("treats an expiry timestamp at or before now as expired", () => {
    const now = new Date("2026-08-21T00:00:00.000Z");
    expect(isJobExpired(new Date("2026-08-20T23:59:59.999Z"), now)).toBe(true);
    expect(isJobExpired(now, now)).toBe(true);
    expect(isJobExpired(new Date("2026-08-21T00:00:00.001Z"), now)).toBe(false);
    expect(isJobExpired(null, now)).toBe(false);
  });

  it("builds the dynamic title from normalized safe learning details", () => {
    expect(buildJobTitle({
      category: "English Medium (Cambridge)",
      classCourse: "Standard 2",
      studentCount: 1,
      daysPerWeek: 4,
    })).toBe("Need English Medium (Cambridge) Tutor for Standard 2 Student-4 Days/Week");

    expect(buildJobTitle({
      category: "Science",
      classCourse: "Class 8",
      studentCount: 2,
      daysPerWeek: 3,
    })).toBe("Need Science Tutor for Class 8 Students-3 Days/Week");
  });

  it("normalizes canonical filters and rejects invalid pagination", () => {
    const filters: JobBoardFilters = normalizeJobBoardFilters({
      cityId: " dhaka-city ",
      locationId: " mirpur-10 ",
      tuitionType: "home",
      page: "2",
      pageSize: "24",
      jobId: " CT-MAN-AB12CD ",
    });

    expect(filters).toEqual({
      cityId: "dhaka-city",
      locationId: "mirpur-10",
      tuitionType: "home",
      page: 2,
      pageSize: 24,
      jobId: "CT-MAN-AB12CD",
    });
    expect(() => normalizeJobBoardFilters({ page: 0 })).toThrow();
    expect(() => normalizeJobBoardFilters({ pageSize: 101 })).toThrow();
    expect(() => normalizeJobBoardFilters({ cityId: "" })).toThrow();
  });

  it("returns server pagination metadata from one total count", () => {
    expect(createPaginationMeta(49, 2, 24)).toEqual({
      page: 2,
      pageSize: 24,
      totalCount: 49,
      totalPages: 3,
      hasPreviousPage: true,
      hasNextPage: true,
    });
    expect(createPaginationMeta(0, 1, 24).hasNextPage).toBe(false);
  });
});
