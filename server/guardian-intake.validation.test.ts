import { describe, expect, it } from "vitest";
import {
  GuardianIntakeValidationError,
  normalizeBangladeshMobile,
} from "./guardian-intake.validation";

describe("Guardian phone intake validation", () => {
  it("normalizes supported Bangladesh mobile formats to the private canonical form", () => {
    expect(normalizeBangladeshMobile("01516131411")).toBe("+8801516131411");
    expect(normalizeBangladeshMobile("+880 1516-131411")).toBe("+8801516131411");
  });

  it("rejects invalid Bangladesh mobile prefixes and incorrect lengths", () => {
    expect(() => normalizeBangladeshMobile("01216131411")).toThrow(
      GuardianIntakeValidationError,
    );
    expect(() => normalizeBangladeshMobile("0151613141")).toThrow(
      GuardianIntakeValidationError,
    );
  });
});
