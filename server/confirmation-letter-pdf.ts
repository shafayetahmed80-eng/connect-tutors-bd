import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { formatLetterVerificationCode } from "@shared/confirmation-letter";
import { formatPostedDate, formatTuitionType } from "@shared/job-card";
import { jobIdForRequest } from "@shared/job-id";
import { formatSalaryAmount } from "@shared/salary-amount";

const require = createRequire(import.meta.url);

/**
 * The letter is set in Manrope, the logo's face, at three weights. Noto Sans
 * Bengali's Bengali subset stays registered for a value someone typed in
 * Bengali - a Tutor's name, a subject - because pdfkit has no font fallback:
 * without it those letters print as empty boxes.
 */
const fontFiles = {
  Regular: require.resolve("@fontsource/manrope/files/manrope-latin-500-normal.woff"),
  Bold: require.resolve("@fontsource/manrope/files/manrope-latin-700-normal.woff"),
  Heavy: require.resolve("@fontsource/manrope/files/manrope-latin-800-normal.woff"),
  Bengali: require.resolve("@fontsource/noto-sans-bengali/files/noto-sans-bengali-bengali-400-normal.woff"),
  BengaliBold: require.resolve("@fontsource/noto-sans-bengali/files/noto-sans-bengali-bengali-700-normal.woff"),
} as const;
type LatinFont = "Regular" | "Bold" | "Heavy";

const MANROPE_CAP_HEIGHT = 0.72;
const SITE_ADDRESS = "connecttutorsbd.com";

/** The site's own palette: navy ink, brand blue, saffron, and the soft blues of its cards. */
const colour = {
  ink: "#102849",
  body: "#1D3654",
  muted: "#4D6A82",
  faint: "#6A8499",
  blue: "#0B5FA8",
  saffron: "#D99624",
  line: "#D5E3EE",
  hairline: "#E6EEF5",
  wash: "#F4F9FC",
  feeWash: "#FFF4DB",
  feeInk: "#7A5412",
};

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

export type LetterRow = readonly [label: string, value: string];

/**
 * The Tutor ID to print, or none. Letters drafted before the reference became
 * the Tutor ID hold the internal key instead, and that is never printed.
 */
export function letterTutorId(tutorReference: string) {
  const reference = tutorReference.trim();
  return /^\d+$/.test(reference) ? reference : null;
}

/** "5,000 – 7,000 Taka", "5,000 Taka" when both ends agree, "To be agreed" when neither is set. */
export function formatLetterFee(minimum: number | null, maximum: number | null) {
  if (minimum !== null && maximum !== null && minimum !== maximum) {
    return `${minimum.toLocaleString("en-US")} – ${formatSalaryAmount(maximum)}`;
  }
  const single = minimum ?? maximum;
  return single === null ? "To be agreed" : formatSalaryAmount(single);
}

/** "2026-09-01" becomes "1 September 2026", read as a calendar date so no time zone can move it. */
export function formatLetterLongDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

/** "+880 1516 131411" from the site's stored digits. */
export function formatLetterPhone(digits: string) {
  const number = digits.replace(/\D/g, "");
  return /^880\d{10}$/.test(number) ? `+880 ${number.slice(3, 7)} ${number.slice(7)}` : `+${number}`;
}

/**
 * Everything the letter says, worked out before anything is drawn, in the
 * site's own words: Job ID rather than the internal request number, fees in
 * Taka, dates the way the Job Board writes them.
 */
