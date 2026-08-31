import { describe, expect, it } from "vitest";
import { TUTOR_REGISTRATION_DESTINATION, TUTOR_SIGN_IN_HREF, validateTutorRegistration } from "./JoinTutor";

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

const completeForm = { ...validAccount, cityId: "dhaka-city", locationId: "uttara-sector-7" };

describe("Tutor Registration validation (single step)", () => {
  it("routes an existing Tutor to the unified email-or-mobile sign-in with Tutor preselected", () => {
    expect(TUTOR_SIGN_IN_HREF).toBe("/auth?role=tutor");
  });

  it("lands a completed registration on the Tutor portal Job Board tab", () => {
    expect(TUTOR_REGISTRATION_DESTINATION).toBe("/tutor/dashboard/jobs");
  });

  it("reports only the missing location and consent when every account field is valid", () => {
    expect(validateTutorRegistration(validAccount, false)).toEqual({
      cityId: "Choose your City to continue.",
      locationId: "Choose your Location to continue.",
      agreed: "Accept the Terms of Use and Privacy Policy to create your account.",
    });
  });

  it("gives clear English recovery feedback for an invalid Bangladesh phone alongside the other gaps", () => {
    const errors = validateTutorRegistration({ ...validAccount, phone: "123" }, false);
    expect(errors.phone).toBe("Enter a valid 10-digit Bangladesh mobile number after +880.");
  });

  it("returns no errors when the whole form is complete and the terms are accepted", () => {
    expect(validateTutorRegistration(completeForm, true)).toEqual({});
  });
});
