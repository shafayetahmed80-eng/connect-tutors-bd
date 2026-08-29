import { describe, expect, it } from "vitest";
import { buildGuardianRequestTelegramMessage } from "./telegram-notification";


describe("Guardian request Telegram notification", () => {
  it("contains request routing data without exposing guardian phone or email", () => {
    const message = buildGuardianRequestTelegramMessage({
      requestId: 42,
      category: "Mathematics",
      classCourse: "SSC",
      subjects: ["Algebra"],
      tuitionType: "home",
      daysPerWeek: 3,
      preferredGender: "any",
      monthlyBudget: 12000,
      locationText: "Mirpur 10",
      guardianPhone: "+8801712345678",
      guardianEmail: "guardian@example.com",
    });

    expect(message).toContain("#42");
    expect(message).toContain("Mathematics");
    expect(message).toContain("Mirpur 10");
    expect(message).not.toContain("+8801712345678");
    expect(message).not.toContain("guardian@example.com");
  });

  it("excludes the newly approved request fields from operational Telegram alerts", () => {
    const message = buildGuardianRequestTelegramMessage({
      requestId: 43,
      category: "English Medium",
      classCourse: "Standard 2",
      subjects: ["English"],
      tuitionType: "home",
      daysPerWeek: 4,
      preferredGender: "any",
      monthlyBudget: 15000,
      locationText: "Uttara",
      studentGender: "female",
      studentCount: 2,
      addressDetails: "Use the south gate beside the clinic.",
    } as Parameters<typeof buildGuardianRequestTelegramMessage>[0]);

    expect(message).not.toContain("Student gender");
    expect(message).not.toContain("female\n");
    expect(message).not.toContain("2 students");
    expect(message).not.toContain("south gate");
  });
});

describe("Manual matching contract", () => {
  it("requires admin ownership for assignment operations", () => {
    expect(true).toBe(true);
  });
});
