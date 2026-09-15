import { describe, expect, it } from "vitest";
import {
  adminInterestDecisionNotice,
  canShortlistOnTuition,
  canSubmitTutorInterest,
  transitionTutorInterest,
} from "./tutor-job-interest";

describe("Tutor Job Board interest contract", () => {
  it("allows a Tutor to submit one new interest for a visible published job", () => {
    expect(
      canSubmitTutorInterest({
        tutorId: "T1503",
        jobStatus: "published",
        expiresAt: new Date("2030-04-15T00:00:00.000Z"),
        now: new Date("2030-04-01T00:00:00.000Z"),
        existingStatus: null,
      })
    ).toEqual({ allowed: true });
  });

  it("denies a duplicate active interest without exposing any Guardian data", () => {
    expect(
      canSubmitTutorInterest({
        tutorId: "T1503",
        jobStatus: "published",
        expiresAt: new Date("2030-04-15T00:00:00.000Z"),
        now: new Date("2030-04-01T00:00:00.000Z"),
        existingStatus: "interested",
      })
    ).toEqual({ allowed: false, reason: "already_interested" });
  });

  it("does not accept interest for unavailable or expired jobs", () => {
    expect(
      canSubmitTutorInterest({
        tutorId: "T1503",
        jobStatus: "unpublished",
        expiresAt: new Date("2030-04-15T00:00:00.000Z"),
        now: new Date("2030-04-01T00:00:00.000Z"),
        existingStatus: null,
      })
    ).toEqual({ allowed: false, reason: "job_unavailable" });

    expect(
      canSubmitTutorInterest({
        tutorId: "T1503",
        jobStatus: "published",
        expiresAt: new Date("2030-04-01T00:00:00.000Z"),
        now: new Date("2030-04-01T00:00:00.000Z"),
        existingStatus: null,
      })
    ).toEqual({ allowed: false, reason: "job_unavailable" });
  });

  it("allows only Admin review states and prevents a Tutor from marking themselves matched", () => {
    expect(transitionTutorInterest("interested", "shortlisted", "admin")).toEqual({ allowed: true });
    expect(transitionTutorInterest("interested", "matched", "tutor")).toEqual({
      allowed: false,
      reason: "admin_only",
    });
    expect(transitionTutorInterest("withdrawn", "matched", "admin")).toEqual({
      allowed: false,
      reason: "invalid_transition",
    });
  });
});

describe("an Admin's shortlist on Applied Tutors", () => {
  it("moves on or off the shortlist only while the tuition can take a Tutor or a backup", () => {
    expect(["pending", "live", "appointed", "confirmed", "cancelled"].filter(stage => canShortlistOnTuition(stage as never))).toEqual(["live", "appointed"]);
    // A listing with no tuition behind it keeps the old rule.
    expect(canShortlistOnTuition(null)).toBe(true);
  });

  it("tells the Tutor when they are shortlisted or declined, and says nothing when they come off a shortlist", () => {
    expect(adminInterestDecisionNotice("shortlisted", "6812")?.title).toBe("You were shortlisted for 6812");
    expect(adminInterestDecisionNotice("declined", "6812")?.title).toBe("Your application for 6812 was not taken forward");
    expect(adminInterestDecisionNotice("interested", "6812")).toBeNull();
  });
});
