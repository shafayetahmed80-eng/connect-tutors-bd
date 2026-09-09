import { describe, expect, it } from "vitest";
import { getJobBoardAppliedState } from "./JobBoard";

// November, not September: some ICU builds render Sep as "Sept".
const appliedAt = new Date("2026-11-20T10:00:00.000Z");

describe("what a Job Board card shows once a Tutor has applied", () => {
  it("offers the button only while there is no application", () => {
    expect(getJobBoardAppliedState(undefined)).toBeNull();
  });

  it("replaces it with the word and the day the application was made", () => {
    expect(getJobBoardAppliedState({ status: "interested", appliedAt })).toEqual({ label: "Applied", appliedOn: "20 Nov 2026" });
  });

  it("keeps saying so through every stage that follows", () => {
    // Shortlisted, matched and declined are all still applications, and all
    // still carry the day they were made. Which stage they reached is in the
    // details dialog; the card only answers "have I applied to this one?".
    for (const status of ["shortlisted", "matched", "declined"] as const) {
      expect(getJobBoardAppliedState({ status, appliedAt }), status).toMatchObject({ label: "Applied" });
    }
  });

  it("gives the button back once an application is withdrawn", () => {
    // A withdrawn application is not one any more, and the Tutor may apply
    // again while the tuition is still live.
    expect(getJobBoardAppliedState({ status: "withdrawn", appliedAt })).toBeNull();
  });

  it("reads the date the way the card's own Posted date reads", () => {
    expect(getJobBoardAppliedState({ status: "interested", appliedAt: "2026-01-04T00:00:00.000Z" }))
      .toMatchObject({ appliedOn: "04 Jan 2026" });
  });
});
