import { describe, expect, it } from "vitest";
import { calculateAgeInYears, tutorNationalityOptions, tutorReligionOptions, validatePermanentAddress, MIN_PERMANENT_ADDRESS_LENGTH } from "./tutor-personal-details";

describe("tutor-personal-details", () => {
  it("exports nationality and religion options", () => {
    expect(tutorNationalityOptions).toContain("Bangladeshi");
    expect(tutorReligionOptions).toContain("Islam");
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

});
