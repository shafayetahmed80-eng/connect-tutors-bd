import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import PDFDocument from "pdfkit";

const require = createRequire(import.meta.url);
const bengaliFontPath = require.resolve("@fontsource/noto-sans-bengali/files/noto-sans-bengali-bengali-400-normal.woff");
const latinFontPath = require.resolve("@fontsource/noto-sans-bengali/files/noto-sans-bengali-latin-400-normal.woff");
const wordmarkFontPath = require.resolve("@fontsource/manrope/files/manrope-latin-800-normal.woff");

const BENGALI_CHARACTER = /[॒॑।॥ঀ-৿‌‍◌]/;

/**
 * Splits text into runs of Bengali and of everything else. Each Noto Sans
 * Bengali file carries one script's glyphs, and pdfkit has no font fallback,
 * so one font alone prints the other script as empty boxes. Spaces stay with
 * the run they follow.
 */
export function splitScriptRuns(text: string) {
  const runs: Array<{ bengali: boolean; text: string }> = [];
  for (const character of text) {
    const last = runs[runs.length - 1];
    const bengali = /\s/.test(character) ? (last?.bengali ?? false) : BENGALI_CHARACTER.test(character);
    if (last && last.bengali === bengali) last.text += character;
    else runs.push({ bengali, text: character });
  }
  return runs;
}

/**
 * `document.text`, with each script in the font that has its glyphs.
 * pdfkit centres each continued piece on its own, which stacks the pieces on
 * top of one another, so a centred or right-aligned line mixing both scripts
 * is measured and placed by hand. Only one-line headings are written that way.
 */
function writeText(document: PDFKit.PDFDocument, text: string, options: PDFKit.Mixins.TextOptions = {}) {
  const runs = splitScriptRuns(text);
  const fontOf = (run: { bengali: boolean }) => (run.bengali ? "LetterBengali" : "LetterLatin");
  const { align, ...rest } = options;
  const placeByHand = runs.length > 1 && (align === "center" || align === "right");
  const left = document.page.margins.left;
  if (placeByHand) {
    const width = runs.reduce((sum, run) => sum + document.font(fontOf(run)).widthOfString(run.text), 0);
    const room = document.page.width - left - document.page.margins.right;
    document.x = left + Math.max(0, align === "center" ? (room - width) / 2 : room - width);
  }
  runs.forEach((run, index) => {
    const continued = index < runs.length - 1 || options.continued === true;
    document.font(fontOf(run)).text(run.text, { ...rest, ...(placeByHand ? {} : { align }), continued });
  });
  if (placeByHand) document.x = left;
  return document;
}

/** The site header's logo colours: blue cradle, saffron lifted ball, navy + blue wordmark. */
const logoColours = { mark: "#0B5FA8", lift: "#D99624", connect: "#102849", tutors: "#0B5FA8" };
const MANROPE_CAP_HEIGHT = 0.72;

/**
 * The site's logo, centred at the head of the letter: the Newton's cradle
 * drawn the way `BrandMark` draws it (48-unit grid, rows 8-40 kept, bar
 * painted last) beside "Connect Tutors" in Manrope 800, every measure taken
 * from the wordmark's size as in the site header. Returns the lockup's bottom.
 */
function drawLetterheadLogo(document: PDFKit.PDFDocument, top: number) {
  const size = 20;
  const characterSpacing = -0.03 * size;
  document.font("Wordmark").fontSize(size);
  const connectWidth = document.widthOfString("Connect", { characterSpacing });
  const tutorsWidth = document.widthOfString("Tutors", { characterSpacing });
  const markWidth = 1.75 * size;
  const markHeight = (markWidth * 32) / 48;
  const markGap = 0.42 * size;
  const wordGap = 0.24 * size;
  const width = markWidth + markGap + connectWidth + wordGap + tutorsWidth;
  const left = (document.page.width - width) / 2;

  // The mark's middle sits on the middle of the capitals, as it does on the site.
  const capHeight = MANROPE_CAP_HEIGHT * size;
  const baseline = top + Math.max(capHeight, (capHeight + markHeight) / 2);
  const markTop = baseline - capHeight / 2 - markHeight / 2;
  const unit = markWidth / 48;

  document.save().translate(left, markTop - 8 * unit).scale(unit);
  document.lineWidth(1.3).strokeColor(logoColours.mark).fillColor(logoColours.mark);
  for (const x of [5.6, 12.8, 20, 27.2]) document.moveTo(x, 11).lineTo(x, 35).stroke();
  for (const x of [5.6, 12.8, 20, 27.2]) document.circle(x, 35, 3.6).fill();
  document.save().rotate(-22, { origin: [34.4, 11] });
  document.strokeColor(logoColours.lift).fillColor(logoColours.lift);
  document.moveTo(34.4, 11).lineTo(34.4, 35).stroke();
  document.circle(34.4, 35, 3.6).fill();
  document.restore();
  document.lineWidth(3).lineCap("round").strokeColor(logoColours.mark).moveTo(3, 11).lineTo(37, 11).stroke();
  document.restore();

  const textLeft = left + markWidth + markGap;
  const textOptions = { characterSpacing, lineBreak: false, baseline: "alphabetic" } as const;
  document.fillColor(logoColours.connect).text("Connect", textLeft, baseline, textOptions);
  document.fillColor(logoColours.tutors).text("Tutors", textLeft + connectWidth + wordGap, baseline, textOptions);
  return Math.max(markTop + markHeight, baseline);
}

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

