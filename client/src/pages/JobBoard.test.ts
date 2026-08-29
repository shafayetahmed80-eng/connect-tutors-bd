import { describe, expect, it } from "vitest";
import { buildJobBoardPageLinks, buildJobBoardQuery, buildMapsDirectionUrl, formatJobBoardTuitionType, formatJobBudget, getJobBoardPagination, getTutorInterestPresentation } from "./JobBoard";

describe("Job Board view helpers", () => {
  it("normalizes optional filters and clamps the requested page for a safe public query", () => {
    expect(buildJobBoardQuery({
      page: -4,
      cityId: "  dhaka-city ",
      locationId: "",
      tuitionType: "home",
      preferredTutorGender: "female",
      category: " English Medium ",
      subject: "  English ",
      budgetMaximum: "10000",
      jobId: "  CT-JOB-000042 ",
    })).toEqual({
      page: 1,
      pageSize: 20,
      cityId: "dhaka-city",
      tuitionType: "home",
      preferredTutorGender: "female",
      category: "English Medium",
      subject: "English",
      budgetMaximum: 10000,
      jobId: "CT-JOB-000042",
    });
  });

  it("constructs only an area-level Google Maps search URL and never falls back to an exact address", () => {
    expect(buildMapsDirectionUrl("Mirpur 10, Dhaka")).toBe("https://www.google.com/maps/search/?api=1&query=Mirpur%2010%2C%20Dhaka%2C%20Bangladesh");
    expect(buildMapsDirectionUrl(null)).toBeNull();
  });

  it("keeps budget labels truthful and provides bounded 20-item pagination actions", () => {
    expect(formatJobBudget({ kind: "range", minimum: 8000, maximum: 10000 })).toBe("৳8,000–৳10,000 / month");
    expect(formatJobBudget({ kind: "discuss" })).toBe("Budget to be discussed");
    expect(getJobBoardPagination({ page: 3, pageSize: 20, totalCount: 45 })).toEqual({ totalPages: 3, previousPage: 2, nextPage: null });
  });

  it("builds compact numbered pagination links without making every page control visible", () => {
    expect(buildJobBoardPageLinks({ page: 1, totalPages: 1 })).toEqual([1]);
    expect(buildJobBoardPageLinks({ page: 1, totalPages: 9 })).toEqual([1, 2, 3, "ellipsis", 9]);
    expect(buildJobBoardPageLinks({ page: 5, totalPages: 9 })).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 9]);
    expect(buildJobBoardPageLinks({ page: 9, totalPages: 9 })).toEqual([1, "ellipsis", 7, 8, 9]);
  });

  it("labels Group and Package Tutoring jobs truthfully on the public Job Board", () => {
    expect(formatJobBoardTuitionType("group")).toBe("Group Tutoring");
    expect(formatJobBoardTuitionType("package")).toBe("Package Tutoring");
  });

  it("shows actionable Tutor-only application states without suggesting Guardian contact access", () => {
    expect(getTutorInterestPresentation(undefined)).toMatchObject({ statusLabel: null, description: null, action: "express", actionLabel: "Apply Now" });
    expect(getTutorInterestPresentation("interested")).toMatchObject({ statusLabel: "Application submitted", description: null, action: "withdraw", actionLabel: "Withdraw application" });
    expect(getTutorInterestPresentation("shortlisted")).toMatchObject({ statusLabel: "Shortlisted", description: null, action: "withdraw", actionLabel: "Withdraw application" });
    expect(getTutorInterestPresentation("withdrawn")).toMatchObject({ statusLabel: "Application withdrawn", action: "express", actionLabel: "Apply again" });
    expect(getTutorInterestPresentation("matched")).toMatchObject({ statusLabel: "Matched", description: null, action: null });
  });
});
