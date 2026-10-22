import { describe, expect, it } from "vitest";
import {
  DEFAULT_GUARDIAN_APPLICANT_VISIBILITY,
  GUARDIAN_APPLICANT_VISIBILITY_ID,
  NEW_TUITION_TUTOR_ALERTS_ENABLED_ID,
  guardianApplicantVisibilityFromStored,
  newTuitionTutorAlertsEnabledFromStored,
  storedGuardianApplicantVisibility,
  DEFAULT_TUTOR_CHAT_ACCESS_MODE,
  TUTOR_CHAT_ACCESS_MODE_ID,
  tutorChatAccessModeFromStored,
  storedTutorChatAccessMode,
} from "./admin-control";
import { findSiteLimit } from "./site-limits";

describe("the Guardian applicant switch", () => {
  it("shows Guardians shortlisted Tutors only until the Owner chooses", () => {
    expect(DEFAULT_GUARDIAN_APPLICANT_VISIBILITY).toBe("shortlisted");
    expect(guardianApplicantVisibilityFromStored(undefined)).toBe("shortlisted");
    expect(guardianApplicantVisibilityFromStored(null)).toBe("shortlisted");
  });

  it("stores each choice as one number and reads it back", () => {
    for (const mode of ["all", "shortlisted"] as const) {
      expect(guardianApplicantVisibilityFromStored(storedGuardianApplicantVisibility(mode))).toBe(mode);
    }
    // A number that is neither falls back rather than guessing.
    expect(guardianApplicantVisibilityFromStored(7)).toBe("shortlisted");
  });

  it("is kept out of the limits registry, so the Limits editor can never save it", () => {
    expect(findSiteLimit(GUARDIAN_APPLICANT_VISIBILITY_ID)).toBeUndefined();
  });
});

describe("the Tutor live chat access switch", () => {
  it("defaults to appointed tutors only", () => {
    expect(DEFAULT_TUTOR_CHAT_ACCESS_MODE).toBe("appointed");
    expect(tutorChatAccessModeFromStored(undefined)).toBe("appointed");
    expect(tutorChatAccessModeFromStored(null)).toBe("appointed");
  });

  it("stores each choice as a distinct number and reads it back", () => {
    for (const mode of ["appointed", "approved", "all", "disabled"] as const) {
      expect(tutorChatAccessModeFromStored(storedTutorChatAccessMode(mode))).toBe(mode);
    }
    // An unknown number falls back to appointed
    expect(tutorChatAccessModeFromStored(99)).toBe("appointed");
  });

  it("is kept out of the limits registry, so the Limits editor can never save it", () => {
    expect(findSiteLimit(TUTOR_CHAT_ACCESS_MODE_ID)).toBeUndefined();
  });
});

describe("the new tuition alerts switch", () => {
  it("is on until the Owner turns it off, because the phone alert was already going out", () => {
    expect(newTuitionTutorAlertsEnabledFromStored(undefined)).toBe(true);
    expect(newTuitionTutorAlertsEnabledFromStored(null)).toBe(true);
  });

  it("stores On as 1 and Off as 0, and a number that is neither falls back to On rather than guessing", () => {
    expect(newTuitionTutorAlertsEnabledFromStored(1)).toBe(true);
    expect(newTuitionTutorAlertsEnabledFromStored(0)).toBe(false);
    expect(newTuitionTutorAlertsEnabledFromStored(7)).toBe(true);
  });

  it("is kept out of the limits registry, so the Limits editor can never save it", () => {
    expect(findSiteLimit(NEW_TUITION_TUTOR_ALERTS_ENABLED_ID)).toBeUndefined();
  });
});
