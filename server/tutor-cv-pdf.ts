import { readFileSync } from "node:fs";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import {
  SITE_ADDRESS,
  colour,
  drawCradle,
  fontFiles,
  formatLetterPhone,
  splitScriptRuns,
  type LatinFont,
} from "./confirmation-letter-pdf";

export type TutorCvEducationRecord = {
  qualificationLevel?: string | null;
  degreeExamTitle?: string | null;
  instituteName?: string | null;
  majorGroup?: string | null;
  resultGpa?: string | null;
  passingYear?: number | null;
  studyStartYear?: number | null;
  studyEndYear?: number | null;
  currentlyStudying?: number | boolean | null;
};

export type TutorCvDocument = {
  tutorId: string;
  tutorNumber: number | string | null;
  name: string;
  headline?: string | null;
  gender?: string | null;
  phone?: string | null;
  contactEmail?: string | null;
  locationLabel?: string | null;
  photoBuffer?: Buffer | null;
  verified?: boolean;
  ratingAverage?: number | null;
  reviewCount?: number | null;
  highestEducation?: string | null;
  institution?: string | null;
  education?: string | null;
  educationRecords?: TutorCvEducationRecord[];
  subjects?: string[];
  levels?: string[];
  tuitionTypes?: string[];
  teachingExperienceYears?: number | null;
  priorTeachingExperience?: string | null;
  specialExpertise?: string | null;
  academicAchievement?: string | null;
  aboutMe?: string | null;
  preferredLocations?: string[];
  publicProfileUrl?: string | null;
};

