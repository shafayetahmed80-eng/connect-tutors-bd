import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADMIN_JOB_FILTERS,
  adminJobDatesOutOfOrder,
  adminJobSalaryOutOfOrder,
  buildAdminJobFilterInput,
  clearOtherStageFilters,
  countAdminJobFilters,
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
    });
  });

  it("reads a salary the way every other salary box in the Admin panel does", () => {
    expect(buildAdminJobFilterInput({ ...DEFAULT_ADMIN_JOB_FILTERS, salaryFrom: "5,000", salaryTo: "9,500 Taka" })).toEqual({ salaryFrom: 5000, salaryTo: 9500 });
    expect(buildAdminJobFilterInput({ ...DEFAULT_ADMIN_JOB_FILTERS, salaryFrom: "abc", salaryTo: "  " })).toEqual({});
  });
});

describe("the later stages' choices", () => {
  it("go to the server as dates with whole days, lists and plain words", () => {
    const input = buildAdminJobFilterInput({
      ...DEFAULT_ADMIN_JOB_FILTERS,
      appointedFrom: "2026-10-01", appointedTo: "2026-10-05", confirmedFrom: "2026-10-02", cancelledTo: "2026-10-09",
      tutorGender: "male", paymentStatuses: ["half_paid", "full_paid"], letter: "not_issued",
      settlement: "refund", refundDisposition: "credited", settlementReasons: ["tutor_fault"], cancelReason: "  moved abroad ",
    });
    expect(input).toEqual({
      appointedFrom: new Date("2026-10-01T00:00:00"), appointedTo: new Date("2026-10-05T23:59:59.999"),
      confirmedFrom: new Date("2026-10-02T00:00:00"), cancelledTo: new Date("2026-10-09T23:59:59.999"),
      tutorGender: "male", paymentStatuses: ["half_paid", "full_paid"], letter: "not_issued",
      settlement: "refund", refundDisposition: "credited", settlementReasons: ["tutor_fault"], cancelReason: "moved abroad",
    });
  });

  it("are counted one each, like every other filter", () => {
    expect(countAdminJobFilters({ ...DEFAULT_ADMIN_JOB_FILTERS, appointedFrom: "2026-10-01", paymentStatuses: ["full_paid"], cancelReason: "  " })).toBe(2);
  });
});

describe("countAdminJobFilters", () => {
  it("counts the filters that are narrowing, one each, whatever their kind", () => {
    expect(countAdminJobFilters(DEFAULT_ADMIN_JOB_FILTERS)).toBe(0);
    expect(countAdminJobFilters({ ...DEFAULT_ADMIN_JOB_FILTERS, subjects: ["Math", "English"], studentGender: "male", applicants: "few", guardian: "  " })).toBe(3);
  });
});

describe("clearOtherStageFilters", () => {
  const set = { ...DEFAULT_ADMIN_JOB_FILTERS, publicationStates: ["reviewing"], applicants: "none" as const, salaryFrom: "5000" };

  it("keeps the choices of the stage now open and drops the other stages'", () => {
    expect(clearOtherStageFilters(set, "pending")).toEqual({ ...set, applicants: "" });
    expect(clearOtherStageFilters(set, "live")).toEqual({ ...set, publicationStates: [] });
  });

  it("drops both where the stage has none of its own", () => {
    expect(clearOtherStageFilters(set, "confirmed")).toEqual({ ...DEFAULT_ADMIN_JOB_FILTERS, salaryFrom: "5000" });
  });

  it("keeps what two stages share when the Admin moves between them, and drops the rest", () => {
    const later = {
      ...DEFAULT_ADMIN_JOB_FILTERS,
      appointedFrom: "2026-10-01", tutorGender: "female" as const, paymentStatuses: ["full_paid"], letter: "issued" as const,
      confirmedFrom: "2026-10-02", settlement: "refund" as const, cancelReason: "moved",
    };
    // Appointed and Confirmed share the Appointed date and the Tutor's gender.
    expect(clearOtherStageFilters(later, "appointed")).toEqual({ ...DEFAULT_ADMIN_JOB_FILTERS, appointedFrom: "2026-10-01", tutorGender: "female" });
    expect(clearOtherStageFilters(later, "confirmed")).toEqual({
      ...DEFAULT_ADMIN_JOB_FILTERS, appointedFrom: "2026-10-01", tutorGender: "female", paymentStatuses: ["full_paid"], letter: "issued", confirmedFrom: "2026-10-02",
    });
    // Confirmed and Cancelled share the Payment Status and the gender.
    expect(clearOtherStageFilters(later, "cancelled")).toEqual({
      ...DEFAULT_ADMIN_JOB_FILTERS, tutorGender: "female", paymentStatuses: ["full_paid"], settlement: "refund", cancelReason: "moved",
    });
  });

  it("drops a waiting request on a cancelled tuition, which has none left to wait on", () => {
    const waiting = { ...DEFAULT_ADMIN_JOB_FILTERS, waitingRequest: "confirm" as const };
    expect(clearOtherStageFilters(waiting, "cancelled").waitingRequest).toBe("");
    expect(clearOtherStageFilters(waiting, "appointed").waitingRequest).toBe("confirm");
  });
});

describe("the two ranges", () => {
  it("say when the lowest is above the highest", () => {
    expect(adminJobDatesOutOfOrder({ postedFrom: "2026-10-09", postedTo: "2026-10-01" })).toBe(true);
    expect(adminJobDatesOutOfOrder({ postedFrom: "2026-10-01", postedTo: "" })).toBe(false);
    // Each stage's own range is checked too.
    expect(adminJobDatesOutOfOrder({ confirmedFrom: "2026-10-09", confirmedTo: "2026-10-01" })).toBe(true);
    expect(adminJobDatesOutOfOrder({ cancelledFrom: "2026-10-01", cancelledTo: "2026-10-09" })).toBe(false);
    expect(adminJobSalaryOutOfOrder({ salaryFrom: "9000", salaryTo: "5000" })).toBe(true);
    expect(adminJobSalaryOutOfOrder({ salaryFrom: "5000", salaryTo: "5000" })).toBe(false);
    expect(adminJobSalaryOutOfOrder({ salaryFrom: "5000", salaryTo: "" })).toBe(false);
  });
});
