import { describe, expect, it } from "vitest";
import {
  calculateAgeInYears,
  tutorNationalityOptions,
  tutorReligionOptions,
  validatePermanentAddress,
  MIN_PERMANENT_ADDRESS_LENGTH,
  validatePresentAddress,
  MIN_PRESENT_ADDRESS_LENGTH,
  validateEmergencyContactName,
  MIN_EMERGENCY_CONTACT_NAME_LENGTH,
  validateEmergencyContactRelation,
  MIN_EMERGENCY_CONTACT_RELATION_LENGTH,
  validateHeadline,
  MIN_HEADLINE_LENGTH,
  validateParentName,
  MIN_PARENT_NAME_LENGTH,
  validateSocialProfileLinks,
  validateEmergencyContactAddress,
  MIN_EMERGENCY_CONTACT_ADDRESS_LENGTH,
} from "./tutor-personal-details";

describe("tutor-personal-details", () => {
  it("exports nationality and religion options", () => {
    expect(tutorNationalityOptions).toContain("Bangladeshi");
    expect(tutorReligionOptions).toContain("Islam");
    expect(MIN_PERMANENT_ADDRESS_LENGTH).toBe(10);
    expect(MIN_PRESENT_ADDRESS_LENGTH).toBe(10);
    expect(MIN_EMERGENCY_CONTACT_NAME_LENGTH).toBe(3);
    expect(MIN_EMERGENCY_CONTACT_RELATION_LENGTH).toBe(3);
  });

  describe("calculateAgeInYears", () => {
    const fixedNow = new Date("2026-10-26T12:00:00.000Z");

    it("calculates exact age when birthday has passed this year", () => {
      // Born 2000-05-10, now is 2026-10-26 -> 26 years
      expect(calculateAgeInYears("2000-05-10", fixedNow)).toBe(26);
    });

    it("calculates age on the exact birthday", () => {
      // Born 2008-10-26, now is 2026-10-26 -> turns 18 today
      expect(calculateAgeInYears("2008-10-26", fixedNow)).toBe(18);
    });

    it("calculates age when birthday is tomorrow (not yet reached)", () => {
      // Born 2008-10-27, now is 2026-10-26 -> still 17
      expect(calculateAgeInYears("2008-10-27", fixedNow)).toBe(17);
    });

    it("handles leap years correctly", () => {
      // Born 2004-02-29
      const beforeLeap = new Date("2024-02-28T00:00:00.000Z");
      const onLeap = new Date("2024-02-29T00:00:00.000Z");
      expect(calculateAgeInYears("2004-02-29", beforeLeap)).toBe(19);
      expect(calculateAgeInYears("2004-02-29", onLeap)).toBe(20);
    });

    it("returns null for invalid strings or formats", () => {
      expect(calculateAgeInYears("")).toBeNull();
      expect(calculateAgeInYears("invalid")).toBeNull();
      expect(calculateAgeInYears("26-10-2000")).toBeNull();
      expect(calculateAgeInYears("2020/10/26")).toBeNull();
    });

    it("returns null for impossible calendar dates", () => {
      expect(calculateAgeInYears("2021-02-29", fixedNow)).toBeNull(); // not a leap year
      expect(calculateAgeInYears("2023-04-31", fixedNow)).toBeNull(); // April has 30 days
    });

    it("returns null for future dates", () => {
      expect(calculateAgeInYears("2026-10-27", fixedNow)).toBeNull();
      expect(calculateAgeInYears("2030-01-01", fixedNow)).toBeNull();
    });
  });

  describe("validatePermanentAddress", () => {
    it("accepts valid detailed addresses with at least 10 characters", () => {
      expect(validatePermanentAddress("Village Example, Rangpur")).toBeNull();
      expect(validatePermanentAddress("House 12, Road 5, Mirpur, Dhaka")).toBeNull();
      expect(validatePermanentAddress("1234567890")).toBeNull();
    });

    it("rejects addresses shorter than 10 characters", () => {
      const err = validatePermanentAddress("Dhaka");
      expect(err).toContain("Enter detailed permanent address");
      expect(err).toContain("at least 10 characters");

      expect(validatePermanentAddress("Mirpur")).toContain("at least 10 characters");
      expect(validatePermanentAddress("a")).toContain("at least 10 characters");
    });

    it("allows null or empty strings (deferred to required-check)", () => {
      expect(validatePermanentAddress(null)).toBeNull();
      expect(validatePermanentAddress(undefined)).toBeNull();
      expect(validatePermanentAddress("")).toBeNull();
      expect(validatePermanentAddress("   ")).toBeNull();
    });
  });

  describe("validatePresentAddress", () => {
    it("accepts valid detailed present addresses with at least 10 characters", () => {
      expect(validatePresentAddress("House 12, Road 5, Mirpur, Dhaka")).toBeNull();
      expect(validatePresentAddress("Sector 7, Uttara, Dhaka")).toBeNull();
      expect(validatePresentAddress("1234567890")).toBeNull();
    });

    it("rejects present addresses shorter than 10 characters", () => {
      const err = validatePresentAddress("Dhaka");
      expect(err).toContain("Enter detailed present address");
      expect(err).toContain("at least 10 characters");
      expect(err).toContain("House/Road, Area");

      expect(validatePresentAddress("Uttara")).toContain("at least 10 characters");
      expect(validatePresentAddress("a")).toContain("at least 10 characters");
    });

    it("allows null or empty strings (deferred to required-check)", () => {
      expect(validatePresentAddress(null)).toBeNull();
      expect(validatePresentAddress(undefined)).toBeNull();
      expect(validatePresentAddress("")).toBeNull();
      expect(validatePresentAddress("   ")).toBeNull();
    });
  });

  describe("validateEmergencyContactName", () => {
    it("accepts valid family or guardian names", () => {
      expect(validateEmergencyContactName("Abdul Karim", "Shafayet Ahmed")).toBeNull();
      expect(validateEmergencyContactName("Rahima Begum", "Shafayet Ahmed")).toBeNull();
      expect(validateEmergencyContactName("Tanvir Hassan")).toBeNull();
    });

    it("rejects when emergency contact name matches tutor's own name", () => {
      const err = validateEmergencyContactName("Shafayet Ahmed", "Shafayet Ahmed");
      expect(err).toContain("Emergency contact cannot be yourself");

      // Case-insensitive check
      expect(validateEmergencyContactName("shafayet ahmed", "Shafayet Ahmed")).toContain("Emergency contact cannot be yourself");
      expect(validateEmergencyContactName("  Shafayet Ahmed  ", "Shafayet Ahmed")).toContain("Emergency contact cannot be yourself");
    });

    it("rejects self-referencing keywords", () => {
      expect(validateEmergencyContactName("Self")).toContain("Emergency contact cannot be yourself");
      expect(validateEmergencyContactName("myself")).toContain("Emergency contact cannot be yourself");
      expect(validateEmergencyContactName("Me")).toContain("Emergency contact cannot be yourself");
      expect(validateEmergencyContactName("নিজের")).toContain("Emergency contact cannot be yourself");
      expect(validateEmergencyContactName("আমি")).toContain("Emergency contact cannot be yourself");
    });

    it("rejects placeholder/dummy words", () => {
      expect(validateEmergencyContactName("None")).toContain("Enter a valid emergency contact person's name");
      expect(validateEmergencyContactName("N/A")).toContain("Enter a valid emergency contact person's name");
      expect(validateEmergencyContactName("Nil")).toContain("Enter a valid emergency contact person's name");
      expect(validateEmergencyContactName("নাই")).toContain("Enter a valid emergency contact person's name");
    });

    it("rejects names shorter than 3 characters", () => {
      expect(validateEmergencyContactName("ab")).toContain("at least 3 characters");
      expect(validateEmergencyContactName("x")).toContain("at least 3 characters");
    });

    it("allows null or empty strings (deferred to required-check)", () => {
      expect(validateEmergencyContactName(null)).toBeNull();
      expect(validateEmergencyContactName(undefined)).toBeNull();
      expect(validateEmergencyContactName("")).toBeNull();
      expect(validateEmergencyContactName("   ")).toBeNull();
    });
  });

  describe("validateEmergencyContactRelation", () => {
    it("accepts valid relationships", () => {
      expect(validateEmergencyContactRelation("Father")).toBeNull();
      expect(validateEmergencyContactRelation("Mother")).toBeNull();
      expect(validateEmergencyContactRelation("Brother")).toBeNull();
      expect(validateEmergencyContactRelation("Sister")).toBeNull();
      expect(validateEmergencyContactRelation("Uncle")).toBeNull();
      expect(validateEmergencyContactRelation("Guardian")).toBeNull();
      expect(validateEmergencyContactRelation("Friend")).toBeNull();
      expect(validateEmergencyContactRelation("বাবা")).toBeNull();
    });

    it("rejects self-referencing relationship keywords", () => {
      expect(validateEmergencyContactRelation("Self")).toContain("Emergency contact relation cannot be self");
      expect(validateEmergencyContactRelation("myself")).toContain("Emergency contact relation cannot be self");
      expect(validateEmergencyContactRelation("Me")).toContain("Emergency contact relation cannot be self");
      expect(validateEmergencyContactRelation("Own")).toContain("Emergency contact relation cannot be self");
      expect(validateEmergencyContactRelation("নিজে")).toContain("Emergency contact relation cannot be self");
    });

    it("rejects dummy placeholder relationship keywords", () => {
      expect(validateEmergencyContactRelation("None")).toContain("Enter a valid relation");
      expect(validateEmergencyContactRelation("N/A")).toContain("Enter a valid relation");
      expect(validateEmergencyContactRelation("Nil")).toContain("Enter a valid relation");
      expect(validateEmergencyContactRelation("নেই")).toContain("Enter a valid relation");
    });

    it("rejects relationships shorter than 3 characters", () => {
      expect(validateEmergencyContactRelation("ab")).toContain("at least 3 characters");
      expect(validateEmergencyContactRelation("x")).toContain("at least 3 characters");
    });

    it("allows null or empty strings (deferred to required-check)", () => {
      expect(validateEmergencyContactRelation(null)).toBeNull();
      expect(validateEmergencyContactRelation(undefined)).toBeNull();
      expect(validateEmergencyContactRelation("")).toBeNull();
      expect(validateEmergencyContactRelation("   ")).toBeNull();
    });
  });
  describe("validateHeadline", () => {
    it("accepts valid, descriptive professional headlines", () => {
      expect(validateHeadline("Experienced Mathematics Tutor for SSC & HSC Students")).toBeNull();
      expect(validateHeadline("English Medium Tutor (Cambridge O/A Level)")).toBeNull();
      expect(validateHeadline("BUET EEE Student | Passionate Physics & Math Teacher")).toBeNull();
      expect(validateHeadline("গণিত ও পদার্থবিজ্ঞান স্পেশাল টিউটর")).toBeNull();
    });

    it("rejects headlines shorter than 10 characters", () => {
      const err = validateHeadline("Tutor");
      expect(err).toContain("Enter a headline with at least 10 characters");

      expect(validateHeadline("Math 123")).toContain("at least 10 characters");
    });

    it("rejects repetitive single-word headlines", () => {
      expect(validateHeadline("tutor tutor")).toContain("meaningful professional headline");
      expect(validateHeadline("tutor tutor tutor")).toContain("meaningful professional headline");
      expect(validateHeadline("Teacher teacher")).toContain("meaningful professional headline");
      expect(validateHeadline("tuition tuition")).toContain("meaningful professional headline");
    });

    it("rejects repeated character sequences", () => {
      expect(validateHeadline("aaaaaaaaaa")).toContain("meaningful professional headline");
      expect(validateHeadline("..........")).toContain("meaningful professional headline");
      expect(validateHeadline("----------")).toContain("meaningful professional headline");
    });

    it("rejects dummy placeholder headlines", () => {
      expect(validateHeadline("test test test")).toContain("meaningful professional headline");
      expect(validateHeadline("asdf asdf asdf")).toContain("meaningful professional headline");
      expect(validateHeadline("demo demo demo")).toContain("meaningful professional headline");
      expect(validateHeadline("N/A N/A N/A N/A")).toContain("meaningful professional headline");
    });

    it("allows null or empty strings (deferred to required-check)", () => {
      expect(validateHeadline(null)).toBeNull();
      expect(validateHeadline(undefined)).toBeNull();
      expect(validateHeadline("")).toBeNull();
      expect(validateHeadline("   ")).toBeNull();
    });
  });

  describe("validateParentName", () => {
    it("accepts valid, genuine father and mother names", () => {
      expect(validateParentName("Abdul Karim", "father")).toBeNull();
      expect(validateParentName("Md. Rafiqul Islam", "father")).toBeNull();
      expect(validateParentName("Rahima Begum", "mother")).toBeNull();
      expect(validateParentName("মোছাঃ ফাতেমা বেগম", "mother")).toBeNull();
    });

    it("rejects names shorter than 3 characters", () => {
      expect(validateParentName("Md", "father")).toContain("at least 3 characters");
      expect(validateParentName("Al", "mother")).toContain("at least 3 characters");
    });

    it("rejects dummy placeholder names", () => {
      expect(validateParentName("none", "father")).toContain("genuine father's name rather than placeholder text");
      expect(validateParentName("N/A", "father")).toContain("genuine father's name rather than placeholder text");
      expect(validateParentName("Father", "father")).toContain("genuine father's name rather than placeholder text");
      expect(validateParentName("Mother", "mother")).toContain("genuine mother's name rather than placeholder text");
      expect(validateParentName("test", "father")).toContain("genuine father's name rather than placeholder text");
      expect(validateParentName("demo", "mother")).toContain("genuine mother's name rather than placeholder text");
      expect(validateParentName("asdf", "father")).toContain("genuine father's name rather than placeholder text");
    });

    it("rejects repeated single characters or repetitive words", () => {
      expect(validateParentName("aaaaaa", "father")).toContain("genuine father's name rather than placeholder text");
      expect(validateParentName("------", "mother")).toContain("genuine mother's name rather than placeholder text");
      expect(validateParentName("Karim Karim", "father")).toContain("genuine father's name rather than repetitive words");
      expect(validateParentName("a b c", "father")).toContain("genuine father's name");
    });

    it("allows null or empty strings (deferred to required-check)", () => {
      expect(validateParentName(null, "father")).toBeNull();
      expect(validateParentName(undefined, "mother")).toBeNull();
      expect(validateParentName("", "father")).toBeNull();
      expect(validateParentName("   ", "mother")).toBeNull();
    });
  });

  describe("validateSocialProfileLinks", () => {
    it("accepts valid profile URLs and domain links", () => {
      expect(validateSocialProfileLinks("https://facebook.com/username")).toBeNull();
      expect(validateSocialProfileLinks("http://facebook.com/username")).toBeNull();
      expect(validateSocialProfileLinks("https://www.linkedin.com/in/username")).toBeNull();
      expect(validateSocialProfileLinks("facebook.com/username")).toBeNull();
      expect(validateSocialProfileLinks("https://github.com/developer")).toBeNull();
      expect(validateSocialProfileLinks("https://facebook.com/user, https://linkedin.com/in/user")).toBeNull();
    });

    it("rejects dummy non-URL text", () => {
      expect(validateSocialProfileLinks("none")).toContain("valid social profile link");
      expect(validateSocialProfileLinks("n/a")).toContain("valid social profile link");
      expect(validateSocialProfileLinks("test")).toContain("valid social profile link");
      expect(validateSocialProfileLinks("asdf")).toContain("valid social profile link");
      expect(validateSocialProfileLinks("12345")).toContain("valid social profile link");
      expect(validateSocialProfileLinks("just my name")).toContain("valid social profile link");
    });

    it("allows null or empty strings (deferred to required-check)", () => {
      expect(validateSocialProfileLinks(null)).toBeNull();
      expect(validateSocialProfileLinks(undefined)).toBeNull();
      expect(validateSocialProfileLinks("")).toBeNull();
      expect(validateSocialProfileLinks("   ")).toBeNull();
    });
  });

  describe("validateEmergencyContactAddress", () => {
    it("accepts valid detailed addresses with at least 10 characters", () => {
      expect(validateEmergencyContactAddress("House 12, Road 5, Mirpur, Dhaka")).toBeNull();
      expect(validateEmergencyContactAddress("Village Rampur, Thana Sadar, Bogura")).toBeNull();
      expect(validateEmergencyContactAddress("Sector 10, Uttara, Dhaka")).toBeNull();
    });

    it("rejects addresses shorter than 10 characters", () => {
      expect(validateEmergencyContactAddress("Dhaka")).toContain("at least 10 characters");
      expect(validateEmergencyContactAddress("Mirpur")).toContain("at least 10 characters");
    });

    it("rejects shortcuts and dummy placeholder addresses", () => {
      expect(validateEmergencyContactAddress("same as above")).toContain("detailed emergency contact address rather than placeholder text");
      expect(validateEmergencyContactAddress("none na nil")).toContain("detailed emergency contact address rather than placeholder text");
      expect(validateEmergencyContactAddress("aaaaaaaaaa")).toContain("detailed emergency contact address rather than placeholder text");
      expect(validateEmergencyContactAddress("----------")).toContain("detailed emergency contact address rather than placeholder text");
    });

    it("allows null or empty strings (deferred to required-check)", () => {
      expect(validateEmergencyContactAddress(null)).toBeNull();
      expect(validateEmergencyContactAddress(undefined)).toBeNull();
      expect(validateEmergencyContactAddress("")).toBeNull();
      expect(validateEmergencyContactAddress("   ")).toBeNull();
    });
  });

});
