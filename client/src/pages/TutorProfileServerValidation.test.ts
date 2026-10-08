import { describe, expect, it } from "vitest";
import { getTutorProfileServerIssueDetails, getTutorProfileServerValidationErrors } from "./TutorProfileServerValidation";

describe("getTutorProfileServerIssueDetails", () => {
  it("says what the server refused and which part of the profile it lives in", () => {
    expect(getTutorProfileServerIssueDetails({
      data: { tutorProfileFieldIssues: [{ path: ["availableNationwide"], message: "Online tuition requires nationwide availability." }] },
    })).toEqual(["Tuition and location · Available Nationwide: Online tuition requires nationwide availability."]);
  });

  it("names the record and the field inside an education record or private detail", () => {
    expect(getTutorProfileServerIssueDetails({
      data: {
        tutorProfileFieldIssues: [
          { path: ["educationRecords", 1, "passingYear"], message: "Enter a valid year." },
          { path: ["privateDetails", "fatherPhone"], message: "Enter a valid mobile number." },
        ],
      },
    })).toEqual([
      "Education · Education history, record 2, Passing year: Enter a valid year.",
      "Father phone: Enter a valid mobile number.",
    ]);
  });

  it("falls back to the server's input-check reasons when the profile rules never ran", () => {
    expect(getTutorProfileServerIssueDetails({
      data: { zodFieldErrors: { preferredTeachingDays: ["Choose each day once."], feeMin: ["Number must be greater than or equal to 0"] } },
    })).toEqual([
      "Preferred Teaching Days: Choose each day once.",
      "Minimum Monthly Fee: Number must be greater than or equal to 0",
    ]);
  });

  it("lists a reason once, caps the list, and ignores a malformed one", () => {
    const issues = [
      ...Array.from({ length: 12 }, (_, index) => ({ path: ["educationRecords", index, "passingYear"], message: "Enter a valid year." })),
      { path: ["feeMax"], message: "Same." },
      { path: ["feeMax"], message: "Same." },
      { path: "feeMax", message: "Malformed path" },
      { path: ["feeMax"], message: "   " },
    ];

    const details = getTutorProfileServerIssueDetails({ data: { tutorProfileFieldIssues: issues } });

    expect(details).toHaveLength(8);
    expect(new Set(details).size).toBe(8);
    expect(getTutorProfileServerIssueDetails(null)).toEqual([]);
    expect(getTutorProfileServerIssueDetails({ data: {} })).toEqual([]);
  });
});

describe("getTutorProfileServerValidationErrors", () => {
  it("maps allowlisted server issue paths to actionable English field guidance", () => {
    const errors = getTutorProfileServerValidationErrors({
      data: {
        tutorProfileFieldIssues: [
          { path: ["feeMax"], message: "Maximum fee must not be lower than minimum fee." },
          { path: ["teachingAreaIds"], message: "Select at least one teaching area." },
        ],
      },
    });

    expect(errors).toEqual({
      feeMax: "Check Maximum Monthly Fee and try again.",
      teachingAreaIds: "Check Teaching Areas and try again.",
    });
  });

  it("ignores unknown paths and malformed error metadata", () => {
    expect(
      getTutorProfileServerValidationErrors({
        data: {
          tutorProfileFieldIssues: [
            { path: ["internalStorageKey"], message: "Sensitive internal detail" },
            { path: ["feeMin", "nested"], message: "Unexpected nested path" },
            { path: "feeMax", message: "Malformed path" },
          ],
        },
      }),
    ).toEqual({});
  });

  it("maps safe server-only paths to their rendered client recovery fields", () => {
    expect(
      getTutorProfileServerValidationErrors({
        data: {
          tutorProfileFieldIssues: [
            { path: ["profilePhotoKey"], message: "Photo is required." },
            { path: ["availableNationwide"], message: "Nationwide availability is required." },
          ],
        },
      }),
    ).toEqual({
      profilePhotoUrl: "Check Profile Photo and try again.",
      availableNationwide: "Check Available Nationwide and try again.",
    });
  });
});
