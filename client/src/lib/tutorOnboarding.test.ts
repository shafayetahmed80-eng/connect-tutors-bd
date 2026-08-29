import { describe, expect, it } from "vitest";
import { formatBangladeshMobile, isValidBangladeshLocalMobile, normalizeBangladeshLocalMobile, splitCommaSeparated } from "./tutorOnboarding";

describe("Tutor onboarding helpers", () => {
  it("converts comma-separated profile fields into clean lists", () => {
    expect(splitCommaSeparated(" Mathematics, Physics ,, English ")).toEqual(["Mathematics", "Physics", "English"]);
  });

  it("normalizes common Bangladesh mobile formats to the 10-digit local entry", () => {
    expect(normalizeBangladeshLocalMobile("01712 345678")).toBe("1712345678");
    expect(normalizeBangladeshLocalMobile("+8801712345678")).toBe("1712345678");
    expect(formatBangladeshMobile("01712 345678")).toBe("+8801712345678");
  });

  it("accepts only valid Bangladesh mobile local numbers", () => {
    expect(isValidBangladeshLocalMobile("1712345678")).toBe(true);
    expect(isValidBangladeshLocalMobile("1212345678")).toBe(false);
    expect(isValidBangladeshLocalMobile("171234567")).toBe(false);
  });
});
