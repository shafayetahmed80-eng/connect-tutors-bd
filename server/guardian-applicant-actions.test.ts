import { describe, expect, it } from "vitest";
import { canRequestAppointment, canWithdrawAppointmentRequest } from "./guardian-applicant-actions";

describe("asking for an appointment", () => {
  it("is allowed on a Live tuition with nothing waiting", () => {
    expect(canRequestAppointment({ lifecycle: "live", pendingTutorId: null, tutorId: "tutor-175" })).toEqual({ allowed: true });
  });

  it("is one request at a time per tuition", () => {
    expect(canRequestAppointment({ lifecycle: "live", pendingTutorId: "tutor-404", tutorId: "tutor-175" }))
      .toEqual({ allowed: false, reason: "another_requested" });
    expect(canRequestAppointment({ lifecycle: "live", pendingTutorId: "tutor-175", tutorId: "tutor-175" }))
      .toEqual({ allowed: false, reason: "already_requested" });
  });

  it("stops once a Tutor is appointed, or the tuition is not open", () => {
    for (const lifecycle of ["appointed", "confirmed", "pending", "cancelled"] as const) {
      expect(canRequestAppointment({ lifecycle, pendingTutorId: null, tutorId: "tutor-175" }), lifecycle)
        .toEqual({ allowed: false, reason: "not_live" });
    }
  });
});

describe("withdrawing a request", () => {
  it("works while the request waits on a Live tuition", () => {
    expect(canWithdrawAppointmentRequest({ lifecycle: "live", requested: true })).toBe(true);
  });

  it("has nothing to take back when nothing was asked, or the Admin has already appointed", () => {
    expect(canWithdrawAppointmentRequest({ lifecycle: "live", requested: false })).toBe(false);
    expect(canWithdrawAppointmentRequest({ lifecycle: "appointed", requested: true })).toBe(false);
  });
});
