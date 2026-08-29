import { describe, expect, it } from "vitest";
import { getSafeTutorProfileFieldIssues } from "./tutor-profile-error-contract";

describe("getSafeTutorProfileFieldIssues", () => {
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
