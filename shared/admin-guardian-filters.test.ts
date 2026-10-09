import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADMIN_GUARDIAN_FILTERS,
  adminGuardianFilterAlerts,
  buildAdminGuardianFilterInput,
  countAdminGuardianFilters,
} from "./admin-guardian-filters";

describe("buildAdminGuardianFilterInput", () => {
  it("sends nothing for a panel nobody has touched", () => {
    expect(buildAdminGuardianFilterInput(DEFAULT_ADMIN_GUARDIAN_FILTERS)).toEqual({});
  });

  it("turns what was chosen into what the server takes, and leaves out what is blank", () => {
    expect(buildAdminGuardianFilterInput({
      joinedFrom: "2026-08-01",
      joinedTo: "2026-09-30",
      tuitions: "many",
      changeRequest: "has",
      accountStatus: "suspended",
    })).toEqual({
      // Whole days: the last one runs to its final moment, or a Guardian who joined at noon would fall outside it.
      joinedFrom: new Date("2026-08-01T00:00:00"),
      joinedTo: new Date("2026-09-30T23:59:59.999"),
      tuitions: "many",
      changeRequest: "has",
      accountStatus: "suspended",
    });
    expect(buildAdminGuardianFilterInput({ ...DEFAULT_ADMIN_GUARDIAN_FILTERS, tuitions: "none" })).toEqual({ tuitions: "none" });
  });
});

describe("countAdminGuardianFilters", () => {
  it("counts each filter that is narrowing, one each", () => {
    expect(countAdminGuardianFilters(DEFAULT_ADMIN_GUARDIAN_FILTERS)).toBe(0);
    expect(countAdminGuardianFilters({ ...DEFAULT_ADMIN_GUARDIAN_FILTERS, joinedFrom: "2026-08-01", joinedTo: "2026-08-31", accountStatus: "active" })).toBe(3);
  });
});

describe("adminGuardianFilterAlerts", () => {
  it("says nothing while the dates are in order, or only one is set", () => {
    expect(adminGuardianFilterAlerts({ ...DEFAULT_ADMIN_GUARDIAN_FILTERS, joinedFrom: "2026-08-01", joinedTo: "2026-08-01" })).toEqual([]);
    expect(adminGuardianFilterAlerts({ ...DEFAULT_ADMIN_GUARDIAN_FILTERS, joinedTo: "2026-08-01" })).toEqual([]);
  });

  it("names dates that are the wrong way round", () => {
    expect(adminGuardianFilterAlerts({ ...DEFAULT_ADMIN_GUARDIAN_FILTERS, joinedFrom: "2026-09-01", joinedTo: "2026-08-01" })).toEqual(["The 'from' date cannot be later than the 'to' date."]);
  });
});
