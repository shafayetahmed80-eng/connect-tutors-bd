import { describe, expect, it } from "vitest";
import {
  buildConfirmationLetterContent,
  formatLetterFee,
  formatLetterLongDate,
  formatLetterPhone,
  letterCopy,
  letterTutorId,
  renderConfirmationLetterPdf,
  splitScriptRuns,
  type ConfirmationLetterDocument,
} from "./confirmation-letter-pdf";

const letter: ConfirmationLetterDocument = {
  letterNumber: "CTB-2026-000019-V1",
  version: 1,
  issuedAt: new Date("2026-08-23T00:00:00.000Z"),
  requestId: 19,
  tutorReference: "777",
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
};

const BENGALI = /[ঀ-৿]/;

describe("the Tutor ID on a confirmation letter", () => {
  it("prints the Tutor ID people know", () => {
    expect(letterTutorId(" 777 ")).toBe("777");
  });

  it("never prints the internal key an older letter still carries", () => {
    expect(letterTutorId("tutor-175")).toBeNull();
    expect(letterTutorId("")).toBeNull();
  });
});

describe("what the letter says", () => {
  it("names the job by its Job ID, not the internal request number", () => {
    const content = buildConfirmationLetterContent(letter);
    expect(content.tuitionRows).toContainEqual(["Job ID", "6818"]);
    expect(content.tuitionRows.map(([label]) => label)).not.toContain("Request reference");
  });

  it("lays out the Tutor and the tuition in the site's own words", () => {
    const content = buildConfirmationLetterContent(letter);
    expect(content.tutorRows).toEqual([["Name", "Ayesha Rahman"], ["Tutor ID", "777"]]);
    expect(content.tuitionRows).toEqual([
      ["Job ID", "6818"],
      ["Programme", "Bangla Medium · Class 9"],
      ["Subjects", "English, Mathematics"],
      ["Tuition type", "Home Tutoring"],
      ["Days per week", "3 days"],
      ["Start date", "1 September 2026"],
    ]);
    expect(content.fee).toBe("5,000 – 7,000 Taka");
    expect(content.issued).toBe("23 Aug 2026");
  });

  it("adds the package length only when the tuition has one", () => {
    const content = buildConfirmationLetterContent({ ...letter, packageDurationMonths: 3 });
    expect(content.tuitionRows.at(-1)).toEqual(["Package duration", "3 months"]);
  });

  it("drops the Tutor ID row rather than print an internal key", () => {
    expect(buildConfirmationLetterContent({ ...letter, tutorReference: "tutor-175" }).tutorRows).toEqual([["Name", "Ayesha Rahman"]]);
  });

  it("is written in English only", () => {
    const content = buildConfirmationLetterContent(letter);
    const fixedText = [...Object.values(letterCopy), ...content.tutorRows.map(([label]) => label), ...content.tuitionRows.map(([label]) => label)];
    for (const text of fixedText) expect(text, text).not.toMatch(BENGALI);
  });
});

describe("fees, dates and the contact number", () => {
  it("writes the fee in Taka, as one figure when both ends agree", () => {
    expect(formatLetterFee(5000, 7000)).toBe("5,000 – 7,000 Taka");
    expect(formatLetterFee(6000, 6000)).toBe("6,000 Taka");
    expect(formatLetterFee(null, 6000)).toBe("6,000 Taka");
    expect(formatLetterFee(null, null)).toBe("To be agreed");
  });

  it("reads the start date as a calendar day, with no time zone to shift it", () => {
    expect(formatLetterLongDate("2026-09-01")).toBe("1 September 2026");
    expect(formatLetterLongDate("2026-12-31")).toBe("31 December 2026");
  });

  it("spaces a Bangladeshi number the way the site header shows it", () => {
    expect(formatLetterPhone("8801516131411")).toBe("+880 1516 131411");
  });
});

describe("the PDF", () => {
  it("renders in memory using only the approved snapshot fields", async () => {
    const pdf = await renderConfirmationLetterPdf(letter, { contactNumber: "8801516131411" });
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(1_000);
    expect(pdf.toString("latin1")).not.toContain("Private landmark");
    expect(pdf.toString("latin1")).not.toContain("guardian@example.com");
    // Set in Manrope, the logo's face.
    expect(pdf.toString("latin1")).toMatch(/\/BaseFont \/[A-Z]{6}\+Manrope/);
  });

  it("marks an Admin's preview as a draft, faintly across the page, and only then", async () => {
    const draft = (await renderConfirmationLetterPdf(letter, { contactNumber: "8801516131411", draft: true })).toString("latin1");
    const issued = (await renderConfirmationLetterPdf(letter, { contactNumber: "8801516131411" })).toString("latin1");
    // The mark is the only see-through thing on the letter.
    expect(draft).toMatch(/\/ca 0\.09/);
    expect(issued).not.toMatch(/\/ca 0\.09/);
    expect(draft.match(/\/Type \/Page\b/g)).toHaveLength(1);
    expect(letterCopy.draftMark).toBe("DRAFT · NOT ISSUED");
  });

  it("carries the QR code and the printed code only when given one, still on one page", async () => {
    const verification = { url: "https://connecttutorsbd.com/verify/CTB-2026-000019-V1/ABCDEFGHJK", code: "ABCDEFGHJK" };
    const plain = await renderConfirmationLetterPdf(letter, { contactNumber: "8801516131411" });
    const withCode = await renderConfirmationLetterPdf(letter, { contactNumber: "8801516131411", verification });
    // Hundreds of QR squares make the page noticeably heavier.
    expect(withCode.length).toBeGreaterThan(plain.length + 400);
    expect(withCode.toString("latin1").match(/\/Type \/Page\b/g)).toHaveLength(1);
    expect(letterCopy.verifyAt).toBe("Check this letter at");
  });

  it("stays on one page, even with a long subject list and a package", async () => {
    const pdf = await renderConfirmationLetterPdf({
      ...letter,
      subjects: ["Bangla", "English", "Mathematics", "Higher Mathematics", "Physics", "Chemistry", "Biology", "ICT", "Accounting", "Economics"],
      packageDurationMonths: 6,
    }, { contactNumber: "8801516131411" });
    expect(pdf.toString("latin1").match(/\/Type \/Page\b/g)).toHaveLength(1);
  });
});

describe("a value typed in Bengali", () => {
  // pdfkit has no font fallback: a Bengali name set in Manrope alone would
  // print as empty boxes, so each script goes to the font that has it.
  it("splits a line into English and Bengali runs, each for its own font", () => {
    expect(splitScriptRuns("Tutor / টিউটর")).toEqual([
      { bengali: false, text: "Tutor / " },
      { bengali: true, text: "টিউটর" },
    ]);
  });

  it("keeps spaces with the run they follow", () => {
    expect(splitScriptRuns("আয়েশা Rahman")).toEqual([
      { bengali: true, text: "আয়েশা " },
      { bengali: false, text: "Rahman" },
    ]);
  });

  it("leaves a one-script value whole", () => {
    expect(splitScriptRuns("Ayesha Rahman")).toEqual([{ bengali: false, text: "Ayesha Rahman" }]);
  });

  it("renders a letter whose Tutor name and subjects are in Bengali", async () => {
    const pdf = await renderConfirmationLetterPdf({ ...letter, tutorName: "আয়েশা রহমান", subjects: ["বাংলা", "Mathematics"] }, { contactNumber: "8801516131411" });
    expect(pdf.toString("latin1")).toMatch(/\/BaseFont \/[A-Z]{6}\+NotoSansBengali/);
  });
});
