import { describe, expect, it } from "vitest";
import {
  MIN_MONTHLY_TUITION_FEE,
  MAX_MONTHLY_TUITION_FEE,
  offersOnlineTuitionOnly,
  validateTuitionFees,
  validateTeachingExperience,
  validateTeachingExpertiseText,
  getTravelDistanceConsistencyWarning,
} from "./tutor-profile-tuition";

describe("offersOnlineTuitionOnly", () => {
  it("is true only for a Tutor whose one and only tuition type is online", () => {
    expect(offersOnlineTuitionOnly({ tuitionTypes: ["online"] })).toBe(true);
  });

  it("is false once anything else is offered, or nothing is chosen yet", () => {
    expect(offersOnlineTuitionOnly({ tuitionTypes: ["home", "online"] })).toBe(false);
    expect(offersOnlineTuitionOnly({ tuitionTypes: ["home"] })).toBe(false);
    expect(offersOnlineTuitionOnly({ tuitionTypes: [] })).toBe(false);
    expect(offersOnlineTuitionOnly({})).toBe(false);
  });
});

describe("validateTuitionFees", () => {
  it("accepts valid monthly fees within realistic bounds", () => {
    const result = validateTuitionFees(5000, 8000);
    expect(result.feeMinError).toBeUndefined();
    expect(result.feeMaxError).toBeUndefined();
  });

  it("accepts valid string numbers within realistic bounds", () => {
    const result = validateTuitionFees("5000", "8000");
    expect(result.feeMinError).toBeUndefined();
    expect(result.feeMaxError).toBeUndefined();
  });

  it("accepts equal min and max fees", () => {
    const result = validateTuitionFees(4000, 4000);
    expect(result.feeMinError).toBeUndefined();
    expect(result.feeMaxError).toBeUndefined();
  });

  it("returns no errors when both inputs are empty or null (unconditionally allowed for optional/empty handling)", () => {
    expect(validateTuitionFees("", "")).toEqual({});
    expect(validateTuitionFees(null, null)).toEqual({});
    expect(validateTuitionFees(undefined, undefined)).toEqual({});
  });

  it("flags monthly fee below 1,000 BDT as unrealistic per-class rate confusion", () => {
    const minLow = validateTuitionFees(500, 5000);
    expect(minLow.feeMinError).toBe(
      "Minimum monthly fee must be at least 1,000 BDT (enter monthly salary, not per-class rate).",
    );

    const maxLow = validateTuitionFees(3000, 800);
    expect(maxLow.feeMaxError).toBe(
      "Maximum monthly fee must be at least 1,000 BDT (enter monthly salary, not per-class rate).",
    );

    const zeroFee = validateTuitionFees(0, 5000);
    expect(zeroFee.feeMinError).toBe(
      "Minimum monthly fee must be at least 1,000 BDT (enter monthly salary, not per-class rate).",
    );
  });

  it("flags non-numeric or invalid integer strings", () => {
    const invalid = validateTuitionFees("abc", -10);
    expect(invalid.feeMinError).toBe("Enter a valid minimum monthly fee.");
    expect(invalid.feeMaxError).toBe("Enter a valid maximum monthly fee.");
  });

  it("flags fee exceeding maximum ceiling (500,000 BDT)", () => {
    const tooHigh = validateTuitionFees(600000, 700000);
    expect(tooHigh.feeMinError).toBe("Minimum monthly fee cannot exceed 500,000 BDT.");
    expect(tooHigh.feeMaxError).toBe("Maximum monthly fee cannot exceed 500,000 BDT.");
  });

  it("flags when maximum fee is lower than minimum fee", () => {
    const inverted = validateTuitionFees(8000, 5000);
    expect(inverted.feeMinError).toBeUndefined();
    expect(inverted.feeMaxError).toBe("The maximum fee cannot be lower than the minimum fee.");
  });

  it("handles string values with whitespace trimming", () => {
    const trimmed = validateTuitionFees("  5000  ", "  7000  ");
    expect(trimmed.feeMinError).toBeUndefined();
    expect(trimmed.feeMaxError).toBeUndefined();
  });
});

