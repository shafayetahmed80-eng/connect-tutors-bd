import { describe, expect, it } from "vitest";
import {
  MIN_MONTHLY_TUITION_FEE,
  MAX_MONTHLY_TUITION_FEE,
  offersOnlineTuitionOnly,
  validateTuitionFees,
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
