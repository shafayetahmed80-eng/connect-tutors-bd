import { describe, expect, it } from "vitest";
import { appointedTutorNotification, canAppointApplicant, canDeclineAppointmentRequest } from "./admin-appointment";

const base = { lifecycle: "live" as const, interestStatus: "interested", tutorApproved: true, requested: true, requireRequest: true };

describe("appointing an applicant", () => {
  it("approves a waiting request on a Live tuition", () => {
    expect(canAppointApplicant(base)).toEqual({ allowed: true });
    expect(canAppointApplicant({ ...base, interestStatus: "shortlisted" })).toEqual({ allowed: true });
  });

  it("needs the tuition Live - an Appointed one already has its Tutor", () => {
    for (const lifecycle of ["appointed", "confirmed", "pending", "cancelled"] as const) {
      expect(canAppointApplicant({ ...base, lifecycle }), lifecycle).toEqual({ allowed: false, reason: "not_live" });
    }
  });

  it("needs a waiting request to approve, but not for Mark matched", () => {
    expect(canAppointApplicant({ ...base, requested: false })).toEqual({ allowed: false, reason: "not_requested" });
    expect(canAppointApplicant({ ...base, requested: false, requireRequest: false })).toEqual({ allowed: true });
  });

  it("refuses a Tutor who is no longer approved, or an application already decided", () => {
    expect(canAppointApplicant({ ...base, tutorApproved: false })).toEqual({ allowed: false, reason: "tutor_unavailable" });
    for (const interestStatus of ["declined", "withdrawn", "matched"]) {
      expect(canAppointApplicant({ ...base, interestStatus }), interestStatus).toEqual({ allowed: false, reason: "invalid_transition" });
    }
  });
});

describe("declining a request", () => {
  it("works on a waiting request while Live", () => {
    expect(canDeclineAppointmentRequest({ lifecycle: "live", requested: true })).toBe(true);
    expect(canDeclineAppointmentRequest({ lifecycle: "live", requested: false })).toBe(false);
    expect(canDeclineAppointmentRequest({ lifecycle: "appointed", requested: true })).toBe(false);
  });
});

describe("what the appointed Tutor is told", () => {
  it("carries the Guardian's name and mobile number", () => {
    expect(appointedTutorNotification({ jobId: "6812", guardianName: "Sojib", guardianPhone: "+8801674936203" })).toEqual({
      title: "You were appointed to 6812",
      message: "Arrange the demo class with the Guardian: Sojib, +8801674936203.",
    });
  });

  it("still reads when the Guardian left a name or number out", () => {
    expect(appointedTutorNotification({ jobId: "6812", guardianName: null, guardianPhone: "+8801674936203" }).message)
      .toBe("Arrange the demo class with the Guardian: +8801674936203.");
    expect(appointedTutorNotification({ jobId: "6812", guardianName: "  ", guardianPhone: null }).message)
      .toBe("Arrange the demo class with the Guardian.");
  });
});
