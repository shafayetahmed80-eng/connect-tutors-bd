import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADMIN_CHANGE_REQUEST_FILTERS,
  DEFAULT_ADMIN_GUARDIAN_REQUEST_FILTERS,
  adminChangeRequestFilterAlerts,
  adminGuardianRequestFilterAlerts,
  buildAdminChangeRequestFilterInput,
  buildAdminGuardianRequestFilterInput,
  countAdminChangeRequestFilters,
  countAdminGuardianRequestFilters,
} from "./admin-request-filters";

describe("the Guardian Requests panel", () => {
  it("sends nothing for a panel nobody has touched", () => {
    expect(buildAdminGuardianRequestFilterInput(DEFAULT_ADMIN_GUARDIAN_REQUEST_FILTERS)).toEqual({});
    expect(countAdminGuardianRequestFilters(DEFAULT_ADMIN_GUARDIAN_REQUEST_FILTERS)).toBe(0);
  });

  it("turns what was chosen into what the server takes, whole days at both ends", () => {
    const input = buildAdminGuardianRequestFilterInput({
      requestedFrom: "2026-09-01", requestedTo: "2026-09-30", requestType: "remove_tutor", postedBy: "admin", tuitionStage: "confirmed",
    });
    expect(input).toEqual({
      // The last day runs to its final moment, or a request made at noon on it would fall outside its own range.
      requestedFrom: new Date("2026-09-01T00:00:00"),
      requestedTo: new Date("2026-09-30T23:59:59.999"),
      requestType: "remove_tutor",
      postedBy: "admin",
      tuitionStage: "confirmed",
    });
    expect(countAdminGuardianRequestFilters({ ...DEFAULT_ADMIN_GUARDIAN_REQUEST_FILTERS, postedBy: "guardian", tuitionStage: "live" })).toBe(2);
  });

  it("keeps Apply waiting only while the dates are the wrong way round", () => {
    expect(adminGuardianRequestFilterAlerts({ ...DEFAULT_ADMIN_GUARDIAN_REQUEST_FILTERS, requestedFrom: "2026-09-10", requestedTo: "2026-09-10" })).toEqual([]);
    expect(adminGuardianRequestFilterAlerts({ ...DEFAULT_ADMIN_GUARDIAN_REQUEST_FILTERS, requestedTo: "2026-09-01" })).toEqual([]);
    expect(adminGuardianRequestFilterAlerts({ ...DEFAULT_ADMIN_GUARDIAN_REQUEST_FILTERS, requestedFrom: "2026-09-10", requestedTo: "2026-09-01" })).toEqual(["The 'from' date cannot be later than the 'to' date."]);
  });
});

describe("the Change requests panel", () => {
  it("sends nothing for a panel nobody has touched", () => {
    expect(buildAdminChangeRequestFilterInput(DEFAULT_ADMIN_CHANGE_REQUEST_FILTERS)).toEqual({});
    expect(countAdminChangeRequestFilters(DEFAULT_ADMIN_CHANGE_REQUEST_FILTERS)).toBe(0);
  });

  it("turns what was chosen into what the server takes, and trims the decline reason", () => {
    expect(buildAdminChangeRequestFilterInput({
      role: "tutor", type: "mobile", requestedFrom: "2026-09-01", requestedTo: "2026-09-30", declineReason: "  payment  ",
    })).toEqual({
      role: "tutor", type: "mobile",
      requestedFrom: new Date("2026-09-01T00:00:00"), requestedTo: new Date("2026-09-30T23:59:59.999"),
      declineReason: "payment",
    });
  });

  it("does not count a decline reason that holds only spaces", () => {
    expect(countAdminChangeRequestFilters({ ...DEFAULT_ADMIN_CHANGE_REQUEST_FILTERS, declineReason: "   " })).toBe(0);
    expect(countAdminChangeRequestFilters({ ...DEFAULT_ADMIN_CHANGE_REQUEST_FILTERS, role: "guardian", declineReason: "late" })).toBe(2);
  });

  it("keeps Apply waiting only while the dates are the wrong way round", () => {
    expect(adminChangeRequestFilterAlerts({ ...DEFAULT_ADMIN_CHANGE_REQUEST_FILTERS, requestedFrom: "2026-09-10", requestedTo: "2026-09-01" })).toEqual(["The 'from' date cannot be later than the 'to' date."]);
    expect(adminChangeRequestFilterAlerts(DEFAULT_ADMIN_CHANGE_REQUEST_FILTERS)).toEqual([]);
  });
});
