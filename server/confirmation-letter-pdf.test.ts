import { describe, expect, it } from "vitest";
import { renderConfirmationLetterPdf } from "./confirmation-letter-pdf";

describe("bilingual confirmation-letter PDF", () => {
  it("renders an in-memory PDF using only the approved operational snapshot fields", async () => {
    const pdf = await renderConfirmationLetterPdf({
      letterNumber: "CTB-2026-000019-V1",
      version: 1,
      issuedAt: new Date("2026-08-23T00:00:00.000Z"),
      requestId: 19,
      tutorReference: "T-1001",
      tutorName: "Ayesha Rahman",
      category: "Bangla Medium",
      curriculumType: null,
      classCourse: "Class 9",
      subjects: ["English", "Mathematics"],
      tuitionType: "home",
      daysPerWeek: 3,
      agreedStartDate: "2026-09-01",
      agreedFeeMinimum: 5000,
      agreedFeeMaximum: 7000,
      packageDurationMonths: null,
    });

    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(1_000);
    expect(pdf.toString("latin1")).not.toContain("Private landmark");
    expect(pdf.toString("latin1")).not.toContain("guardian@example.com");
  });
});
