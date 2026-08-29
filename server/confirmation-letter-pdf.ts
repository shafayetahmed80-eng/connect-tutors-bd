import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import PDFDocument from "pdfkit";

const require = createRequire(import.meta.url);
const bengaliFontPath = require.resolve("@fontsource/noto-sans-bengali/files/noto-sans-bengali-bengali-400-normal.woff");

export type ConfirmationLetterDocument = {
  letterNumber: string;
  version: number;
  issuedAt: Date;
  requestId: number;
  tutorReference: string;
  tutorName: string;
  category: string;
  curriculumType: string | null;
  classCourse: string;
  subjects: string[];
  tuitionType: string;
  daysPerWeek: number;
  agreedStartDate: string;
  agreedFeeMinimum: number | null;
  agreedFeeMaximum: number | null;
  packageDurationMonths: number | null;
};

function formattedFee(minimum: number | null, maximum: number | null) {
  if (minimum !== null && maximum !== null) return `BDT ${minimum.toLocaleString()} – ${maximum.toLocaleString()}`;
  if (minimum !== null) return `BDT ${minimum.toLocaleString()}`;
  return "To be agreed";
}

function formattedTuitionType(value: string) {
  return value.replace(/\b\w/g, letter => letter.toUpperCase()).replace("Both", "Home / Online");
}

/** Builds an in-memory bilingual PDF; never accepts address, contact, student, or internal-note fields. */
export async function renderConfirmationLetterPdf(letter: ConfirmationLetterDocument): Promise<Buffer> {
  const font = readFileSync(bengaliFontPath);
  const document = new PDFDocument({ size: "A4", margin: 56, info: { Title: `Confirmation Letter ${letter.letterNumber}`, Author: "Connect Tutors BD" } });
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    document.on("data", chunk => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    document.registerFont("NotoBengali", font);
    document.font("NotoBengali").fillColor("#173A5E").fontSize(19).text("Connect Tutors BD", { align: "center" });
    document.moveDown(0.25);
    document.fontSize(15).text("Confirmation Letter / কনফার্মেশন লেটার", { align: "center" });
    document.moveDown(1);
    document.fontSize(9).fillColor("#425466").text(`Letter ID: ${letter.letterNumber}  •  Version: ${letter.version}  •  Issued: ${letter.issuedAt.toLocaleDateString("en-GB")}`, { align: "center" });
    document.moveDown(1.25);
    document.fillColor("#172B4D").fontSize(11).text("This letter confirms the approved tutor match listed below.");
    document.moveDown(0.3);
    document.text("এই চিঠির মাধ্যমে নিচে উল্লিখিত অনুমোদিত টিউটর ম্যাচ নিশ্চিত করা হলো।");
    document.moveDown(1);

    const details = [
      ["Request reference / রিকোয়েস্ট", `#${letter.requestId}`],
      ["Tutor / টিউটর", `${letter.tutorName} (${letter.tutorReference})`],
      ["Learning programme / শিক্ষার ধরন", [letter.category, letter.curriculumType, letter.classCourse].filter(Boolean).join(" • ")],
      ["Subjects / বিষয়", letter.subjects.join(", ") || "As approved"],
      ["Tuition type / টিউশনের ধরন", formattedTuitionType(letter.tuitionType)],
      ["Days per week / সাপ্তাহিক দিন", `${letter.daysPerWeek} day(s)`],
      ["Agreed start date / শুরুর তারিখ", letter.agreedStartDate],
      ["Agreed fee / সম্মত ফি", formattedFee(letter.agreedFeeMinimum, letter.agreedFeeMaximum)],
      ...(letter.packageDurationMonths ? [["Package duration / প্যাকেজ সময়কাল", `${letter.packageDurationMonths} month(s)`]] : []),
    ];

    for (const [label, value] of details) {
      document.fontSize(10).fillColor("#173A5E").text(label, { continued: true });
      document.fillColor("#172B4D").text(`  ${value}`);
      document.moveDown(0.35);
    }

    document.moveDown(1.15);
    document.fillColor("#425466").fontSize(9).text(
      "This private confirmation record is available only to the authorised Guardian, assigned Tutor, and Connect Tutors BD administrators. It does not include home address, contact information, student identity, or internal operational notes.",
      { align: "left" },
    );
    document.moveDown(0.3);
    document.text(
      "এই ব্যক্তিগত কনফার্মেশন রেকর্ডটি কেবল অনুমোদিত Guardian, নির্ধারিত Tutor এবং Connect Tutors BD প্রশাসকদের জন্য। এতে বাসার ঠিকানা, যোগাযোগের তথ্য, শিক্ষার্থীর পরিচয় বা অভ্যন্তরীণ নোট অন্তর্ভুক্ত নেই।",
      { align: "left" },
    );
    document.moveDown(1.1);
    document.fillColor("#173A5E").fontSize(10).text("Issued by Connect Tutors BD", { align: "right" });
    document.end();
  });
}
