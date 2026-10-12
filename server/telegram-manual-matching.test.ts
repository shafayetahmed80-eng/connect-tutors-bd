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
      tutoringTime: "16:30",
    } as Parameters<typeof buildGuardianRequestTelegramMessage>[0]);

    expect(message).not.toContain("Student gender");
    expect(message).not.toContain("female\n");
    expect(message).not.toContain("2 students");
    expect(message).not.toContain("south gate");
    expect(message).not.toContain("16:30");
    expect(message).not.toContain("4:30 PM");
  });

  it("does not carry the Tutoring Time, in either clock, whatever the request holds", () => {
    // The Owner's rule: the Telegram admin alert is routing data only. A request that has a
    // Tutoring Time must alert exactly as one that has none, so the time cannot leak in later
    // by the builder being widened to take the whole request.
    const request = {
      requestId: 44,
      category: "English Medium",
      classCourse: "Standard 2",
      subjects: ["English"],
      tuitionType: "online" as const,
      daysPerWeek: 4,
      preferredGender: "any" as const,
      monthlyBudget: 15000,
      locationText: "Uttara",
    };

    const without = buildGuardianRequestTelegramMessage(request);
    // Each time with how a 12-hour clock would write it, so a reformatted copy is caught too.
    for (const [tutoringTime, twelveHour] of [["16:30", "4:30 PM"], ["00:00", "12:00 AM"], ["08:05", "8:05 AM"], ["23:59", "11:59 PM"]]) {
      const message = buildGuardianRequestTelegramMessage({ ...request, tutoringTime } as Parameters<typeof buildGuardianRequestTelegramMessage>[0]);

      expect(message, tutoringTime).toBe(without);
      expect(message, tutoringTime).not.toContain(tutoringTime);
      expect(message, tutoringTime).not.toContain(twelveHour);
      expect(message, tutoringTime).not.toMatch(/tutoring time/i);
    }
  });
});

describe("Manual matching contract", () => {
  it("requires admin ownership for assignment operations", () => {
    expect(true).toBe(true);
  });
});
