import { describe, expect, it } from "vitest";
import { getSafeTutorProfileFieldIssues } from "./tutor-profile-error-contract";

describe("getSafeTutorProfileFieldIssues", () => {
  it("keeps where inside an education record or a private detail the server refused", () => {
    expect(
      getSafeTutorProfileFieldIssues([
        { path: ["educationRecords", 0, "passingYear"], message: "Enter a year between 1950 and 2026." },
        { path: ["privateDetails", "fatherPhone"], message: "Enter a valid mobile number." },
      ]),
    ).toEqual([
      { path: ["educationRecords", 0, "passingYear"], message: "Enter a year between 1950 and 2026." },
      { path: ["privateDetails", "fatherPhone"], message: "Enter a valid mobile number." },
    ]);
  });

  it("drops a path that goes deep into anything else, or too deep, or carries something odd", () => {
    expect(
      getSafeTutorProfileFieldIssues([
        { path: ["educationRecords", 0, "a", "b", "c"], message: "Too deep" },
        { path: ["educationRecords", -1, "passingYear"], message: "Negative index" },
        { path: ["educationRecords", 0, "pass.ingYear"], message: "Odd segment" },
        { path: ["internalStorageKey", "x"], message: "Not a container" },
        { path: [], message: "Empty" },
      ]),
    ).toEqual([]);
  });

  it("names the field Tuition Type is stored under, so a refusal there is no longer dropped", () => {
    expect(getSafeTutorProfileFieldIssues([{ path: ["tuitionTypes"], message: "Choose each tuition type once." }])).toEqual([
      { path: ["tuitionTypes"], message: "Choose each tuition type once." },
    ]);
  });

  it("keeps only allowlisted one-segment Tutor Profile validation paths", () => {
    expect(
      getSafeTutorProfileFieldIssues([
        { path: ["feeMax"], message: "Maximum fee must not be lower than minimum fee." },
        { path: ["internalStorageKey"], message: "Internal data" },
        { path: ["currentLocationId", "nested"], message: "Unexpected nesting" },
      ]),
    ).toEqual([{ path: ["feeMax"], message: "Maximum fee must not be lower than minimum fee." }]);
  });
});