/**
 * The Tutor line: the name, with the Tutor ID when the letter carries one.
 * Letters drafted before the reference became the Tutor ID hold the internal
 * key instead; that is never printed, so they show the name alone.
 */
export function formatLetterTutor(tutorName: string, tutorReference: string) {
  return /^\d+$/.test(tutorReference.trim()) ? `${tutorName} (Tutor ID ${tutorReference.trim()})` : tutorName;
}

/** Builds an in-memory bilingual PDF; never accepts address, contact, student, or internal-note fields. */
export async function renderConfirmationLetterPdf(letter: ConfirmationLetterDocument): Promise<Buffer> {
  const document = new PDFDocument({ size: "A4", margin: 56, info: { Title: `Confirmation Letter ${letter.letterNumber}`, Author: "Connect Tutors" } });
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    document.on("data", chunk => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    document.registerFont("LetterBengali", readFileSync(bengaliFontPath));
    document.registerFont("LetterLatin", readFileSync(latinFontPath));
    document.registerFont("Wordmark", readFileSync(wordmarkFontPath));
    const logoBottom = drawLetterheadLogo(document, document.page.margins.top);
    document.x = document.page.margins.left;
    document.y = logoBottom + 14;
    writeText(document.fillColor("#173A5E").fontSize(15), "Confirmation Letter / কনফার্মেশন লেটার", { align: "center" });
    document.moveDown(1);
    writeText(document.fontSize(9).fillColor("#425466"), `Letter ID: ${letter.letterNumber}  •  Version: ${letter.version}  •  Issued: ${letter.issuedAt.toLocaleDateString("en-GB")}`, { align: "center" });
    document.moveDown(1.25);
    writeText(document.fillColor("#172B4D").fontSize(11), "This letter confirms the approved tutor match listed below.");
    document.moveDown(0.3);
    writeText(document, "এই চিঠির মাধ্যমে নিচে উল্লিখিত অনুমোদিত টিউটর ম্যাচ নিশ্চিত করা হলো।");
    document.moveDown(1);

    const details = [
      ["Request reference / রিকোয়েস্ট", `#${letter.requestId}`],
      ["Tutor / টিউটর", formatLetterTutor(letter.tutorName, letter.tutorReference)],
      ["Learning programme / শিক্ষার ধরন", [letter.category, letter.curriculumType, letter.classCourse].filter(Boolean).join(" • ")],
      ["Subjects / বিষয়", letter.subjects.join(", ") || "As approved"],
      ["Tuition type / টিউশনের ধরন", formattedTuitionType(letter.tuitionType)],
      ["Days per week / সাপ্তাহিক দিন", `${letter.daysPerWeek} day(s)`],
      ["Agreed start date / শুরুর তারিখ", letter.agreedStartDate],
      ["Agreed fee / সম্মত ফি", formattedFee(letter.agreedFeeMinimum, letter.agreedFeeMaximum)],
      ...(letter.packageDurationMonths ? [["Package duration / প্যাকেজ সময়কাল", `${letter.packageDurationMonths} month(s)`]] : []),
    ];

    for (const [label, value] of details) {
      writeText(document.fontSize(10).fillColor("#173A5E"), label, { continued: true });
      writeText(document.fillColor("#172B4D"), `  ${value}`);
      document.moveDown(0.35);
    }

    document.moveDown(1.15);
    writeText(
      document.fillColor("#425466").fontSize(9),
      "This private confirmation record is available only to the authorised Guardian, assigned Tutor, and Connect Tutors administrators. It does not include home address, contact information, student identity, or internal operational notes.",
      { align: "left" },
    );
    document.moveDown(0.3);
    writeText(
      document,
      "এই ব্যক্তিগত কনফার্মেশন রেকর্ডটি কেবল অনুমোদিত Guardian, নির্ধারিত Tutor এবং Connect Tutors প্রশাসকদের জন্য। এতে বাসার ঠিকানা, যোগাযোগের তথ্য, শিক্ষার্থীর পরিচয় বা অভ্যন্তরীণ নোট অন্তর্ভুক্ত নেই।",
      { align: "left" },
    );
    document.moveDown(1.1);
    writeText(document.fillColor("#173A5E").fontSize(10), "Issued by Connect Tutors", { align: "right" });
    document.end();
  });
}
