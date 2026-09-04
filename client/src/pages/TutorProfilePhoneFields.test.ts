import { describe, expect, it } from "vitest";
import { tutorProfileEditableDraftSchema } from "../../../server/tutor-profile.validation";
import { findIncompletePhoneFields, toLocalPhoneDigits, toStoredPhoneValue } from "./TutorProfilePhoneFields";

describe("the Tutor Profile phone boxes", () => {
  it("stores what the server accepts, whatever shape the Tutor types", () => {
    // The old box carried an `Ex- 01712345678` placeholder and sent it word for
    // word, which the server rejects - so the section simply never saved.
    for (const typed of ["01712345678", "1712345678", "+8801712345678", "880 1712 345678"]) {
      expect(toStoredPhoneValue(typed), typed).toBe("+8801712345678");
      expect(tutorProfileEditableDraftSchema.safeParse({ privateDetails: { fatherPhone: toStoredPhoneValue(typed) } }).success, typed).toBe(true);
    }
  });

  it("leaves an empty box empty rather than storing a bare country code", () => {
    expect(toStoredPhoneValue("")).toBe("");
    expect(toStoredPhoneValue("   ")).toBe("");
  });

  it("shows only the local digits, so +880 stays furniture", () => {
    expect(toLocalPhoneDigits("+8801712345678")).toBe("1712345678");
    expect(toLocalPhoneDigits(undefined)).toBe("");
  });

  it("names every half-typed number in a draft before the save goes out", () => {
    expect(findIncompletePhoneFields({
      phone: "+8801712345678",
      privateDetails: { fatherPhone: "+880171234", motherPhone: "", emergencyContactPhone: "+8801812345678" },
    })).toEqual(["fatherPhone"]);
  });

  it("passes a draft whose numbers are all complete or all blank", () => {
    expect(findIncompletePhoneFields({ privateDetails: { fatherPhone: "+8801712345678", motherPhone: "" } })).toEqual([]);
    expect(findIncompletePhoneFields({})).toEqual([]);
  });
});
