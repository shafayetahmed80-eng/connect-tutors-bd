import { describe, expect, it } from "vitest";
import {
  defaultSiteLimits,
  documentByteLimit,
  resolveSiteLimits,
  siteLimits,
  siteLimitCeiling,
} from "./site-limits";

describe("site limits", () => {
  it("ships every limit inside its own bounds", () => {
    // A default outside its bounds would mean the editor could not show the
    // number the site is actually running on.
    for (const limit of siteLimits) {
      expect(limit.value, limit.id).toBeGreaterThanOrEqual(limit.min);
      expect(limit.value, limit.id).toBeLessThanOrEqual(limit.max);
      expect(Number.isInteger(limit.value), limit.id).toBe(true);
    }
  });

  it("keeps text limits at or below the column that stores them", () => {
    // Raising these past the column would move the failure from validation,
    // where the person sees a message, to the insert, where they see a crash.
    expect(siteLimitCeiling("tutor.headlineChars")).toBe(240);
    expect(siteLimitCeiling("request.addressChars")).toBe(160);
  });

  it("keeps a request's subjects apart from a Tutor's", () => {
    // What a family is asking for and what a person teaches are different
    // numbers that happen to count the same kind of thing. Merging them would
    // be a decision nobody made, so they stay separate and start where the
    // code had them.
    const limits = defaultSiteLimits();
    expect(limits["request.subjects"]).toBe(12);
    expect(limits["tutor.subjects"]).toBe(8);
    expect(limits["request.languages"]).toBe(8);
    expect(limits["tutor.languages"]).toBe(6);
  });

  it("uses the shipped number when nothing is stored", () => {
    expect(resolveSiteLimits([])).toEqual(defaultSiteLimits());
  });

  it("takes the Owner's number when it is stored and in range", () => {
    expect(resolveSiteLimits([{ limitId: "request.subjects", value: 6 }])["request.subjects"]).toBe(6);
  });

  it("ignores a stored value outside its bounds rather than clamping it", () => {
    // Bounds can tighten in a later deploy while an old row sits in the table.
    // Clamping would enforce a number nobody chose; the shipped one at least
    // matches what the code was written against.
    expect(resolveSiteLimits([{ limitId: "request.subjects", value: 500 }])["request.subjects"]).toBe(12);
    expect(resolveSiteLimits([{ limitId: "request.subjects", value: 0 }])["request.subjects"]).toBe(12);
  });

  it("ignores a limit the registry no longer declares", () => {
    // Retiring a limit in code must not leave an orphaned row steering anything.
    expect(() => resolveSiteLimits([{ limitId: "gone.away", value: 3 }])).not.toThrow();
    expect(resolveSiteLimits([{ limitId: "gone.away", value: 3 }])).toEqual(defaultSiteLimits());
  });

  it("ignores a fractional value", () => {
    expect(resolveSiteLimits([{ limitId: "jobBoard.expiryDays", value: 7.5 }])["jobBoard.expiryDays"]).toBe(14);
  });

  it("turns the upload limit into bytes", () => {
    expect(documentByteLimit(defaultSiteLimits())).toBe(5 * 1024 * 1024);
    expect(documentByteLimit(resolveSiteLimits([{ limitId: "upload.documentMb", value: 8 }]))).toBe(8 * 1024 * 1024);
  });

  it("gives every limit a group, a unit and help text, since the editor shows all three", () => {
    for (const limit of siteLimits) {
      expect(limit.group, limit.id).toBeTruthy();
      expect(limit.unit, limit.id).toBeTruthy();
      expect(limit.help.length, limit.id).toBeGreaterThan(10);
    }
  });
});
