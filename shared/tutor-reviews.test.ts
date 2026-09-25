import { describe, expect, it } from "vitest";
import { formatTutorRating, summariseTutorRatings } from "./tutor-reviews";

describe("tutor rating summary", () => {
  it("averages to one decimal and counts", () => {
    expect(summariseTutorRatings([5, 4, 5])).toEqual({ average: 4.7, count: 3 });
    expect(summariseTutorRatings([])).toEqual({ average: null, count: 0 });
  });

  it("reads as a short line, and nothing before anyone has rated", () => {
    expect(formatTutorRating({ average: 4.7, count: 3 })).toBe("4.7 · 3 ratings");
    expect(formatTutorRating({ average: 5, count: 1 })).toBe("5.0 · 1 rating");
    expect(formatTutorRating({ average: null, count: 0 })).toBeNull();
  });
});