export function buildConfirmationLetterContent(letter: ConfirmationLetterDocument) {
  const tutorId = letterTutorId(letter.tutorReference);
  const tutorRows: LetterRow[] = [["Name", letter.tutorName], ...(tutorId ? [["Tutor ID", tutorId] as const] : [])];
  const tuitionRows: LetterRow[] = [
    ["Job ID", jobIdForRequest(letter.requestId)],
    ["Programme", [letter.category, letter.curriculumType, letter.classCourse].filter(Boolean).join(" · ")],
    ["Subjects", letter.subjects.join(", ") || "As agreed"],
    ["Tuition type", formatTuitionType(letter.tuitionType)],
    ["Days per week", `${letter.daysPerWeek} ${letter.daysPerWeek === 1 ? "day" : "days"}`],
    ["Start date", formatLetterLongDate(letter.agreedStartDate)],
    ...(letter.packageDurationMonths
      ? [["Package duration", `${letter.packageDurationMonths} ${letter.packageDurationMonths === 1 ? "month" : "months"}`] as const]
      : []),
  ];
  return {
    letterId: letter.letterNumber,
    issued: formatPostedDate(letter.issuedAt),
    version: String(letter.version),
    tutorRows,
    tuitionRows,
    fee: formatLetterFee(letter.agreedFeeMinimum, letter.agreedFeeMaximum),
  };
}

export const letterCopy = {
  kicker: "TUITION CONFIRMATION",
  title: "Confirmation Letter",
  greeting: "Dear Guardian and Tutor,",
  intro: "Connect Tutors confirms the tuition arrangement below. The Guardian and the Tutor have agreed to it, and our team has approved the match.",
  feeLabel: "Agreed monthly fee",
  terms: "If the schedule, fee or Tutor changes, Connect Tutors will issue a new version of this letter. The newest version replaces all earlier ones. This letter is shared only with the Guardian, the assigned Tutor and Connect Tutors administrators. It leaves out home addresses, phone numbers, student details and internal notes.",
  issuedBy: "Issued by",
  issuer: "Connect Tutors Admin Team",
  electronic: "Issued electronically. No signature is needed.",
  draftMark: "DRAFT · NOT ISSUED",
  verifyAt: "Check this letter at",
  verifyWith: "with code",
} as const;

const BENGALI_CHARACTER = /[॒॑।॥ঀ-৿‌‍◌]/;

/**
 * Splits text into runs of Bengali and of everything else, so each prints in
 * a font that has its glyphs. Spaces stay with the run they follow.
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

/** Left-aligned text at a point, each script in its own font. */
function writeValue(document: PDFKit.PDFDocument, text: string, font: LatinFont, x: number, y: number, width: number) {
  const runs = splitScriptRuns(text);
  runs.forEach((run, index) => {
    const options = { width, lineGap: 2, continued: index < runs.length - 1 };
    document.font(run.bengali ? (font === "Regular" ? "Bengali" : "BengaliBold") : font);
    if (index === 0) document.text(run.text, x, y, options);
    else document.text(run.text, options);
  });
}

/**
 * The Newton's cradle, drawn the way `BrandMark` draws it: a 48-unit grid,
 * four balls at rest, the saffron one lifted -22 degrees about its pivot, and
 * the bar painted last so every string hangs from under it.
 */
function drawCradle(document: PDFKit.PDFDocument, originX: number, originY: number, unit: number, stringWidth = 1.3) {
  document.save().translate(originX, originY).scale(unit);
  document.lineWidth(stringWidth).strokeColor(colour.blue).fillColor(colour.blue);
  for (const x of [5.6, 12.8, 20, 27.2]) document.moveTo(x, 11).lineTo(x, 35).stroke();
  for (const x of [5.6, 12.8, 20, 27.2]) document.circle(x, 35, 3.6).fill();
  document.save().rotate(-22, { origin: [34.4, 11] });
  document.strokeColor(colour.saffron).fillColor(colour.saffron);
  document.moveTo(34.4, 11).lineTo(34.4, 35).stroke();
  document.circle(34.4, 35, 3.6).fill();
  document.restore();
  document.lineWidth(3).lineCap("round").strokeColor(colour.blue).moveTo(3, 11).lineTo(37, 11).stroke();
  document.restore();
}

/**
 * The site's logo: cradle beside "Connect Tutors" in Manrope 800, every
 * measure taken from the wordmark's size as in the site header, the mark's
 * middle on the middle of the capitals. Returns the lockup's height.
 */
