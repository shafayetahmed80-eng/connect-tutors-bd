import { describe, expect, it } from "vitest";
import { pickDirectoryInstitute } from "./directory-institute";

const record = (qualificationLevel: string | null, instituteName: string | null) => ({ qualificationLevel, instituteName });

describe("pickDirectoryInstitute", () => {
  it("prefers the Honours institute, then the Masters one", () => {
    expect(pickDirectoryInstitute([record("Masters", "Jahangirnagar University"), record("Honours", "University of Dhaka"), record("HSC", "Notre Dame College")])).toBe("University of Dhaka");
    expect(pickDirectoryInstitute([record("HSC", "Notre Dame College"), record("Masters", "Jahangirnagar University")])).toBe("Jahangirnagar University");
  });

  it("falls back to the Higher Secondary college, then the Secondary school, for a Tutor with nothing above", () => {
    expect(pickDirectoryInstitute([record("SSC", "Narandia High School"), record("HSC", "Notre Dame College")])).toBe("Notre Dame College");
    expect(pickDirectoryInstitute([record("SSC", "Narandia High School")])).toBe("Narandia High School");
  });

  it("skips a record with no name, and is null when nothing is named", () => {
    expect(pickDirectoryInstitute([record("Honours", "  "), record("SSC", "Narandia High School")])).toBe("Narandia High School");
    expect(pickDirectoryInstitute([record("SSC", null), record(null, "Somewhere")])).toBeNull();
    expect(pickDirectoryInstitute([])).toBeNull();
  });
});
