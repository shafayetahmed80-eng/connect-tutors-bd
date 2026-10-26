import { calculateAgeInYears } from "./tutor-personal-details";

/**
 * A Tutor who offers only online tuition has no place to teach in, so Teaching
 * Areas is theirs to leave empty. Anyone who offers anything else, alone or
 * alongside it, must still say where.
 *
 * One answer for the form, the completion count and the server's submission
 * check, so they cannot disagree about who has to fill it in.
 */
export function offersOnlineTuitionOnly(value: { tuitionTypes?: readonly string[] }): boolean {
  return value.tuitionTypes?.length === 1 && value.tuitionTypes[0] === "online";
}

/**
 * Minimum realistic monthly tuition fee in BDT.
 * Tutors commonly mistake monthly tuition fee for a per-class or hourly rate
 * (e.g. typing 300 or 500 BDT), so this minimum enforces monthly expectations.
 */
export const MIN_MONTHLY_TUITION_FEE = 1000;
export const MAX_MONTHLY_TUITION_FEE = 500000;

export type TuitionFeeValidationResult = {
  feeMinError?: string;
  feeMaxError?: string;
};

function parseFeeInteger(value: number | string | null | undefined): number | undefined | typeof NaN {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) return NaN;
    return value;
  }
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  if (!/^\d+$/.test(trimmed)) return NaN;
  const parsed = parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) ? parsed : NaN;
}

/**
 * Validates minimum and maximum monthly tuition fee expectations.
 * Enforces:
 * 1. Valid non-negative integers up to 500,000 BDT.
 * 2. Minimum realistic monthly fee of at least 1,000 BDT (preventing per-class rate confusion).
 * 3. Maximum fee cannot be lower than minimum fee.
 */
export function validateTuitionFees(
  feeMin: number | string | null | undefined,
  feeMax: number | string | null | undefined,
): TuitionFeeValidationResult {
  const result: TuitionFeeValidationResult = {};

  const minVal = parseFeeInteger(feeMin);
  const maxVal = parseFeeInteger(feeMax);

  if (Number.isNaN(minVal) || (minVal !== undefined && minVal < 0)) {
    result.feeMinError = "Enter a valid minimum monthly fee.";
  } else if (minVal !== undefined) {
    if (minVal < MIN_MONTHLY_TUITION_FEE) {
      result.feeMinError = "Minimum monthly fee must be at least 1,000 BDT (enter monthly salary, not per-class rate).";
    } else if (minVal > MAX_MONTHLY_TUITION_FEE) {
      result.feeMinError = "Minimum monthly fee cannot exceed 500,000 BDT.";
    }
  }

  if (Number.isNaN(maxVal) || (maxVal !== undefined && maxVal < 0)) {
    result.feeMaxError = "Enter a valid maximum monthly fee.";
  } else if (maxVal !== undefined) {
    if (maxVal < MIN_MONTHLY_TUITION_FEE) {
      result.feeMaxError = "Maximum monthly fee must be at least 1,000 BDT (enter monthly salary, not per-class rate).";
    } else if (maxVal > MAX_MONTHLY_TUITION_FEE) {
      result.feeMaxError = "Maximum monthly fee cannot exceed 500,000 BDT.";
    }
  }

  // Cross-field validation: max cannot be lower than min (only if maxVal itself had no syntax/floor error)
  if (
    !result.feeMaxError &&
    minVal !== undefined &&
    maxVal !== undefined &&
    !Number.isNaN(minVal) &&
    !Number.isNaN(maxVal) &&
    minVal > maxVal
  ) {
    result.feeMaxError = "The maximum fee cannot be lower than the minimum fee.";
  }

  return result;
}

/**
 * Validates teaching experience years and cross-validates against tutor's age.
 * In Bangladesh, student tuition typically commences after Class 9/10 (around age 15).
 * Enforces that teaching experience cannot exceed (age - 15) when age is known.
 */
export function validateTeachingExperience(
  years: number | string | null | undefined,
  dateOfBirth?: string | null,
): string | null {
  if (years === null || years === undefined || years === "") return null;
  const num = typeof years === "number" ? years : Number(years);
  if (!Number.isInteger(num) || num < 0 || num > 60) {
    return "Enter teaching experience between 0 and 60 years.";
  }

  if (dateOfBirth) {
    const age = calculateAgeInYears(dateOfBirth);
    if (age !== null) {
      const maxRealistic = Math.max(0, age - 15);
      if (num > maxRealistic) {
        return `At age ${age}, teaching experience cannot exceed ${maxRealistic} years (tuition experience typically starts from age 15).`;
      }
    }
  }

  return null;
}

export const DUMMY_EXPERTISE_TOKENS = new Set([
  "test",
  "demo",
  "asdf",
  "qwerty",
  "testing",
  "sample",
  "blah",
  "na",
  "nil",
  "none",
  "nothing",
  "null",
  "undefined",
  "fake",
  "xxx",
  "xyz",
]);

/**
 * Validates free-form teaching expertise fields (Prior Teaching Experience,
 * Special Expertise, Academic Achievement).
 */
export function validateTeachingExpertiseText(
  text: string | null | undefined,
  fieldLabel: string,
): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  const normalized = trimmed.toLowerCase().replace(/n\/a/g, "na");

  if (trimmed.length < 10) {
    return `Provide meaningful details about your ${fieldLabel.toLowerCase()} (at least 10 characters).`;
  }

  // Repeated single characters (e.g. "aaaaaaaaaa" or "............")
  const strippedNonSpace = normalized.replace(/\s+/g, "");
  if (strippedNonSpace.length > 5 && /^(.)\1+$/.test(strippedNonSpace)) {
    return `Provide meaningful details about your ${fieldLabel.toLowerCase()} rather than repetitive or placeholder text.`;
  }
  if (/(.)\1{6,}/.test(normalized)) {
    return `Provide meaningful details about your ${fieldLabel.toLowerCase()} rather than repetitive or placeholder text.`;
  }

  // Tokenize into words
  const tokens = normalized
    .split(/[\s,·\-|/.;:!?()[\]{}"'\n\r\t]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  if (tokens.length === 0) {
    return `Provide meaningful details about your ${fieldLabel.toLowerCase()} rather than repetitive or placeholder text.`;
  }

  // Repetitive word loops
  const uniqueTokens = new Set(tokens);
  if (tokens.length >= 3 && uniqueTokens.size === 1) {
    return `Provide meaningful details about your ${fieldLabel.toLowerCase()} rather than repetitive or placeholder text.`;
  }
  if (tokens.length >= 4 && uniqueTokens.size <= 2) {
    return `Provide meaningful details about your ${fieldLabel.toLowerCase()} rather than repetitive or placeholder text.`;
  }

  // Dummy placeholder tokens
  const nonDummyTokens = tokens.filter(t => !DUMMY_EXPERTISE_TOKENS.has(t));
  if (nonDummyTokens.length === 0) {
    return `Provide meaningful details about your ${fieldLabel.toLowerCase()} rather than repetitive or placeholder text.`;
  }

  return null;
}
