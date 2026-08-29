import { describe, expect, it } from "vitest";
import { TUTOR_SIGN_IN_HREF, validateTutorRegistrationStep } from "./JoinTutor";

const validAccount = {
  name: "Afsana Rahman",
  phone: "1712345678",
  contactEmail: "afsana@example.com",
  password: "securepass1",
  confirmPassword: "securepass1",
  gender: "female" as const,
  cityId: "",
  locationId: "",
};

describe("Tutor Registration step validation", () => {
  it("routes an existing Tutor to the unified email-or-mobile sign-in with Tutor preselected", () => {
    expect(TUTOR_SIGN_IN_HREF).toBe("/auth?role=tutor");
  });

  it("permits a complete account step before any location has been selected", () => {
    expect(validateTutorRegistrationStep(1, validAccount, false)).toEqual({});
  });

  it("keeps the user on the account step with clear English recovery feedback for an invalid Bangladesh phone", () => {
    expect(validateTutorRegistrationStep(1, { ...validAccount, phone: "123" }, false)).toEqual({
      phone: "Enter a valid 10-digit Bangladesh mobile number after +880.",
    });
  });

  it("requires a City, dependent location, and consent only on the final step", () => {
    expect(validateTutorRegistrationStep(2, validAccount, false)).toEqual({
      cityId: "Choose your City to continue.",
      locationId: "Choose your Thana, Upazila, Area, or Sub-area to continue.",
      agreed: "Accept the Terms of Use and Privacy Policy to create your account.",
    });
  });
});
