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
