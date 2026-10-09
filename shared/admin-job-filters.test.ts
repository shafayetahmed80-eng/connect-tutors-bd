import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADMIN_JOB_FILTERS,
  adminJobDatesOutOfOrder,
  adminJobSalaryOutOfOrder,
  buildAdminJobFilterInput,
  clearOtherStageFilters,
  countAdminJobFilters,
  isSalaryText,
} from "./admin-job-filters";

describe("buildAdminJobFilterInput", () => {
  it("sends nothing for a panel nobody has touched", () => {
    expect(buildAdminJobFilterInput(DEFAULT_ADMIN_JOB_FILTERS)).toEqual({});
  });

  it("turns what was typed into what the server takes, and leaves out what is blank", () => {
    const input = buildAdminJobFilterInput({
      ...DEFAULT_ADMIN_JOB_FILTERS,
      postedFrom: "2026-10-01",
      postedTo: "2026-10-09",
      daysPerWeek: ["3", "5"],
      salaryFrom: " 5000 ",
      salaryTo: "",
      guardian: "  Sojib ",
      jobId: " ",
      daysInStage: "7",
      expiringSoon: true,
      applicants: "few",
    });
    expect(input).toEqual({
      // Whole days: the last one runs to its final moment, or a tuition posted at noon would fall outside its own range.
      postedFrom: new Date("2026-10-01T00:00:00"),
      postedTo: new Date("2026-10-09T23:59:59.999"),
      daysPerWeek: [3, 5],
      salaryFrom: 5000,
      guardian: "Sojib",
      daysInStage: 7,
      applicants: "few",
      expiringSoon: true,
    });
  });

  it("does not guess at a salary that is not a whole number", () => {
    expect(buildAdminJobFilterInput({ ...DEFAULT_ADMIN_JOB_FILTERS, salaryFrom: "5k", salaryTo: "6000.5" })).toEqual({});
    expect(isSalaryText("")).toBe(true);
    expect(isSalaryText("5000")).toBe(true);
    expect(isSalaryText("5k")).toBe(false);
    expect(isSalaryText("-5")).toBe(false);
  });
});

describe("countAdminJobFilters", () => {
  it("counts the filters that are narrowing, one each, whatever their kind", () => {
    expect(countAdminJobFilters(DEFAULT_ADMIN_JOB_FILTERS)).toBe(0);
    expect(countAdminJobFilters({ ...DEFAULT_ADMIN_JOB_FILTERS, subjects: ["Math", "English"], studentGender: "male", expiringSoon: true, guardian: "  " })).toBe(3);
  });
});

describe("clearOtherStageFilters", () => {
  const set = { ...DEFAULT_ADMIN_JOB_FILTERS, publicationStates: ["reviewing"], applicants: "none" as const, expiringSoon: true, salaryFrom: "5000" };

  it("keeps the choices of the stage now open and drops the other stages'", () => {
    expect(clearOtherStageFilters(set, "pending")).toEqual({ ...set, applicants: "", expiringSoon: false });
    expect(clearOtherStageFilters(set, "live")).toEqual({ ...set, publicationStates: [] });
  });

  it("drops both where the stage has none of its own", () => {
    expect(clearOtherStageFilters(set, "confirmed")).toEqual({ ...DEFAULT_ADMIN_JOB_FILTERS, salaryFrom: "5000" });
  });
});

describe("the two ranges", () => {
  it("say when the lowest is above the highest", () => {
    expect(adminJobDatesOutOfOrder({ postedFrom: "2026-10-09", postedTo: "2026-10-01" })).toBe(true);
    expect(adminJobDatesOutOfOrder({ postedFrom: "2026-10-01", postedTo: "" })).toBe(false);
    expect(adminJobSalaryOutOfOrder({ salaryFrom: "9000", salaryTo: "5000" })).toBe(true);
    expect(adminJobSalaryOutOfOrder({ salaryFrom: "5000", salaryTo: "5000" })).toBe(false);
    expect(adminJobSalaryOutOfOrder({ salaryFrom: "5000", salaryTo: "" })).toBe(false);
  });
});
