/**
 * The time of day a Guardian would like the tuition to start.
 *
 * One optional wish on a request, not a booking: it is a wall-clock time with
 * no zone and no end, stored as a zero-padded 24-hour `HH:mm` string - exactly
 * what a browser's time box hands back - so it never passes through a driver or
 * a time-zone conversion. Zero-padded 24-hour strings also sort in time order.
 *
 * Whatever the box on the Guardian's phone shows (some show AM/PM, some 24
 * hours), every reader here sees it written the same way: `4:30 PM`.
 */

export const TUTORING_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A stored or typed value that is a real `HH:mm` time; anything else (including a blank) is not. */
export function isTutoringTime(value: unknown): value is string {
  return typeof value === "string" && TUTORING_TIME_PATTERN.test(value);
}

/** The value to store or send: a valid `HH:mm`, or "" when the box holds nothing that reads as a time. */
export function normalizeTutoringTime(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  return isTutoringTime(text) ? text : "";
}

/** `16:30` as `4:30 PM`, `00:05` as `12:05 AM`; "" for a blank or invalid value, so a reader can leave the row out. */
export function formatTutoringTime(value: unknown): string {
  const time = normalizeTutoringTime(value);
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}