function drawLogo(document: PDFKit.PDFDocument, left: number, top: number) {
  const size = 19;
  const characterSpacing = -0.03 * size;
  document.font("Heavy").fontSize(size);
  const connectWidth = document.widthOfString("Connect", { characterSpacing });
  const markWidth = 1.75 * size;
  const markHeight = (markWidth * 32) / 48;
  const capHeight = MANROPE_CAP_HEIGHT * size;
  const baseline = top + (capHeight + markHeight) / 2;
  const unit = markWidth / 48;
  drawCradle(document, left, top - 8 * unit, unit);

  const textLeft = left + markWidth + 0.42 * size;
  const textOptions = { characterSpacing, lineBreak: false, baseline: "alphabetic" } as const;
  document.fillColor(colour.ink).text("Connect", textLeft, baseline, textOptions);
  document.fillColor(colour.blue).text("Tutors", textLeft + connectWidth + 0.24 * size, baseline, textOptions);
  return markHeight;
}

const LABEL_SHARE = 0.34;

/** How tall each row's value runs once it wraps in its column. */
function measureRows(document: PDFKit.PDFDocument, rows: readonly LetterRow[], width: number) {
  document.font("Bold").fontSize(10);
  return rows.map(([, value]) => Math.max(12, document.heightOfString(value, { width: width * (1 - LABEL_SHARE), lineGap: 2 })));
}

/** Label/value rows between hairlines; a long value wraps inside its own column. */
function drawRows(document: PDFKit.PDFDocument, rows: readonly LetterRow[], left: number, width: number, top: number, padding: number) {
  const labelWidth = width * LABEL_SHARE;
  const valueWidth = width - labelWidth;
  const heights = measureRows(document, rows, width);
  const hairline = (y: number) => document.save().lineWidth(0.75).strokeColor(colour.hairline).moveTo(left, y).lineTo(left + width, y).stroke().restore();
  let y = top;
  hairline(y);
  rows.forEach(([label, value], index) => {
    document.font("Regular").fontSize(10).fillColor(colour.muted).text(label, left, y + padding, { width: labelWidth, lineBreak: false });
    document.fontSize(10).fillColor(colour.ink);
    writeValue(document, value, "Bold", left + labelWidth, y + padding, valueWidth);
    y += heights[index] + padding * 2;
    hairline(y);
  });
  return y;
}

/**
 * A QR code drawn as vector squares, so it prints sharp at any size. The
 * white page around it is its quiet zone; medium error correction still reads
 * through a crease or a smudge.
 */
function drawQrCode(document: PDFKit.PDFDocument, text: string, x: number, y: number, size: number) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const cell = size / modules.size;
  document.save().fillColor(colour.ink);
  for (let row = 0; row < modules.size; row += 1) {
    for (let column = 0; column < modules.size; column += 1) {
      // A hair of overlap so neighbouring squares print as one solid block.
      if (modules.get(row, column)) document.rect(x + column * cell, y + row * cell, cell + 0.05, cell + 0.05);
    }
  }
  document.fill().restore();
}

function sectionLabel(document: PDFKit.PDFDocument, text: string, left: number, top: number) {
  document.font("Heavy").fontSize(7.5).fillColor(colour.blue).text(text.toUpperCase(), left, top, { characterSpacing: 1.1, lineBreak: false });
  return top + 15;
}

/**
 * Builds an in-memory PDF; never accepts address, contact, student, or
 * internal-note fields.
 *
 * `verification` puts the letter's QR code and printed code beside the seal,
 * so anyone holding it can check it on the site. `draft` marks an Admin's
 * preview of a letter not yet issued: the same page, with "DRAFT · NOT
 * ISSUED" across it so a preview can never pass for the real letter.
 */
