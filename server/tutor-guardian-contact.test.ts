import { describe, expect, it } from "vitest";
import { tutorGuardianContactFor, tutorMaySeeGuardianContact } from "./tutor-guardian-contact";

const confirmedAt = new Date("2026-09-05T00:00:00.000Z");
const appointed = { status: "matched" as const, appointmentConfirmedAt: null };
const confirmed = { status: "matched" as const, appointmentConfirmedAt: confirmedAt, paymentStatus: "half_paid" };
const contact = { appointedTutorId: "tutor-175", name: "  Rahim Uddin ", phone: " +8801712345678 " };

describe("whose Guardian contact reaches a Tutor", () => {
  it("is the Tutor appointed to the tuition, once Appointed and while Confirmed", () => {
    expect(tutorMaySeeGuardianContact(appointed, "tutor-175", "tutor-175")).toBe(true);
    expect(tutorMaySeeGuardianContact(confirmed, "tutor-175", "tutor-175")).toBe(true);
  });

  it("is nobody else's: not an applicant, not a shortlisted Tutor, not one who was passed over", () => {
    expect(tutorMaySeeGuardianContact({ status: "interested" }, "tutor-175", "tutor-175")).toBe(false);
    expect(tutorMaySeeGuardianContact({ status: "shortlisted" }, "tutor-175", "tutor-175")).toBe(false);
    // An application still marked matched on a tuition that now belongs to another Tutor, or to nobody.
    expect(tutorMaySeeGuardianContact(appointed, "tutor-404", "tutor-175")).toBe(false);
    expect(tutorMaySeeGuardianContact(appointed, null, "tutor-175")).toBe(false);
  });

  it("is not carried past the stages the Owner named: Closed, Cancelled, a cancelled tuition", () => {
    expect(tutorMaySeeGuardianContact({ ...confirmed, paymentStatus: "full_paid" }, "tutor-175", "tutor-175")).toBe(false);
    expect(tutorMaySeeGuardianContact({ status: "withdrawn" }, "tutor-175", "tutor-175")).toBe(false);
    expect(tutorMaySeeGuardianContact({ status: "declined" }, "tutor-175", "tutor-175")).toBe(false);
    expect(tutorMaySeeGuardianContact({ ...confirmed, tuitionCancelled: 1 }, "tutor-175", "tutor-175")).toBe(false);
  });
});

describe("the contact a Status row carries", () => {
  it("is the trimmed name and number when released", () => {
    expect(tutorGuardianContactFor(appointed, contact, "tutor-175")).toEqual({ guardianName: "Rahim Uddin", guardianPhone: "+8801712345678" });
  });

  it("is null for each when not released, or when there is no Guardian record at all", () => {
    expect(tutorGuardianContactFor({ status: "interested" }, contact, "tutor-175")).toEqual({ guardianName: null, guardianPhone: null });
    expect(tutorGuardianContactFor(appointed, { ...contact, appointedTutorId: "tutor-404" }, "tutor-175")).toEqual({ guardianName: null, guardianPhone: null });
    expect(tutorGuardianContactFor(appointed, undefined, "tutor-175")).toEqual({ guardianName: null, guardianPhone: null });
  });

  it("keeps the number when the Guardian gave no name, and the name when there is no number", () => {
    expect(tutorGuardianContactFor(appointed, { ...contact, name: "   " }, "tutor-175")).toEqual({ guardianName: null, guardianPhone: "+8801712345678" });
    expect(tutorGuardianContactFor(appointed, { ...contact, phone: null }, "tutor-175")).toEqual({ guardianName: "Rahim Uddin", guardianPhone: null });
    expect(tutorGuardianContactFor(appointed, { ...contact, name: null }, "tutor-175")).toEqual({ guardianName: null, guardianPhone: "+8801712345678" });
  });
});
