import { describe, expect, it } from "vitest";
import { getTutorProfileServerValidationErrors } from "./TutorProfileServerValidation";

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
