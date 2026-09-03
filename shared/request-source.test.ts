import { describe, expect, it } from "vitest";
import {
  formatInstituteName,
  formatRequestSource,
  INSTITUTE_NAME_MAX_LENGTH,
  isRequestSource,
  normalizeInstituteName,
  REQUEST_SOURCE_VALUES,
} from "./request-source";

describe("request source", () => {
  it("offers exactly the four approved referral answers", () => {
    expect(REQUEST_SOURCE_VALUES).toEqual(["friends_family", "facebook", "websites", "others"]);
    expect(REQUEST_SOURCE_VALUES.map(formatRequestSource)).toEqual([
      "Friends & Family",
      "Facebook",
      "Websites",
      "Others",
    ]);
  });

  it("reads an unknown, empty, or missing answer as Not set rather than guessing", () => {
    expect(formatRequestSource("")).toBe("Not set");
    expect(formatRequestSource(null)).toBe("Not set");
    expect(formatRequestSource("instagram")).toBe("Not set");
    expect(isRequestSource("instagram")).toBe(false);
    expect(isRequestSource("facebook")).toBe(true);
  });
});

describe("institute name", () => {
  it("collapses stray whitespace so one school does not arrive in three shapes", () => {
    expect(normalizeInstituteName("  Dhaka   College ")).toBe("Dhaka College");
    expect(normalizeInstituteName("\nNotre Dame\tCollege\n")).toBe("Notre Dame College");
  });

  it("leaves a blank optional field blank instead of inventing an answer", () => {
    expect(normalizeInstituteName("   ")).toBe("");
    expect(normalizeInstituteName(null)).toBe("");
    expect(formatInstituteName("   ")).toBe("Not set");
    expect(formatInstituteName("Dhaka College")).toBe("Dhaka College");
  });

  it("caps the stored length at what the column holds", () => {
    expect(INSTITUTE_NAME_MAX_LENGTH).toBe(120);
  });
});