export async function renderConfirmationLetterPdf(
  letter: ConfirmationLetterDocument,
  options: { contactNumber: string; draft?: boolean; verification?: { url: string; code: string } },
): Promise<Buffer> {
  const content = buildConfirmationLetterContent(letter);
  const document = new PDFDocument({
    size: "A4",
    margins: { top: 48, bottom: 20, left: 56, right: 56 },
    info: { Title: `Confirmation Letter ${letter.letterNumber}`, Author: "Connect Tutors" },
  });
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    document.on("data", chunk => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    for (const [name, file] of Object.entries(fontFiles)) document.registerFont(name, readFileSync(file));
    const left = document.page.margins.left;
    const width = document.page.width - left - document.page.margins.right;
    const right = left + width;
    const pageHeight = document.page.height;

    // Letterhead: logo on the left, how to reach us on the right, then a rule
    // that opens in saffron the way the site's section labels do.
    let y = 48;
    const logoHeight = drawLogo(document, left, y);
    document.font("Regular").fontSize(8.5).fillColor(colour.muted);
    const contactTop = y + (logoHeight - 22) / 2;
    document.text(SITE_ADDRESS, left, contactTop, { width, align: "right", lineBreak: false });
    document.text(formatLetterPhone(options.contactNumber), left, contactTop + 11, { width, align: "right", lineBreak: false });
    y += logoHeight + 14;
    document.save().lineCap("round").lineWidth(2);
    document.strokeColor(colour.line).moveTo(left, y).lineTo(right, y).stroke();
    document.strokeColor(colour.saffron).moveTo(left, y).lineTo(left + width * 0.14, y).stroke();
    document.restore();

    y += 24;
    document.font("Heavy").fontSize(7.5).fillColor(colour.blue).text(letterCopy.kicker, left, y, { characterSpacing: 1.3, lineBreak: false });
    y += 13;
    document.font("Heavy").fontSize(24).fillColor(colour.ink).text(letterCopy.title, left, y, { characterSpacing: -0.7, lineBreak: false });
    y += 44;

    // Letter ID, date and version in one box, so the letter can be named over the phone.
    const metaHeight = 42;
    const cells: Array<[string, string, number]> = [["Letter ID", content.letterId, 1.5], ["Issued", content.issued, 1], ["Version", content.version, 0.7]];
    const totalWeight = cells.reduce((sum, [, , weight]) => sum + weight, 0);
    document.save().lineWidth(0.75).roundedRect(left, y, width, metaHeight, 6).fillAndStroke(colour.wash, colour.line).restore();
    let cellLeft = left;
    cells.forEach(([label, value, weight], index) => {
      const cellWidth = (width * weight) / totalWeight;
      if (index > 0) document.save().lineWidth(0.75).strokeColor(colour.line).moveTo(cellLeft, y).lineTo(cellLeft, y + metaHeight).stroke().restore();
      document.font("Heavy").fontSize(6.5).fillColor(colour.muted).text(label.toUpperCase(), cellLeft + 11, y + 9, { characterSpacing: 0.7, lineBreak: false });
      document.font("Bold").fontSize(10).fillColor(colour.ink).text(value, cellLeft + 11, y + 21, { lineBreak: false });
      cellLeft += cellWidth;
    });
    y += metaHeight + 22;

    document.font("Regular").fontSize(10.5).fillColor(colour.body).text(letterCopy.greeting, left, y, { width });
    y += 20;
    document.text(letterCopy.intro, left, y, { width, lineGap: 3 });
    y += document.heightOfString(letterCopy.intro, { width, lineGap: 3 }) + 20;

    // Everything must fit one page above the sign-off. Only the rows vary in
    // height (a long subject list wraps), so a long letter spends less air
    // between its rows instead of pushing the seal into the footer.
    const footerTop = pageHeight - 46;
    const sealRadius = 30;
    const qrSize = 62;
    const signHeight = Math.max(sealRadius * 2, qrSize);
    const feeHeight = 42;
    document.font("Regular").fontSize(8.5);
    const termsHeight = document.heightOfString(letterCopy.terms, { width, lineGap: 2.5 });
    const rowHeights = [...measureRows(document, content.tutorRows, width), ...measureRows(document, content.tuitionRows, width)];
    const fixedBelow = 15 + 18 + 15 + 18 + feeHeight + 16 + termsHeight + 20;
    const roomForRows = footerTop - 14 - signHeight - y - fixedBelow;
    const rowHeightTotal = rowHeights.reduce((sum, height) => sum + height, 0);
    const rowPadding = Math.max(3, Math.min(6, (roomForRows - rowHeightTotal) / (rowHeights.length * 2)));

    y = sectionLabel(document, "Tutor", left, y);
    y = drawRows(document, content.tutorRows, left, width, y, rowPadding) + 18;
    y = sectionLabel(document, "Tuition", left, y);
    y = drawRows(document, content.tuitionRows, left, width, y, rowPadding) + 18;

    // The fee is the figure people check first, so it gets the one tinted box.
    document.save().roundedRect(left, y, width, feeHeight, 6).fill(colour.feeWash).restore();
    document.font("Bold").fontSize(10).fillColor(colour.feeInk).text(letterCopy.feeLabel, left + 14, y + 15, { lineBreak: false });
    document.font("Heavy").fontSize(14).fillColor(colour.ink).text(content.fee, left, y + 12, { width: width - 14, align: "right", lineBreak: false });
    y += feeHeight + 16;

    document.font("Regular").fontSize(8.5).fillColor(colour.muted).text(letterCopy.terms, left, y, { width, lineGap: 2.5 });
    y += termsHeight;

    // Sign-off sits just above the footer, or right under the terms on a long letter.
    const signTop = Math.max(y + 20, footerTop - 14 - signHeight);
    const lineTop = options.verification ? signTop + 2 : signTop + 10;
    document.font("Regular").fontSize(8.5).fillColor(colour.muted).text(letterCopy.issuedBy, left, lineTop, { lineBreak: false });
    document.font("Heavy").fontSize(11.5).fillColor(colour.ink).text(letterCopy.issuer, left, lineTop + 13, { lineBreak: false });
    document.font("Regular").fontSize(8.5).fillColor(colour.muted).text(letterCopy.electronic, left, lineTop + 31, { lineBreak: false });

    // A seal in place of a signature: the cradle inside a double ring.
    const sealX = right - sealRadius;
    const sealY = signTop + signHeight / 2;

    if (options.verification) {
      // The code to check the letter with, in words for anyone without a
      // camera, and as a QR code beside the seal for everyone else.
      const checkAt = `${new URL(options.verification.url).host}/verify`;
      document.font("Regular").fontSize(8).fillColor(colour.muted).text(`${letterCopy.verifyAt} ${checkAt} ${letterCopy.verifyWith} `, left, lineTop + 47, { continued: true, lineBreak: false });
      document.font("Bold").fillColor(colour.ink).text(formatLetterVerificationCode(options.verification.code), { lineBreak: false });
      drawQrCode(document, options.verification.url, right - sealRadius * 2 - 14 - qrSize, signTop + (signHeight - qrSize) / 2, qrSize);
    }
    document.save().lineWidth(1.6).strokeColor(colour.blue).circle(sealX, sealY, sealRadius).stroke().restore();
    document.save().lineWidth(0.6).dash(2, { space: 2 }).strokeColor(colour.blue).circle(sealX, sealY, sealRadius - 4).stroke().undash().restore();
    const sealUnit = 36 / 48;
    drawCradle(document, sealX - 24.25 * sealUnit, sealY - 24.05 * sealUnit, sealUnit, 1.6);

    document.save().lineWidth(0.75).strokeColor(colour.line).moveTo(left, footerTop).lineTo(right, footerTop).stroke().restore();
    document.font("Bold").fontSize(7.5).fillColor(colour.faint);
    document.text(`Connect Tutors · ${SITE_ADDRESS}`, left, footerTop + 9, { lineBreak: false });
    document.text(`${content.letterId} · Page 1 of 1`, left, footerTop + 9, { width, align: "right", lineBreak: false });

    if (options.draft) {
      // Across the middle, faint enough to read through, impossible to miss.
      const bandWidth = 900;
      document.save().rotate(-32, { origin: [document.page.width / 2, pageHeight / 2] });
      document.font("Heavy").fontSize(54).fillColor(colour.blue).fillOpacity(0.09);
      document.text(letterCopy.draftMark, (document.page.width - bandWidth) / 2, pageHeight / 2 - 30, { width: bandWidth, align: "center", characterSpacing: 3, lineBreak: false });
      document.restore();
    }
    document.end();
  });
}
