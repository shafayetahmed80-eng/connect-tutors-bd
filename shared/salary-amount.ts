/**
 * The monthly salary a Guardian offers, as one number.
 *
 * It used to be a choice between a range and "Discuss with coordinator", which
 * meant a Tutor reading the Job Board often learned nothing about the money at
 * all. Now every request names an amount.
 *
 * The Guardian may type it however they like - `5000`, `5,000`, `5,000 Taka`,
 * even `৫০০০` - and it is stored as a plain integer and shown one way
 * everywhere. Rejecting a comma would be a strange thing to do to someone
 * writing down a number the way they always write it down.
 */

/** Largest amount accepted, matching the column the old range fields used. */
export const MAX_SALARY_AMOUNT = 500_000;

/** Bangla digits map to Latin so `৫০০০` reads as 5000. */
const banglaDigits = "০১২৩৪৫৬৭৮৯";

function toLatinDigits(value: string): string {
  return value.replace(/[০-৯]/g, digit => String(banglaDigits.indexOf(digit)));
}

/**
 * Reads whatever was typed and returns the number, or null when there is no
 * number in it at all.
 *
 * Everything that is not a digit is discarded, so the currency word, spaces,
 * commas and the ৳ sign all fall away. `5,000 Taka` and `5000` are the same
 * number, which is the point.
 */
export function parseSalaryAmount(input: string | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const digits = toLatinDigits(String(input)).replace(/[^0-9]/g, "");
  if (digits.length === 0) return null;
  // A very long run of digits would overflow into nonsense rather than being
  // an amount anyone meant; let the caller's range check reject it.
  const amount = Number(digits.slice(0, 12));
  return Number.isFinite(amount) ? amount : null;
}

/** `5000` becomes `5,000 Taka`. The one way an amount is written on screen. */
export function formatSalaryAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "Not set";
  return `${Math.round(amount).toLocaleString("en-US")} Taka`;
}

/** Just the grouped number, for an input the person is still editing. */
export function formatSalaryInput(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "";
  return Math.round(amount).toLocaleString("en-US");
}

export type SalaryValidationError = "missing" | "too-small" | "too-large";

/**
 * Whether an amount may be saved. Separate from parsing so a half-typed value
 * does not turn into an error message while someone is still typing.
 */
export function validateSalaryAmount(amount: number | null): SalaryValidationError | null {
  if (amount === null) return "missing";
  if (!Number.isInteger(amount) || amount <= 0) return "too-small";
  if (amount > MAX_SALARY_AMOUNT) return "too-large";
  return null;
}

export function salaryValidationMessage(error: SalaryValidationError): string {
  switch (error) {
    case "missing":
      return "Enter the monthly salary you are offering.";
    case "too-small":
      return "Enter a salary greater than zero.";
    case "too-large":
      return `Enter a salary of ${MAX_SALARY_AMOUNT.toLocaleString("en-US")} Taka or less.`;
  }
}

/** Placeholder for the amount field, kept here so the form and its tests agree. */
export const SALARY_INPUT_PLACEHOLDER = "Ex - 5,000";
