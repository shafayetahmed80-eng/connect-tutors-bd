import { describe, expect, it } from "vitest";
import { countTutorApplicationStages, filterTutorApplicationsByStage, getTutorApplicationStage, tutorApplicationStages } from "./tutor-application-stages";

describe("the stage a Tutor's application sits at", () => {
  it("names the six stages in the order a Tutor moves through them", () => {
    expect(tutorApplicationStages.map(stage => stage.label)).toEqual([
      "Applied Jobs", "Shortlisted Jobs", "Appointed Jobs", "Confirmed Jobs", "Closed Jobs", "Cancelled Jobs",
    ]);
  });

  it("reads an expression of interest as Applied", () => {
    expect(getTutorApplicationStage({ status: "interested" })).toBe("applied");
  });

  it("separates Appointed from Confirmed by the Admin's confirmation, not the interest status", () => {
    // Both are `matched`. The appointment timestamp is the only difference.
    expect(getTutorApplicationStage({ status: "matched", appointmentConfirmedAt: null })).toBe("appointed");
    expect(getTutorApplicationStage({ status: "matched", appointmentConfirmedAt: new Date("2026-09-01") })).toBe("confirmed");
  });

  it("reads a Confirmed tuition whose fee is Full Paid as Closed, and any other Payment Status as Confirmed", () => {
    const confirmedAt = new Date("2026-09-01");
    expect(getTutorApplicationStage({ status: "matched", appointmentConfirmedAt: confirmedAt, paymentStatus: "full_paid" })).toBe("closed");
    for (const paymentStatus of ["full_due", "half_paid", "partial_paid", null, undefined]) {
      expect(getTutorApplicationStage({ status: "matched", appointmentConfirmedAt: confirmedAt, paymentStatus })).toBe("confirmed");
    }
    // Paid in full says nothing before the Admin has confirmed it, and nothing once the tuition has ended.
    expect(getTutorApplicationStage({ status: "matched", appointmentConfirmedAt: null, paymentStatus: "full_paid" })).toBe("appointed");
    expect(getTutorApplicationStage({ status: "matched", appointmentConfirmedAt: confirmedAt, paymentStatus: "full_paid", tuitionCancelled: 1 })).toBe("cancelled");
  });

  it("reads both endings - the Tutor's and the Admin's - as Cancelled", () => {
    expect(getTutorApplicationStage({ status: "withdrawn" })).toBe("cancelled");
    expect(getTutorApplicationStage({ status: "declined" })).toBe("cancelled");
  });

  it("ends every application on a cancelled tuition, whatever stage it had reached", () => {
    expect(getTutorApplicationStage({ status: "interested", tuitionCancelled: true })).toBe("cancelled");
    expect(getTutorApplicationStage({ status: "shortlisted", tuitionCancelled: 1 })).toBe("cancelled");
    expect(getTutorApplicationStage({ status: "matched", appointmentConfirmedAt: new Date("2026-09-01"), tuitionCancelled: 1 })).toBe("cancelled");
    // MySQL hands the flag back as 0 for an open tuition.
    expect(getTutorApplicationStage({ status: "matched", appointmentConfirmedAt: null, tuitionCancelled: 0 })).toBe("appointed");
  });

  it("counts every stage, including the ones with nothing in them", () => {
    expect(countTutorApplicationStages([
      { status: "interested" },
      { status: "interested" },
      { status: "shortlisted" },
      { status: "matched", appointmentConfirmedAt: "2026-09-01T00:00:00.000Z" },
      { status: "matched", appointmentConfirmedAt: "2026-09-01T00:00:00.000Z", paymentStatus: "full_paid" },
    ])).toEqual({ applied: 2, shortlisted: 1, appointed: 0, confirmed: 1, closed: 1, cancelled: 0 });
  });

  it("filters to one stage without losing the rest of each row", () => {
    const records = [{ status: "interested" as const, publicJobId: "CT-1" }, { status: "declined" as const, publicJobId: "CT-2" }];
    expect(filterTutorApplicationsByStage(records, "cancelled")).toEqual([{ status: "declined", publicJobId: "CT-2" }]);
  });
});
