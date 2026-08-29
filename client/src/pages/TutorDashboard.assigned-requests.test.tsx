import { describe, expect, it } from "vitest";
import { getTutorAssignedRequestDetails, tutorDashboardNavigation } from "./TutorDashboard";

describe("assigned Tutor request details", () => {
  it("shares only the approved Number of Students and Address Details, never Student Gender", () => {
    expect(getTutorAssignedRequestDetails({
      tuitionType: "home",
      studentCount: 2,
      addressDetails: "Use the west entrance beside the pharmacy.",
      studentGender: "female",
    })).toEqual({
      studentCount: "2 students",
      addressDetails: "Use the west entrance beside the pharmacy.",
    });
  });

  it("keeps Group Tutoring on its separate maximum-capacity model", () => {
    expect(getTutorAssignedRequestDetails({
      tuitionType: "group",
      studentCount: 8,
      addressDetails: null,
      studentGender: "male",
    })).toEqual({ studentCount: null, addressDetails: null });
  });

  it("keeps the private Confirmation Letter destination active for assigned Tutor recipients", () => {
    const confirmationLetter = tutorDashboardNavigation.find(item => item.path === "/tutor/dashboard/confirmation-letter");
    expect(confirmationLetter).toMatchObject({
      label: "Confirmation Letter",
      sectionLabel: "Active workspace",
    });
    expect(confirmationLetter?.planned).not.toBe(true);
  });
});
