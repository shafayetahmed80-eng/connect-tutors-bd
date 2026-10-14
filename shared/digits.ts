/**
 * Shared digit normalization between Bangla and English digits.
 *
 * Converts Bangla numerals (০, ১, ২, ৩, ৪, ৫, ৬, ৭, ৮, ৯) into
 * standard ASCII Latin digits (0, 1, 2, 3, 4, 5, 6, 7, 8, 9).
 *
 * This ensures users typing with Bangla keyboards (Avro, Bijoy, Gboard, etc.)
 * or pasting Bengali numerals can smoothly input numeric values across
 * phone numbers, salaries, OTP codes, passing years, and ID fields.
 */

export const BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯";

/**
 * Converts any Bangla numeral character [০-৯] to its ASCII [0-9] equivalent.
 * Characters that are not Bangla digits remain unchanged.
 */
export function toEnglishDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return str.replace(/[০-৯]/g, digit => String(BANGLA_DIGITS.indexOf(digit)));
}

/**
 * Converts standard ASCII Latin digits [0-9] to their Bangla numeral [০-৯] equivalents.
 * Characters that are not ASCII digits remain unchanged.
 */
export function toBanglaDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[0-9]/g, digit => BANGLA_DIGITS.charAt(Number(digit)));
}

/**
 * Normalizes input by converting Bangla digits to English digits
 * and stripping out all non-digit characters.
 *
 * @param value The raw input string
 * @param maxLength Optional maximum length of output digits
 */
export function normalizeNumericDigits(value: string | number | null | undefined, maxLength?: number): string {
  const converted = toEnglishDigits(value).replace(/\D/g, "");
  return typeof maxLength === "number" ? converted.slice(0, maxLength) : converted;
}