describe("validateTeachingExperience", () => {
  it("allows empty or null inputs", () => {
    expect(validateTeachingExperience(null)).toBeNull();
    expect(validateTeachingExperience(undefined)).toBeNull();
    expect(validateTeachingExperience("")).toBeNull();
  });

  it("rejects non-numeric or out of range experience", () => {
    expect(validateTeachingExperience("xyz")).toBe("Enter teaching experience between 0 and 60 years.");
    expect(validateTeachingExperience(-1)).toBe("Enter teaching experience between 0 and 60 years.");
    expect(validateTeachingExperience(65)).toBe("Enter teaching experience between 0 and 60 years.");
  });

  it("accepts realistic experience without DOB", () => {
    expect(validateTeachingExperience(5)).toBeNull();
    expect(validateTeachingExperience("3")).toBeNull();
  });

  it("cross-validates experience against tutor's age", () => {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    // 19-year-old tutor
    const dob19 = `${currentYear - 19}-01-01`;

    // 4 years is realistic (19 - 15 = 4)
    expect(validateTeachingExperience(4, dob19)).toBeNull();

    // 10 years is unrealistic
    const err = validateTeachingExperience(10, dob19);
    expect(err).toBe("At age 19, teaching experience cannot exceed 4 years (tuition experience typically starts from age 15).");

    // 25-year-old tutor: up to 10 years is realistic
    const dob25 = `${currentYear - 25}-01-01`;
    expect(validateTeachingExperience(10, dob25)).toBeNull();
    expect(validateTeachingExperience(15, dob25)).toContain("At age 25, teaching experience cannot exceed 10 years");
  });
});

describe("validateTeachingExpertiseText", () => {
  it("allows null or empty strings", () => {
    expect(validateTeachingExpertiseText(null, "Prior Teaching Experience")).toBeNull();
    expect(validateTeachingExpertiseText("", "Prior Teaching Experience")).toBeNull();
  });

  it("accepts valid, descriptive text", () => {
    const valid = "Taught SSC Physics and Higher Math at Mastermind Coaching for 3 years.";
    expect(validateTeachingExpertiseText(valid, "Prior Teaching Experience")).toBeNull();
  });

  it("rejects text shorter than 10 characters", () => {
    expect(validateTeachingExpertiseText("Math", "Special Expertise")).toBe(
      "Provide meaningful details about your special expertise (at least 10 characters).",
    );
  });

  it("rejects single repeated characters", () => {
    expect(validateTeachingExpertiseText("aaaaaaaaaaaaaaaaaaaa", "Special Expertise")).toBe(
      "Provide meaningful details about your special expertise rather than repetitive or placeholder text.",
    );
  });

  it("rejects repeated word loops", () => {
    expect(validateTeachingExpertiseText("physics physics physics physics physics", "Special Expertise")).toBe(
      "Provide meaningful details about your special expertise rather than repetitive or placeholder text.",
    );
  });

  it("rejects dummy placeholder text", () => {
    expect(validateTeachingExpertiseText("test test test demo demo demo asdf", "Academic Achievement")).toBe(
      "Provide meaningful details about your academic achievement rather than repetitive or placeholder text.",
    );
    expect(validateTeachingExpertiseText("N/A N/A N/A N/A N/A", "Academic Achievement")).toBe(
      "Provide meaningful details about your academic achievement rather than repetitive or placeholder text.",
    );
  });
});

describe("getTravelDistanceConsistencyWarning", () => {
  it("returns online_only warning when tutor offers online tuition only", () => {
    const warning = getTravelDistanceConsistencyWarning({
      tuitionTypes: ["online"],
      travelDistanceKm: 10,
      teachingAreaCount: 2,
    });
    expect(warning?.type).toBe("online_only");
    expect(warning?.message).toContain("Travel distance is not required");
  });

  it("returns small_radius_many_areas warning when 1-5 km radius is chosen with >3 teaching areas", () => {
    const warning = getTravelDistanceConsistencyWarning({
      tuitionTypes: ["home"],
      travelDistanceKm: 4,
      teachingAreaCount: 5,
    });
    expect(warning?.type).toBe("small_radius_many_areas");
    expect(warning?.message).toContain("1-5 km travel limit (4 km)");
    expect(warning?.message).toContain("Make sure all 5 selected teaching areas are within your commuting reach");
  });

  it("does not warn when 1-5 km radius is chosen with <=3 teaching areas", () => {
    const warning = getTravelDistanceConsistencyWarning({
      tuitionTypes: ["home"],
      travelDistanceKm: 5,
      teachingAreaCount: 2,
    });
    expect(warning).toBeNull();
  });

  it("returns high_radius warning when distance exceeds 30 km", () => {
    const warning = getTravelDistanceConsistencyWarning({
      tuitionTypes: ["home"],
      travelDistanceKm: 35,
      teachingAreaCount: 1,
    });
    expect(warning?.type).toBe("high_radius");
    expect(warning?.message).toContain("selected a travel limit of 35 km");
    expect(warning?.message).toContain("practical");
  });

  it("returns null for reasonable distances (e.g. 10 km) with normal area count", () => {
    const warning = getTravelDistanceConsistencyWarning({
      tuitionTypes: ["home"],
      travelDistanceKm: 10,
      teachingAreaCount: 4,
    });
    expect(warning).toBeNull();
  });

  it("returns null when travel distance is not entered yet", () => {
    expect(getTravelDistanceConsistencyWarning({ tuitionTypes: ["home"], travelDistanceKm: "" })).toBeNull();
    expect(getTravelDistanceConsistencyWarning({ tuitionTypes: ["home"], travelDistanceKm: null })).toBeNull();
  });
});
