import { describe, expect, it } from "vitest";
import { countTutorApplicationStages, filterTutorApplicationsByStage, getTutorApplicationStage, tutorApplicationStages } from "./tutor-application-stages";

describe("the stage a Tutor's application sits at", () => {
  it("names the five stages in the order a Tutor moves through them", () => {
    expect(tutorApplicationStages.map(stage => stage.label)).toEqual([
      "Applied Jobs", "Shortlisted Jobs", "Appointed Jobs", "Confirmed Jobs", "Cancelled Jobs",
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

  it("reads both endings - the Tutor's and the Admin's - as Cancelled", () => {
    expect(getTutorApplicationStage({ status: "withdrawn" })).toBe("cancelled");
    expect(getTutorApplicationStage({ status: "declined" })).toBe("cancelled");
  });

  it("counts every stage, including the ones with nothing in them", () => {
    expect(countTutorApplicationStages([
      { status: "interested" },
      { status: "interested" },
      { status: "shortlisted" },
      { status: "matched", appointmentConfirmedAt: "2026-09-01T00:00:00.000Z" },
    ])).toEqual({ applied: 2, shortlisted: 1, appointed: 0, confirmed: 1, cancelled: 0 });
  });

  it("filters to one stage without losing the rest of each row", () => {
    const records = [{ status: "interested" as const, publicJobId: "CT-1" }, { status: "declined" as const, publicJobId: "CT-2" }];
    expect(filterTutorApplicationsByStage(records, "cancelled")).toEqual([{ status: "declined", publicJobId: "CT-2" }]);
  });
});
