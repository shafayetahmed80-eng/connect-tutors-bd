import { describe, expect, it } from "vitest";
import { getTutorRequestInboxSummary } from "./TutorDashboard";

describe("Tutor assigned-request inbox", () => {
  it("builds a matching summary without carrying Guardian contact details or the private student name", () => {
    const summary = getTutorRequestInboxSummary({
      category: "Bangla Medium",
      classCourse: "Class 9–10",
      subjects: '["Mathematics","Physics"]',
      tuitionType: "home",
      daysPerWeek: 3,
      preferredGender: "any",
      monthlyBudget: 12000,
      locationText: "Mirpur 10",
      status: "matched",
      studentFirstName: "Rafi",
      guardianPhone: "01700000000",
      guardianEmail: "guardian@example.com",
    });

    expect(summary).toEqual({
      title: "Bangla Medium · Class 9–10",
      subjects: "Mathematics, Physics",
      tuition: "Home tuition · 3 days/week",
      location: "Mirpur 10",
      budget: "৳12,000/month",
    });
    expect(summary).not.toHaveProperty("studentFirstName");
    expect(summary).not.toHaveProperty("guardianPhone");
    expect(summary).not.toHaveProperty("guardianEmail");
  });
});
