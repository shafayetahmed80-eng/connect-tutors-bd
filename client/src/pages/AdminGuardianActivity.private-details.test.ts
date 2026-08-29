import { describe, expect, it } from "vitest";
import { getAdminGuardianPrivateDetails } from "./AdminGuardianActivity";

describe("Admin Guardian Activity private request details", () => {
  it("returns Student Gender, Address Details, and a type-specific Number of Students for Administrators", () => {
    expect(getAdminGuardianPrivateDetails({
      tuitionType: "package",
      studentCount: 2,
      studentGender: "female",
      addressDetails: "Ask for the apartment caretaker.",
    })).toEqual([
      { label: "Number of students", value: "2 students" },
      { label: "Student gender", value: "Female" },
      { label: "Address details", value: "Ask for the apartment caretaker." },
    ]);
  });

  it("does not turn Group capacity into the non-Group Number of Students field", () => {
    expect(getAdminGuardianPrivateDetails({ tuitionType: "group", studentCount: 12, studentGender: null, addressDetails: null }))
      .toEqual([]);
  });
});
