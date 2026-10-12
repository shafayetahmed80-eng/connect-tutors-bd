import { describe, expect, it } from "vitest";
import { formatTutoringTime, isTutoringTime, normalizeTutoringTime, TUTORING_TIME_PATTERN } from "./tutoring-time";

describe("Tutoring Time", () => {
  it("accepts a zero-padded 24-hour HH:mm and nothing else", () => {
    for (const value of ["00:00", "04:30", "12:00", "16:30", "23:59"]) expect(TUTORING_TIME_PATTERN.test(value)).toBe(true);
    for (const value of ["", "24:00", "16:60", "4:30", "4:30 PM", "16:30:00", " 16:30", "ab:cd", "1630"]) expect(TUTORING_TIME_PATTERN.test(value)).toBe(false);
  });

  it("knows a time from a non-string or a blank", () => {
    expect(isTutoringTime("16:30")).toBe(true);
    expect(isTutoringTime("")).toBe(false);
    expect(isTutoringTime(null)).toBe(false);
    expect(isTutoringTime(1630)).toBe(false);
  });

  it("normalises to a valid time or to a blank, trimming first", () => {
    expect(normalizeTutoringTime(" 16:30 ")).toBe("16:30");
    expect(normalizeTutoringTime("4:30 PM")).toBe("");
    expect(normalizeTutoringTime(undefined)).toBe("");
  });

  it("writes every time as AM/PM, with midnight and noon as 12", () => {
    expect(formatTutoringTime("16:30")).toBe("4:30 PM");
    expect(formatTutoringTime("00:05")).toBe("12:05 AM");
    expect(formatTutoringTime("00:00")).toBe("12:00 AM");
    expect(formatTutoringTime("12:00")).toBe("12:00 PM");
    expect(formatTutoringTime("12:45")).toBe("12:45 PM");
    expect(formatTutoringTime("13:05")).toBe("1:05 PM");
    expect(formatTutoringTime("09:07")).toBe("9:07 AM");
    expect(formatTutoringTime("23:59")).toBe("11:59 PM");
  });

  it("writes nothing for a blank or invalid value, so a reader can leave the row out", () => {
    expect(formatTutoringTime("")).toBe("");
    expect(formatTutoringTime(null)).toBe("");
    expect(formatTutoringTime("soon")).toBe("");
  });
});
