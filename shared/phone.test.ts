import { describe, expect, it } from "vitest";
import {
  BANGLADESH_COUNTRY_CODE,
  cleanBangladeshLocalPhoneDigits,
  formatBangladeshLocalPhoneDisplay,
  isValidBangladeshLocalPhone,
  toInternationalBangladeshPhone,
  findDuplicateTutorPhoneErrors,
} from "./phone";

describe("phone utilities", () => {
  describe("cleanBangladeshLocalPhoneDigits", () => {
    it("handles null, undefined, and empty string", () => {
      expect(cleanBangladeshLocalPhoneDigits("")).toBe("");
      expect(cleanBangladeshLocalPhoneDigits(null)).toBe("");
      expect(cleanBangladeshLocalPhoneDigits(undefined)).toBe("");
    });

    it("clears leading trunk zero immediately", () => {
      expect(cleanBangladeshLocalPhoneDigits("0")).toBe("");
      expect(cleanBangladeshLocalPhoneDigits("01")).toBe("1");
      expect(cleanBangladeshLocalPhoneDigits("017")).toBe("17");
      expect(cleanBangladeshLocalPhoneDigits("01712345678")).toBe("1712345678");
    });

    it("clears leading +880 or 880 international code", () => {
      expect(cleanBangladeshLocalPhoneDigits("+8801712345678")).toBe("1712345678");
      expect(cleanBangladeshLocalPhoneDigits("8801712345678")).toBe("1712345678");
      expect(cleanBangladeshLocalPhoneDigits("+88001712345678")).toBe("1712345678");
    });

    it("converts Bengali numerals to English digits", () => {
      expect(cleanBangladeshLocalPhoneDigits("০১৭১২৩৪৫৬৭৮")).toBe("1712345678");
      expect(cleanBangladeshLocalPhoneDigits("+৮৮০১৭১২৩৪৫৬৭৮")).toBe("1712345678");
      expect(cleanBangladeshLocalPhoneDigits("০১৯৮৭৬৫৪৩২১")).toBe("1987654321");
    });

    it("ignores spaces, hyphens, and parentheses", () => {
      expect(cleanBangladeshLocalPhoneDigits("01712 345 678")).toBe("1712345678");
      expect(cleanBangladeshLocalPhoneDigits("+880 1712-345-678")).toBe("1712345678");
      expect(cleanBangladeshLocalPhoneDigits("(01712) 345678")).toBe("1712345678");
    });

    it("truncates at exactly 10 digits", () => {
      expect(cleanBangladeshLocalPhoneDigits("017123456789999")).toBe("1712345678");
    });
  });

  describe("formatBangladeshLocalPhoneDisplay", () => {
    it("formats progressively as digits are entered", () => {
      expect(formatBangladeshLocalPhoneDisplay("")).toBe("");
      expect(formatBangladeshLocalPhoneDisplay("1")).toBe("1");
      expect(formatBangladeshLocalPhoneDisplay("171")).toBe("171");
      expect(formatBangladeshLocalPhoneDisplay("1712")).toBe("1712");
      expect(formatBangladeshLocalPhoneDisplay("17123")).toBe("1712 3");
      expect(formatBangladeshLocalPhoneDisplay("171234")).toBe("1712 34");
      expect(formatBangladeshLocalPhoneDisplay("1712345")).toBe("1712 345");
      expect(formatBangladeshLocalPhoneDisplay("17123456")).toBe("1712 345 6");
      expect(formatBangladeshLocalPhoneDisplay("171234567")).toBe("1712 345 67");
      expect(formatBangladeshLocalPhoneDisplay("1712345678")).toBe("1712 345 678");
    });

    it("formats correctly when given raw uncleaned numbers", () => {
      expect(formatBangladeshLocalPhoneDisplay("01712345678")).toBe("1712 345 678");
      expect(formatBangladeshLocalPhoneDisplay("+8801712345678")).toBe("1712 345 678");
      expect(formatBangladeshLocalPhoneDisplay("০১৭১২৩৪৫৬৭৮")).toBe("1712 345 678");
    });
  });

  describe("isValidBangladeshLocalPhone", () => {
    it("validates legitimate Bangladesh mobile operators (013 to 019)", () => {
      expect(isValidBangladeshLocalPhone("1712345678")).toBe(true);
      expect(isValidBangladeshLocalPhone("1312345678")).toBe(true);
      expect(isValidBangladeshLocalPhone("1412345678")).toBe(true);
      expect(isValidBangladeshLocalPhone("1512345678")).toBe(true);
      expect(isValidBangladeshLocalPhone("1612345678")).toBe(true);
      expect(isValidBangladeshLocalPhone("1812345678")).toBe(true);
      expect(isValidBangladeshLocalPhone("1912345678")).toBe(true);
      expect(isValidBangladeshLocalPhone("01712 345 678")).toBe(true);
      expect(isValidBangladeshLocalPhone("+8801712345678")).toBe(true);
      expect(isValidBangladeshLocalPhone("০১৭১২ ৩৪৫ ৬৭৮")).toBe(true);
    });

    it("rejects numbers that are too short or too long or invalid operator", () => {
      expect(isValidBangladeshLocalPhone("171234567")).toBe(false); // 9 digits
      expect(isValidBangladeshLocalPhone("1212345678")).toBe(false); // 012 is not an operator
      expect(isValidBangladeshLocalPhone("1012345678")).toBe(false); // 010 is not an operator
      expect(isValidBangladeshLocalPhone("")).toBe(false);
    });
  });

  describe("toInternationalBangladeshPhone", () => {
    it("prefixes with BANGLADESH_COUNTRY_CODE", () => {
      expect(toInternationalBangladeshPhone("1712345678")).toBe("+8801712345678");
      expect(toInternationalBangladeshPhone("01712345678")).toBe("+8801712345678");
      expect(toInternationalBangladeshPhone("+8801712345678")).toBe("+8801712345678");
      expect(toInternationalBangladeshPhone("")).toBe("");
    });
  });

  describe("findDuplicateTutorPhoneErrors", () => {
    it("returns empty errors when no numbers duplicate", () => {
      const result = findDuplicateTutorPhoneErrors({
        primaryPhone: "+8801712345678",
        additionalPhone: "+8801812345678",
        fatherPhone: "+8801912345678",
        motherPhone: "+8801512345678",
        emergencyContactPhone: "+8801612345678",
      });
      expect(result).toEqual({});
    });

    it("flags fatherPhone when it matches primaryPhone", () => {
      const result = findDuplicateTutorPhoneErrors({
        primaryPhone: "+8801712345678",
        fatherPhone: "01712-345678",
      });
      expect(result.fatherPhone).toContain("Father's phone number cannot be the same as your personal mobile number");
    });

    it("flags motherPhone when it matches primaryPhone", () => {
      const result = findDuplicateTutorPhoneErrors({
        primaryPhone: "+8801712345678",
        motherPhone: "01712345678",
      });
      expect(result.motherPhone).toContain("Mother's phone number cannot be the same as your personal mobile number");
    });

    it("flags emergencyContactPhone when it matches primaryPhone", () => {
      const result = findDuplicateTutorPhoneErrors({
        primaryPhone: "+8801712345678",
        emergencyContactPhone: "০১৭১২৩৪৫৬৭৮",
      });
      expect(result.emergencyContactPhone).toContain("Emergency contact phone cannot be the same as your personal mobile number");
    });

    it("flags additionalPhone when it matches primaryPhone", () => {
      const result = findDuplicateTutorPhoneErrors({
        primaryPhone: "+8801712345678",
        additionalPhone: "+8801712345678",
      });
      expect(result.additionalPhone).toContain("Additional phone number cannot be the same as your primary mobile number");
    });

    it("flags contact numbers when they match additionalPhone", () => {
      const result = findDuplicateTutorPhoneErrors({
        primaryPhone: "+8801712345678",
        additionalPhone: "+8801812345678",
        emergencyContactPhone: "01812345678",
      });
      expect(result.emergencyContactPhone).toContain("Emergency contact phone cannot be the same as your additional mobile number");
    });
  });

});
