import { describe, expect, it } from "vitest";
import { BANGLA_DIGITS, normalizeNumericDigits, toBanglaDigits, toEnglishDigits } from "./digits";

describe("shared/digits", () => {
  describe("toEnglishDigits", () => {
    it("handles empty and nullish inputs", () => {
      expect(toEnglishDigits("")).toBe("");
      expect(toEnglishDigits(null)).toBe("");
      expect(toEnglishDigits(undefined)).toBe("");
    });

    it("converts all Bangla numerals to English numerals", () => {
      expect(toEnglishDigits(BANGLA_DIGITS)).toBe("0123456789");
      expect(toEnglishDigits("০১৭ ১২৩৪৫৬৭৮")).toBe("017 12345678");
      expect(toEnglishDigits("২০২৪")).toBe("2024");
      expect(toEnglishDigits("৫০০০ টাকা")).toBe("5000 টাকা");
    });

    it("leaves standard English numbers and text intact", () => {
      expect(toEnglishDigits("01712345678")).toBe("01712345678");
      expect(toEnglishDigits("hello@example.com")).toBe("hello@example.com");
      expect(toEnglishDigits("৳ 5,000 / month")).toBe("৳ 5,000 / month");
    });

    it("handles mixed Bangla and English digits", () => {
      expect(toEnglishDigits("01৭12৩45৬78")).toBe("01712345678");
    });
  });

  describe("toBanglaDigits", () => {
    it("handles empty and nullish inputs", () => {
      expect(toBanglaDigits("")).toBe("");
      expect(toBanglaDigits(null)).toBe("");
      expect(toBanglaDigits(undefined)).toBe("");
    });

    it("converts all English digits to Bangla digits", () => {
      expect(toBanglaDigits("0123456789")).toBe("০১২৩৪৫৬৭৮৯");
      expect(toBanglaDigits(25)).toBe("২৫");
      expect(toBanglaDigits(0)).toBe("০");
      expect(toBanglaDigits("12 jobs found")).toBe("১২ jobs found");
    });
  });

  describe("normalizeNumericDigits", () => {
    it("converts Bangla digits and removes all non-numeric characters", () => {
      expect(normalizeNumericDigits("০১৭-১২৩৪ ৫৬৭৮")).toBe("01712345678");
      expect(normalizeNumericDigits("+৮৮০ ১৭১২-৩৪৫৬৭৮")).toBe("8801712345678");
      expect(normalizeNumericDigits("৫,০০০ টাকা")).toBe("5000");
    });

    it("respects maxLength when provided", () => {
      expect(normalizeNumericDigits("০১৭১২৩৪৫৬৭৮", 4)).toBe("0171");
      expect(normalizeNumericDigits("২০২৪", 4)).toBe("2024");
      expect(normalizeNumericDigits("১২৩৪৫৬", 4)).toBe("1234");
    });
  });
});
