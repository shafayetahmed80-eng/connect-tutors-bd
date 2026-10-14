import { toEnglishDigits } from "./digits";

export const BANGLADESH_COUNTRY_CODE = "+880";

/**
 * Cleans a typed or pasted Bangladesh mobile number into exactly 0 to 10 local digits.
 *
 * It normalizes Bengali digits, strips all non-digit formatting characters,
 * strips leading international code (+880 or 880), and strips any leading trunk 0.
 * The result is guaranteed to be 0 to 10 digits without prefix (e.g. "1712345678").
 */
export function cleanBangladeshLocalPhoneDigits(value: string | null | undefined): string {
  if (!value) return "";
  const english = toEnglishDigits(value);
  let digits = english.replace(/\D/g, "");
  if (digits.startsWith("880")) {
    digits = digits.slice(3);
  }
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

/**
 * Visually groups 10 local digits into a human-friendly format:
 * "1712 345 678" (4 digits - 3 digits - 3 digits).
 *
 * For partial inputs while typing, spaces are introduced naturally:
 * - "1712" -> "1712"
 * - "17123" -> "1712 3"
 * - "1712345" -> "1712 345"
 * - "17123456" -> "1712 345 6"
 * - "1712345678" -> "1712 345 678"
 */
export function formatBangladeshLocalPhoneDisplay(value: string | null | undefined): string {
  const digits = cleanBangladeshLocalPhoneDigits(value);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
}

/**
 * Checks whether the value represents a valid 10-digit Bangladesh mobile number.
 * Standard operators in Bangladesh: 013, 014, 015, 016, 017, 018, 019.
 * With the leading 0 removed, it must match 1[3-9] followed by 8 digits.
 */
export function isValidBangladeshLocalPhone(value: string | null | undefined): boolean {
  return /^1[3-9]\d{8}$/.test(cleanBangladeshLocalPhoneDigits(value));
}

/**
 * Converts local digits or raw phone string into canonical international form (+8801XXXXXXXXX).
 */
export function toInternationalBangladeshPhone(value: string | null | undefined): string {
  const digits = cleanBangladeshLocalPhoneDigits(value);
  return digits ? `${BANGLADESH_COUNTRY_CODE}${digits}` : "";
}
