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
        existingStatus: null,
      })
    ).toEqual({ allowed: true });
  });

  it("denies a duplicate active interest without exposing any Guardian data", () => {
    expect(
      canSubmitTutorInterest({
        tutorId: "T1503",
        jobStatus: "published",
        existingStatus: "interested",
      })
    ).toEqual({ allowed: false, reason: "already_interested" });
  });

  it("does not accept interest for a job that is off the board", () => {
    for (const jobStatus of ["unpublished", "closed"] as const) {
      expect(
        canSubmitTutorInterest({
          tutorId: "T1503",
          jobStatus,
          existingStatus: null,
        })
      ).toEqual({ allowed: false, reason: "job_unavailable" });
    }
  });

  it("keeps a published job open however long ago it was posted", () => {
    // There is no end date any more: the listing stays until an Admin takes the tuition further.
    expect(canSubmitTutorInterest({ tutorId: "T1503", jobStatus: "published", existingStatus: null })).toEqual({ allowed: true });
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
    expect(adminInterestDecisionNotice("shortlisted", "6812")?.title).toBe("6812-এর জন্য আপনাকে শর্টলিস্ট করা হয়েছে");
    expect(adminInterestDecisionNotice("declined", "6812")?.title).toBe("6812-এর জন্য আপনার আবেদন এগিয়ে নেওয়া হয়নি");
    expect(adminInterestDecisionNotice("interested", "6812")).toBeNull();
  });
});
