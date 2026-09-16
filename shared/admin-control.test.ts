import { describe, expect, it } from "vitest";
import {
  DEFAULT_GUARDIAN_APPLICANT_VISIBILITY,
  GUARDIAN_APPLICANT_VISIBILITY_ID,
  guardianApplicantVisibilityFromStored,
  storedGuardianApplicantVisibility,
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
