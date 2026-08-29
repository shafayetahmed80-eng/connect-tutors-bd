import { describe, expect, it } from "vitest";
import {
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
