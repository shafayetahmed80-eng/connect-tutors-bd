import { describe, expect, it } from "vitest";
import {
  getGuardianRequestStatusPresentation,
  getGuardianGroupCapacityDisplay,
  getGuardianPackageDurationDisplay,
  getGuardianPendingEditDestination,
  getGuardianStudentCountDisplay,
  shouldShowContactConsent,
} from "./GuardianRequestTracking";

describe("Guardian request tracking presentation", () => {
  it("uses Pending until richer lifecycle metadata establishes a later Guardian-facing stage", () => {
    expect(getGuardianRequestStatusPresentation("new")).toMatchObject({ label: "Pending", tone: "amber" });
    expect(getGuardianRequestStatusPresentation("reviewing")).toMatchObject({ label: "Pending", tone: "amber" });
    expect(getGuardianRequestStatusPresentation("matched")).toMatchObject({ label: "Pending", tone: "amber" });
    expect(getGuardianRequestStatusPresentation("closed")).toMatchObject({ label: "Cancelled", tone: "slate" });
  });

  it("shows the contact decision only for a matched request awaiting the Guardian's explicit consent", () => {
    expect(shouldShowContactConsent({ status: "matched", nextAction: "decide_contact_consent" })).toBe(true);
    expect(shouldShowContactConsent({ status: "matched", nextAction: "none" })).toBe(false);
    expect(shouldShowContactConsent({ status: "reviewing", nextAction: "decide_contact_consent" })).toBe(false);
  });

  it("shows the submitted capacity only for the Guardian's Group Tutoring requests", () => {
    expect(getGuardianGroupCapacityDisplay({ tuitionType: "group", groupCapacity: 8 })).toBe("8 maximum students");
    expect(getGuardianGroupCapacityDisplay({ tuitionType: "home", groupCapacity: 8 })).toBeNull();
    expect(getGuardianGroupCapacityDisplay({ tuitionType: "group", groupCapacity: null })).toBeNull();
  });

  it("shows the submitted duration only for the Guardian's Package Tutoring requests", () => {
    expect(getGuardianPackageDurationDisplay({ tuitionType: "package", packageDurationMonths: 6 })).toBe("6 months");
    expect(getGuardianPackageDurationDisplay({ tuitionType: "package", packageDurationMonths: 1 })).toBe("1 month");
    expect(getGuardianPackageDurationDisplay({ tuitionType: "home", packageDurationMonths: 6 })).toBeNull();
    expect(getGuardianPackageDurationDisplay({ tuitionType: "package", packageDurationMonths: null })).toBeNull();
  });

  it("shows private Number of Students only for Home, Online, and Package requests", () => {
    expect(getGuardianStudentCountDisplay({ tuitionType: "home", studentCount: 2 })).toBe("2 students");
    expect(getGuardianStudentCountDisplay({ tuitionType: "online", studentCount: 1 })).toBe("1 student");
    expect(getGuardianStudentCountDisplay({ tuitionType: "package", studentCount: 3 })).toBe("3 students");
    expect(getGuardianStudentCountDisplay({ tuitionType: "group", studentCount: 8 })).toBeNull();
    expect(getGuardianStudentCountDisplay({ tuitionType: "home", studentCount: null })).toBeNull();
  });

  it("keeps a Pending request edit inside the protected Guardian panel", () => {
    expect(getGuardianPendingEditDestination(42)).toBe("/guardian/dashboard/hire?edit=42");
  });
});