export function tutorCvFileName(tutorNumber: number | string | null, name: string) {
  const safeNum = tutorNumber ? String(tutorNumber).trim() : "CTB";
  const safeName = name.replace(/[^A-Za-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 30);
  return `Connect-Tutors-CV-${safeNum}-${safeName}.pdf`;
}

/** Draws a QR code as sharp vector squares. */
export function drawQrCode(document: PDFKit.PDFDocument, text: string, x: number, y: number, size: number, qrColor = "#0f2137") {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const cell = size / modules.size;
  document.save().fillColor(qrColor);
  for (let row = 0; row < modules.size; row += 1) {
    for (let column = 0; column < modules.size; column += 1) {
      if (modules.get(row, column)) {
        document.rect(x + column * cell, y + row * cell, cell + 0.05, cell + 0.05);
      }
    }
  }
  document.fill().restore();
}

/** Renders multi-script text with fallback to Noto Sans Bengali when Bengali characters are present. */
export function writeCvText(
  document: PDFKit.PDFDocument,
  text: string,
  font: LatinFont,
  x: number,
  y: number,
  width: number,
  options?: { size?: number; color?: string; align?: "left" | "center" | "right"; lineGap?: number },
) {
  const runs = splitScriptRuns(text);
  const size = options?.size ?? 9;
  const lineGap = options?.lineGap ?? 1.5;
  const color = options?.color ?? "#0f2137";
  const align = options?.align ?? "left";

  document.fontSize(size).fillColor(color);
  runs.forEach((run, index) => {
    const isBengali = run.bengali;
    const fontName = isBengali ? (font === "Regular" ? "Bengali" : "BengaliBold") : font;
    document.font(fontName);
    const textOpts: PDFKit.Mixins.TextOptions = {
      width,
      lineGap,
      align,
      continued: index < runs.length - 1,
    };
    if (index === 0) {
      document.text(run.text, x, y, textOpts);
    } else {
      document.text(run.text, textOpts);
    }
  });
}

/**
 * Builds a sleek, modern, professional 1-page A4 Tutor CV and Biodata PDF.
 * Uses exact A4 dimensions: 595.28 x 841.89 points.
 */
export async function renderTutorCvPdf(cv: TutorCvDocument): Promise<Buffer> {
  const document = new PDFDocument({
    size: "A4",
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: `Tutor CV - ${cv.name}`,
      Author: "Connect Tutors BD",
      Subject: "Professional Tutor CV & Biodata",
    },
  });

  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    document.on("data", chunk => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    // Register vector fonts
    for (const [name, file] of Object.entries(fontFiles)) {
      document.registerFont(name, readFileSync(file));
    }

    const pageWidth = document.page.width;
    const pageHeight = document.page.height;
    const leftColWidth = 195;
    const rightColWidth = pageWidth - leftColWidth;
    const rightColLeft = leftColWidth;

    // 1. Draw Left Sidebar (Deep Navy / Slate Background)
    document.save();
    document.rect(0, 0, leftColWidth, pageHeight).fill("#13293d");
    document.restore();

    // 2. Draw Subtle Top Brand Accent Bar across right column
    document.save();
    document.rect(leftColWidth, 0, rightColWidth, 5).fill("#0b5fa8");
    document.restore();

    // ==========================================
    // LEFT COLUMN CONTENT (Width: 195, Inset: 18)
    // ==========================================
    const leftPadding = 18;
    const leftInnerWidth = leftColWidth - leftPadding * 2;
    let leftY = 32;

    // Photo or Monogram
    const photoDiameter = 80;
    const photoRadius = photoDiameter / 2;
    const photoCenterX = leftPadding + leftInnerWidth / 2;
    const photoCenterY = leftY + photoRadius;

    let photoDrawn = false;
    if (cv.photoBuffer && cv.photoBuffer.length > 0) {
      try {
        document.save();
        document.circle(photoCenterX, photoCenterY, photoRadius).clip();
        document.image(cv.photoBuffer, photoCenterX - photoRadius, photoCenterY - photoRadius, {
          width: photoDiameter,
          height: photoDiameter,
          fit: [photoDiameter, photoDiameter],
          align: "center",
          valign: "center",
        });
        document.restore();
        // White border ring around photo
        document.save().lineWidth(2.5).strokeColor("#ffffff").circle(photoCenterX, photoCenterY, photoRadius).stroke().restore();
        photoDrawn = true;
      } catch {
        photoDrawn = false;
      }
    }

    if (!photoDrawn) {
      // Monogram avatar
      document.save().fillColor("#1c3d5a").circle(photoCenterX, photoCenterY, photoRadius).fill().restore();
      document.save().lineWidth(2.5).strokeColor("#3b82f6").circle(photoCenterX, photoCenterY, photoRadius).stroke().restore();
      const initials = cv.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p.charAt(0).toUpperCase())
        .join("") || "T";
      document.font("Heavy").fontSize(26).fillColor("#ffffff");
      document.text(initials, photoCenterX - 30, photoCenterY - 14, { width: 60, align: "center", lineBreak: false });
    }

    leftY += photoDiameter + 12;

    // Verified Badge
    const badgeWidth = 114;
    const badgeHeight = 20;
    const badgeX = photoCenterX - badgeWidth / 2;
    document.save();
    document.roundedRect(badgeX, leftY, badgeWidth, badgeHeight, 10).fill("#15803d");
    document.font("Bold").fontSize(7.5).fillColor("#ffffff");
    document.text(cv.verified ? "✓  VERIFIED TUTOR" : "✓  REGISTERED TUTOR", badgeX, leftY + 5.5, {
      width: badgeWidth,
      align: "center",
      characterSpacing: 0.5,
      lineBreak: false,
    });
    document.restore();

    leftY += badgeHeight + 10;

    // Tutor ID Tag
    const tutorIdDisplay = cv.tutorNumber ? `TUTOR ID: ${cv.tutorNumber}` : `ID: ${cv.tutorId}`;
    document.font("Heavy").fontSize(9.5).fillColor("#93c5fd");
    document.text(tutorIdDisplay, leftPadding, leftY, { width: leftInnerWidth, align: "center", characterSpacing: 0.5 });
    leftY += 18;

    // Divider
    document.save().lineWidth(0.6).strokeColor("#274563").moveTo(leftPadding, leftY).lineTo(leftColWidth - leftPadding, leftY).stroke().restore();
    leftY += 14;

    // Section: CONTACT INFO
    document.font("Heavy").fontSize(8).fillColor("#38bdf8").text("CONTACT INFORMATION", leftPadding, leftY, { characterSpacing: 1.1 });
    leftY += 13;

    if (cv.locationLabel) {
      document.font("Bold").fontSize(7.5).fillColor("#94a3b8").text("Location", leftPadding, leftY);
      leftY += 9;
      writeCvText(document, cv.locationLabel, "Regular", leftPadding, leftY, leftInnerWidth, { size: 8, color: "#ffffff", lineGap: 1 });
      leftY += 16;
    }

    if (cv.phone) {
      document.font("Bold").fontSize(7.5).fillColor("#94a3b8").text("Phone Number", leftPadding, leftY);
      leftY += 9;
      const phoneDisplay = formatLetterPhone(cv.phone);
      document.font("Bold").fontSize(8.5).fillColor("#ffffff").text(phoneDisplay, leftPadding, leftY, { width: leftInnerWidth });
      leftY += 16;
    }

    if (cv.contactEmail) {
      document.font("Bold").fontSize(7.5).fillColor("#94a3b8").text("Email", leftPadding, leftY);
      leftY += 9;
      document.font("Regular").fontSize(7.5).fillColor("#e2e8f0").text(cv.contactEmail, leftPadding, leftY, { width: leftInnerWidth, lineBreak: true });
      leftY += 16;
    }

    // Divider
    document.save().lineWidth(0.6).strokeColor("#274563").moveTo(leftPadding, leftY).lineTo(leftColWidth - leftPadding, leftY).stroke().restore();
    leftY += 14;

    // Section: SUBJECT EXPERTISE
    const subjects = (cv.subjects ?? []).filter(Boolean);
    if (subjects.length > 0) {
      document.font("Heavy").fontSize(8).fillColor("#38bdf8").text("SUBJECT EXPERTISE", leftPadding, leftY, { characterSpacing: 1.1 });
      leftY += 13;

      const subjectBadges = subjects.slice(0, 7);
      subjectBadges.forEach(subj => {
        document.save().roundedRect(leftPadding, leftY, leftInnerWidth, 16, 4).fill("#1c3b5b").restore();
        writeCvText(document, subj, "Bold", leftPadding + 6, leftY + 3.5, leftInnerWidth - 12, { size: 7.5, color: "#f8fafc" });
        leftY += 19;
      });
      leftY += 4;
      document.save().lineWidth(0.6).strokeColor("#274563").moveTo(leftPadding, leftY).lineTo(leftColWidth - leftPadding, leftY).stroke().restore();
      leftY += 12;
    }

    // Section: PREFERRED CLASSES
    const levels = (cv.levels ?? []).filter(Boolean);
    if (levels.length > 0) {
      document.font("Heavy").fontSize(8).fillColor("#38bdf8").text("PREFERRED CLASSES", leftPadding, leftY, { characterSpacing: 1.1 });
      leftY += 13;
      const levelText = levels.slice(0, 5).join(", ");
      writeCvText(document, levelText, "Regular", leftPadding, leftY, leftInnerWidth, { size: 8, color: "#f1f5f9", lineGap: 1.5 });
      leftY += 22;
      document.save().lineWidth(0.6).strokeColor("#274563").moveTo(leftPadding, leftY).lineTo(leftColWidth - leftPadding, leftY).stroke().restore();
      leftY += 12;
    }

    // Section: TUITION MODES
    const modes = (cv.tuitionTypes ?? []).filter(Boolean);
    if (modes.length > 0) {
      document.font("Heavy").fontSize(8).fillColor("#38bdf8").text("TUITION DELIVERY", leftPadding, leftY, { characterSpacing: 1.1 });
      leftY += 13;
      const modeLabels: Record<string, string> = { home: "Home Tuition", online: "Online Tuition", group: "Group Tuition", package: "Package Tuition" };
      const modeText = modes.map(m => modeLabels[m] ?? m).join(" & ");
      writeCvText(document, modeText, "Regular", leftPadding, leftY, leftInnerWidth, { size: 8, color: "#f1f5f9" });
      leftY += 20;
    }

    // Rating Badge at bottom of left column
    if (cv.ratingAverage && cv.ratingAverage > 0) {
      const bottomRatingY = pageHeight - 44;
      document.save().roundedRect(leftPadding, bottomRatingY, leftInnerWidth, 24, 6).fill("#0d2033").restore();
      const stars = "★".repeat(Math.round(cv.ratingAverage)) + "☆".repeat(5 - Math.round(cv.ratingAverage));
      document.font("Bold").fontSize(9).fillColor("#f59e0b");
      const revText = cv.reviewCount ? ` (${cv.reviewCount} reviews)` : "";
      document.text(`${cv.ratingAverage.toFixed(1)} ${stars}${revText}`, leftPadding, bottomRatingY + 6.5, { width: leftInnerWidth, align: "center" });
    }

    // ==========================================
    // RIGHT COLUMN CONTENT (Width: 400.28, Inset: 26)
    // ==========================================
    const rightPadding = 26;
    const rightInnerWidth = rightColWidth - rightPadding * 2;
    const rightContentLeft = rightColLeft + rightPadding;
    let rightY = 32;

    // Header Logo & Brand Watermark at top right
    drawCradle(document, rightContentLeft + rightInnerWidth - 42, rightY - 6, 26 / 48);

    // Tutor Name
    writeCvText(document, cv.name, "Heavy", rightContentLeft, rightY, rightInnerWidth - 55, { size: 18, color: "#0f2137", lineGap: 2 });
    rightY += 25;

    // Headline / Tagline
    const headline = cv.headline?.trim() || [cv.highestEducation, cv.institution].filter(Boolean).join(" · ") || "Dedicated & Experienced Tutor";
    writeCvText(document, headline, "Bold", rightContentLeft, rightY, rightInnerWidth, { size: 10, color: "#0b5fa8", lineGap: 1.5 });
    rightY += 19;

    // Divider
    document.save().lineWidth(1).strokeColor("#e2e8f0").moveTo(rightContentLeft, rightY).lineTo(rightContentLeft + rightInnerWidth, rightY).stroke().restore();
    rightY += 14;

    // Section: ABOUT / PROFESSIONAL SUMMARY
    const bioText = cv.aboutMe?.trim() || "Passionate educator committed to providing high-quality, personalized tutoring. Focused on conceptual clarity, student engagement, and consistent academic progress.";
    document.font("Heavy").fontSize(8.5).fillColor("#0b5fa8").text("PROFESSIONAL SUMMARY", rightContentLeft, rightY, { characterSpacing: 1.1 });
    rightY += 13;
    writeCvText(document, bioText, "Regular", rightContentLeft, rightY, rightInnerWidth, { size: 8.5, color: "#334155", lineGap: 2.2 });
    rightY += Math.min(65, Math.max(34, document.heightOfString(bioText, { width: rightInnerWidth, lineGap: 2.2 }))) + 12;

    // Section: EDUCATIONAL QUALIFICATIONS
    document.font("Heavy").fontSize(8.5).fillColor("#0b5fa8").text("EDUCATIONAL BACKGROUND", rightContentLeft, rightY, { characterSpacing: 1.1 });
    rightY += 13;

    const educationList = (cv.educationRecords ?? []).filter(e => e.qualificationLevel || e.degreeExamTitle || e.instituteName);

    if (educationList.length === 0) {
      // Fallback to highest education fields if records are not itemized
      const fallbackEdu = [cv.highestEducation, cv.institution, cv.education].filter(Boolean).join(" · ") || "Degree details available upon request.";
      writeCvText(document, fallbackEdu, "Regular", rightContentLeft, rightY, rightInnerWidth, { size: 8.5, color: "#334155" });
      rightY += 22;
    } else {
      // Display up to 4 education records neatly
      const recordsToDisplay = educationList.slice(0, 4);
      recordsToDisplay.forEach((edu, idx) => {
        // Degree / Level & Major
        const titleParts = [edu.degreeExamTitle || edu.qualificationLevel, edu.majorGroup ? `(${edu.majorGroup})` : null].filter(Boolean).join(" ");
        const title = titleParts || "Qualification";
        const yearPart = edu.passingYear ? `Year: ${edu.passingYear}` : edu.currentlyStudying ? "Currently Studying" : (edu.studyStartYear && edu.studyEndYear ? `${edu.studyStartYear} – ${edu.studyEndYear}` : null);
        const resultPart = edu.resultGpa ? `GPA: ${edu.resultGpa}` : null;
        const metaRight = [resultPart, yearPart].filter(Boolean).join("  ·  ");

        // Small bullet dot
        document.save().fillColor("#0b5fa8").circle(rightContentLeft + 3, rightY + 5, 2.5).fill().restore();

        // Degree title
        writeCvText(document, title, "Bold", rightContentLeft + 12, rightY, rightInnerWidth - 110, { size: 9, color: "#0f2137" });

        // Meta on the right (GPA / Year)
        if (metaRight) {
          document.font("Bold").fontSize(8).fillColor("#0b5fa8");
          document.text(metaRight, rightContentLeft + 12, rightY, { width: rightInnerWidth - 12, align: "right", lineBreak: false });
        }
        rightY += 12.5;

        // Institute name
        if (edu.instituteName) {
          writeCvText(document, edu.instituteName, "Regular", rightContentLeft + 12, rightY, rightInnerWidth - 12, { size: 8, color: "#475569" });
          rightY += 12;
        }

        if (idx < recordsToDisplay.length - 1) {
          rightY += 3;
        }
      });
      rightY += 10;
    }

    // Section: TEACHING EXPERIENCE & HIGHLIGHTS
    document.font("Heavy").fontSize(8.5).fillColor("#0b5fa8").text("TEACHING EXPERIENCE & HIGHLIGHTS", rightContentLeft, rightY, { characterSpacing: 1.1 });
    rightY += 13;

    // Stat boxes
    const expYears = cv.teachingExperienceYears ?? 2;
    const statBoxWidth = (rightInnerWidth - 12) / 2;
    const statBoxHeight = 36;

    // Box 1: Experience Years
    document.save().roundedRect(rightContentLeft, rightY, statBoxWidth, statBoxHeight, 5).fill("#f1f5f9").restore();
    document.font("Heavy").fontSize(13).fillColor("#0b5fa8").text(`${expYears}+ Years`, rightContentLeft + 10, rightY + 5, { width: statBoxWidth - 20 });
    document.font("Regular").fontSize(7.5).fillColor("#475569").text("Hands-on Tutoring Experience", rightContentLeft + 10, rightY + 21, { width: statBoxWidth - 20 });

    // Box 2: Verification Status / Method
    document.save().roundedRect(rightContentLeft + statBoxWidth + 12, rightY, statBoxWidth, statBoxHeight, 5).fill("#f1f5f9").restore();
    document.font("Heavy").fontSize(13).fillColor("#15803d").text("100% Verified", rightContentLeft + statBoxWidth + 22, rightY + 5, { width: statBoxWidth - 20 });
    document.font("Regular").fontSize(7.5).fillColor("#475569").text("Documents & Credentials Checked", rightContentLeft + statBoxWidth + 22, rightY + 21, { width: statBoxWidth - 20 });

    rightY += statBoxHeight + 11;

    // Prior teaching note or expertise
    const expNote = cv.priorTeachingExperience?.trim() || cv.specialExpertise?.trim() || "Experienced in guiding students for school/college exams, board curriculum, and problem-solving techniques.";
    writeCvText(document, expNote, "Regular", rightContentLeft, rightY, rightInnerWidth, { size: 8, color: "#334155", lineGap: 1.8 });
    rightY += Math.min(48, Math.max(24, document.heightOfString(expNote, { width: rightInnerWidth, lineGap: 1.8 }))) + 12;

    // Section: PREFERRED TUITION AREAS
    const areas = (cv.preferredLocations ?? []).filter(Boolean);
    if (areas.length > 0) {
      document.font("Heavy").fontSize(8.5).fillColor("#0b5fa8").text("PREFERRED TUITION AREAS", rightContentLeft, rightY, { characterSpacing: 1.1 });
      rightY += 12;
      const areaString = areas.join("  •  ");
      writeCvText(document, areaString, "Regular", rightContentLeft, rightY, rightInnerWidth, { size: 8, color: "#1e293b", lineGap: 1.5 });
      rightY += 20;
    }

    // ==========================================
    // FOOTER: VERIFICATION SEAL & QR CODE
    // ==========================================
    const footerTop = pageHeight - 88;
    document.save().lineWidth(0.8).strokeColor("#cbd5e1").moveTo(rightContentLeft, footerTop).lineTo(rightContentLeft + rightInnerWidth, footerTop).stroke().restore();

    const qrSize = 58;
    const qrX = rightContentLeft + rightInnerWidth - qrSize;
    const qrY = footerTop + 12;
    const profileUrl = cv.publicProfileUrl || `https://${SITE_ADDRESS}/tutors/${cv.tutorId}`;

    drawQrCode(document, profileUrl, qrX, qrY, qrSize, "#0f2137");

    // Authority Seal & Verification Info
    const sealRadius = 22;
    const sealCenterX = rightContentLeft + sealRadius;
    const sealCenterY = footerTop + 14 + sealRadius;

    document.save().lineWidth(1.2).strokeColor("#0b5fa8").circle(sealCenterX, sealCenterY, sealRadius).stroke().restore();
    document.save().lineWidth(0.6).dash(2, { space: 2 }).strokeColor("#0b5fa8").circle(sealCenterX, sealCenterY, sealRadius - 3.5).stroke().undash().restore();
    const cradleScale = 24 / 48;
    drawCradle(document, sealCenterX - 24 * cradleScale, sealCenterY - 24 * cradleScale, cradleScale, 1.2);

    const sealTextLeft = sealCenterX + sealRadius + 10;
    const sealTextWidth = qrX - sealTextLeft - 10;

    document.font("Heavy").fontSize(8.5).fillColor("#0f2137").text("CONNECT TUTORS BD", sealTextLeft, footerTop + 14, { width: sealTextWidth });
    document.font("Bold").fontSize(7.5).fillColor("#15803d").text("OFFICIALLY VERIFIED PROFILE", sealTextLeft, footerTop + 25, { width: sealTextWidth });
    document.font("Regular").fontSize(7).fillColor("#64748b").text(`Scan QR code or visit ${SITE_ADDRESS} to verify background, certificates and reviews.`, sealTextLeft, footerTop + 36, { width: sealTextWidth, lineGap: 1.5 });

    document.end();
  });
}
