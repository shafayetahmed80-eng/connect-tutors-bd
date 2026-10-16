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
  curriculum?: string | null;
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
  dateOfBirth?: string | null;
  religion?: string | null;
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
  teachingApproach?: string | null;
  whyChooseMe?: string | null;
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

/** Renders multi-script text with fallback to Noto Sans Bengali when Bengali characters are present and returns height. */
export function writeCvText(
  document: PDFKit.PDFDocument,
  text: string,
  font: LatinFont,
  x: number,
  y: number,
  width: number,
  options?: { size?: number; color?: string; align?: "left" | "center" | "right"; lineGap?: number },
): number {
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

  return document.heightOfString(text, { width, lineGap });
}

function getEducationLevelRank(level?: string | null): number {
  if (!level) return 99;
  const l = level.toLowerCase();
  if (l.includes("master") || l.includes("post grad") || l.includes("msc") || l.includes("mba") || l.includes("ma") || l.includes("m.s")) return 1;
  if (l.includes("honour") || l.includes("bachelor") || l.includes("degree") || l.includes("undergrad") || l.includes("bsc") || l.includes("bba") || l.includes("ba")) return 2;
  if (l.includes("hsc") || l.includes("higher secondary") || l.includes("a level") || l.includes("alim")) return 3;
  if (l.includes("ssc") || l.includes("secondary") || l.includes("o level") || l.includes("dakhil")) return 4;
  return 5;
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

    // 1. Draw Left Sidebar using Website's Brand Sidebar Gradient (#0d5fae -> #0a4c8c)
    const sidebarGradient = document.linearGradient(0, 0, 0, pageHeight);
    sidebarGradient.stop(0, "#0d5fae");
    sidebarGradient.stop(1, "#0a4c8c");
    document.save();
    document.rect(0, 0, leftColWidth, pageHeight).fill(sidebarGradient);
    document.restore();

    // 2. Draw Top Accent Bar across right column
    document.save();
    document.rect(leftColWidth, 0, rightColWidth, 5).fill("#0d5fae");
    document.restore();

    // ==========================================
    // LEFT COLUMN CONTENT (Width: 195, Inset: 18)
    // ==========================================
    const leftPadding = 18;
    const leftInnerWidth = leftColWidth - leftPadding * 2;
    let leftY = 30;

    // Photo or Monogram Avatar
    const photoDiameter = 76;
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
        document.save().lineWidth(2).strokeColor("#ffffff").circle(photoCenterX, photoCenterY, photoRadius).stroke().restore();
        photoDrawn = true;
      } catch {
        photoDrawn = false;
      }
    }

    if (!photoDrawn) {
      // Monogram avatar with website brand tones
      document.save().fillColor("#093d70").circle(photoCenterX, photoCenterY, photoRadius).fill().restore();
      document.save().lineWidth(2).strokeColor("#60a5fa").circle(photoCenterX, photoCenterY, photoRadius).stroke().restore();
      const initials = cv.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p.charAt(0).toUpperCase())
        .join("") || "T";
      document.font("Heavy").fontSize(24).fillColor("#ffffff");
      document.text(initials, photoCenterX - 30, photoCenterY - 13, { width: 60, align: "center", lineBreak: false });
    }

    leftY += photoDiameter + 10;

    // Verified Badge
    const badgeWidth = 114;
    const badgeHeight = 19;
    const badgeX = photoCenterX - badgeWidth / 2;
    document.save();
    document.roundedRect(badgeX, leftY, badgeWidth, badgeHeight, 9.5).fill("#16a34a");
    document.font("Bold").fontSize(7.5).fillColor("#ffffff");
    document.text(cv.verified ? "✓  VERIFIED TUTOR" : "✓  REGISTERED TUTOR", badgeX, leftY + 5, {
      width: badgeWidth,
      align: "center",
      characterSpacing: 0.5,
      lineBreak: false,
    });
    document.restore();

    leftY += badgeHeight + 8;

    // Tutor ID Tag
    const tutorIdDisplay = cv.tutorNumber ? `TUTOR ID: ${cv.tutorNumber}` : `ID: ${cv.tutorId}`;
    document.font("Heavy").fontSize(9).fillColor("#dbeafe");
    document.text(tutorIdDisplay, leftPadding, leftY, { width: leftInnerWidth, align: "center", characterSpacing: 0.5 });
    leftY += 16;

    // Divider
    document.save().lineWidth(0.6).strokeColor("rgba(255, 255, 255, 0.20)").moveTo(leftPadding, leftY).lineTo(leftColWidth - leftPadding, leftY).stroke().restore();
    leftY += 12;

    // Section: CONTACT & PERSONAL
    document.font("Heavy").fontSize(8).fillColor("#ffffff").text("CONTACT & PERSONAL", leftPadding, leftY, { characterSpacing: 1.1 });
    leftY += 12;

    // 1. Location (Location, City, Country)
    if (cv.locationLabel?.trim()) {
      document.font("Bold").fontSize(7.2).fillColor("#cfe0f5").text("Location", leftPadding, leftY);
      leftY += 8.5;
      const h = writeCvText(document, cv.locationLabel.trim(), "Regular", leftPadding, leftY, leftInnerWidth, { size: 7.8, color: "#ffffff", lineGap: 1 });
      leftY += Math.max(13, h + 3);
    }

    // 2. Phone
    if (cv.phone?.trim()) {
      document.font("Bold").fontSize(7.2).fillColor("#cfe0f5").text("Phone Number", leftPadding, leftY);
      leftY += 8.5;
      const phoneDisplay = formatLetterPhone(cv.phone.trim());
      document.font("Bold").fontSize(8).fillColor("#ffffff").text(phoneDisplay, leftPadding, leftY, { width: leftInnerWidth });
      leftY += 13.5;
    }

    // 3. Email
    if (cv.contactEmail?.trim()) {
      document.font("Bold").fontSize(7.2).fillColor("#cfe0f5").text("Email", leftPadding, leftY);
      leftY += 8.5;
      document.font("Regular").fontSize(7.2).fillColor("#ffffff").text(cv.contactEmail.trim(), leftPadding, leftY, { width: leftInnerWidth, lineBreak: true });
      leftY += 13.5;
    }

    // 4. Date of Birth
    if (cv.dateOfBirth?.trim()) {
      document.font("Bold").fontSize(7.2).fillColor("#cfe0f5").text("Date of Birth", leftPadding, leftY);
      leftY += 8.5;
      document.font("Regular").fontSize(7.8).fillColor("#ffffff").text(cv.dateOfBirth.trim(), leftPadding, leftY, { width: leftInnerWidth });
      leftY += 13.5;
    }

    // 5. Religion
    if (cv.religion?.trim()) {
      document.font("Bold").fontSize(7.2).fillColor("#cfe0f5").text("Religion", leftPadding, leftY);
      leftY += 8.5;
      writeCvText(document, cv.religion.trim(), "Regular", leftPadding, leftY, leftInnerWidth, { size: 7.8, color: "#ffffff" });
      leftY += 13.5;
    }

    // 6. Gender
    if (cv.gender?.trim()) {
      document.font("Bold").fontSize(7.2).fillColor("#cfe0f5").text("Gender", leftPadding, leftY);
      leftY += 8.5;
      const genderDisplay = cv.gender.trim().charAt(0).toUpperCase() + cv.gender.trim().slice(1);
      document.font("Regular").fontSize(7.8).fillColor("#ffffff").text(genderDisplay, leftPadding, leftY, { width: leftInnerWidth });
      leftY += 13.5;
    }

    // Divider
    document.save().lineWidth(0.6).strokeColor("rgba(255, 255, 255, 0.20)").moveTo(leftPadding, leftY).lineTo(leftColWidth - leftPadding, leftY).stroke().restore();
    leftY += 11;

    // Section: SUBJECT EXPERTISE
    const subjects = (cv.subjects ?? []).filter(Boolean);
    if (subjects.length > 0) {
      document.font("Heavy").fontSize(8).fillColor("#ffffff").text("SUBJECT EXPERTISE", leftPadding, leftY, { characterSpacing: 1.1 });
      leftY += 11;

      const subjectBadges = subjects.slice(0, 6);
      subjectBadges.forEach(subj => {
        document.save().roundedRect(leftPadding, leftY, leftInnerWidth, 15, 3.5).fill("rgba(255, 255, 255, 0.15)").restore();
        writeCvText(document, subj, "Bold", leftPadding + 6, leftY + 3, leftInnerWidth - 12, { size: 7.2, color: "#ffffff" });
        leftY += 17.5;
      });
      leftY += 2;
      document.save().lineWidth(0.6).strokeColor("rgba(255, 255, 255, 0.20)").moveTo(leftPadding, leftY).lineTo(leftColWidth - leftPadding, leftY).stroke().restore();
      leftY += 10;
    }

    // Section: PREFERRED CLASSES
    const levels = (cv.levels ?? []).filter(Boolean);
    if (levels.length > 0) {
      document.font("Heavy").fontSize(8).fillColor("#ffffff").text("PREFERRED CLASSES", leftPadding, leftY, { characterSpacing: 1.1 });
      leftY += 10;
      const levelText = levels.slice(0, 5).join(", ");
      const h = writeCvText(document, levelText, "Regular", leftPadding, leftY, leftInnerWidth, { size: 7.6, color: "#ffffff", lineGap: 1.2 });
      leftY += Math.max(14, h) + 6;
      document.save().lineWidth(0.6).strokeColor("rgba(255, 255, 255, 0.20)").moveTo(leftPadding, leftY).lineTo(leftColWidth - leftPadding, leftY).stroke().restore();
      leftY += 10;
    }

    // Section: TUITION DELIVERY
    const modes = (cv.tuitionTypes ?? []).filter(Boolean);
    if (modes.length > 0) {
      document.font("Heavy").fontSize(8).fillColor("#ffffff").text("TUITION DELIVERY", leftPadding, leftY, { characterSpacing: 1.1 });
      leftY += 10;
      const modeLabels: Record<string, string> = { home: "Home Tuition", online: "Online Tuition", group: "Group Tuition", package: "Package Tuition" };
      const modeText = modes.map(m => modeLabels[m] ?? m).join(" & ");
      writeCvText(document, modeText, "Regular", leftPadding, leftY, leftInnerWidth, { size: 7.6, color: "#ffffff" });
      leftY += 16;
    }

    // Rating Badge at bottom of left column
    if (cv.ratingAverage && cv.ratingAverage > 0) {
      const bottomRatingY = pageHeight - 40;
      document.save().roundedRect(leftPadding, bottomRatingY, leftInnerWidth, 22, 5).fill("#073b6e").restore();
      const stars = "★".repeat(Math.round(cv.ratingAverage)) + "☆".repeat(5 - Math.round(cv.ratingAverage));
      document.font("Bold").fontSize(8.5).fillColor("#fbbf24");
      const revText = cv.reviewCount ? ` (${cv.reviewCount} reviews)` : "";
      document.text(`${cv.ratingAverage.toFixed(1)} ${stars}${revText}`, leftPadding, bottomRatingY + 5.5, { width: leftInnerWidth, align: "center" });
    }

    // ==========================================
    // RIGHT COLUMN CONTENT (Width: 400.28, Inset: 24)
    // ==========================================
    const rightPadding = 24;
    const rightInnerWidth = rightColWidth - rightPadding * 2;
    const rightContentLeft = rightColLeft + rightPadding;
    const footerTop = pageHeight - 84;
    let rightY = 28;

    // Header Logo & Brand Watermark at top right
    drawCradle(document, rightContentLeft + rightInnerWidth - 40, rightY - 4, 25 / 48);

    // Tutor Name
    writeCvText(document, cv.name, "Heavy", rightContentLeft, rightY, rightInnerWidth - 50, { size: 17, color: "#0f2137", lineGap: 1.5 });
    rightY += 23;

    // Headline / Tagline
    const headline = cv.headline?.trim() || [cv.highestEducation, cv.institution].filter(Boolean).join(" · ") || "";
    if (headline) {
      writeCvText(document, headline, "Bold", rightContentLeft, rightY, rightInnerWidth, { size: 9.5, color: "#0d5fae", lineGap: 1.2 });
      rightY += 17;
    }

    // Divider
    document.save().lineWidth(0.8).strokeColor("#e2e8f0").moveTo(rightContentLeft, rightY).lineTo(rightContentLeft + rightInnerWidth, rightY).stroke().restore();
    rightY += 12;

    // ------------------------------------------
    // SECTION: PROFESSIONAL SUMMARY (Only if filled)
    // ------------------------------------------
    const bioText = cv.aboutMe?.trim();
    if (bioText) {
      document.font("Heavy").fontSize(8.5).fillColor("#0d5fae").text("PROFESSIONAL SUMMARY", rightContentLeft, rightY, { characterSpacing: 1.1 });
      rightY += 11;
      const bioHeight = writeCvText(document, bioText, "Regular", rightContentLeft, rightY, rightInnerWidth, { size: 8, color: "#334155", lineGap: 1.8 });
      rightY += Math.min(50, Math.max(14, bioHeight)) + 9;
    }

    // ------------------------------------------
    // SECTION: EDUCATIONAL BACKGROUND (Masters, Honours, HSC, SSC detailed)
    // ------------------------------------------
    const rawEduList = (cv.educationRecords ?? []).filter(e => e.qualificationLevel || e.degreeExamTitle || e.instituteName);
    const sortedEduList = [...rawEduList].sort((a, b) => {
      const rankA = getEducationLevelRank(a.qualificationLevel || a.degreeExamTitle);
      const rankB = getEducationLevelRank(b.qualificationLevel || b.degreeExamTitle);
      if (rankA !== rankB) return rankA - rankB;
      return (b.passingYear ?? b.studyEndYear ?? 0) - (a.passingYear ?? a.studyEndYear ?? 0);
    });

    if (sortedEduList.length > 0) {
      document.font("Heavy").fontSize(8.5).fillColor("#0d5fae").text("EDUCATIONAL BACKGROUND", rightContentLeft, rightY, { characterSpacing: 1.1 });
      rightY += 11;

      // Show up to 4 qualification levels (Masters, Honours, HSC, SSC)
      const recordsToDisplay = sortedEduList.slice(0, 4);
      recordsToDisplay.forEach((edu) => {
        const level = edu.qualificationLevel?.trim();
        const degree = edu.degreeExamTitle?.trim();
        let title = degree || level || "Qualification";
        if (level && degree && !degree.toLowerCase().includes(level.toLowerCase())) {
          title = `${level} - ${degree}`;
        }
        if (edu.majorGroup?.trim()) {
          title += ` (${edu.majorGroup.trim()})`;
        }

        const yearPart = edu.passingYear
          ? `Year: ${edu.passingYear}`
          : edu.currentlyStudying
            ? "Currently Studying"
            : edu.studyStartYear && edu.studyEndYear
              ? `${edu.studyStartYear} – ${edu.studyEndYear}`
              : edu.studyStartYear
                ? `${edu.studyStartYear} – Present`
                : null;
        const resultPart = edu.resultGpa ? `GPA: ${edu.resultGpa.trim()}` : null;
        const metaRight = [resultPart, yearPart].filter(Boolean).join("  ·  ");

        // Small bullet dot
        document.save().fillColor("#0d5fae").circle(rightContentLeft + 3, rightY + 4.5, 2.2).fill().restore();

        // Degree Title
        writeCvText(document, title, "Bold", rightContentLeft + 11, rightY, rightInnerWidth - 110, { size: 8.5, color: "#0f2137" });

        // Meta on the right (GPA / Year)
        if (metaRight) {
          document.font("Bold").fontSize(7.6).fillColor("#0d5fae");
          document.text(metaRight, rightContentLeft + 11, rightY, { width: rightInnerWidth - 11, align: "right", lineBreak: false });
        }
        rightY += 11;

        // Institute & Curriculum Details
        const instituteDetails = [edu.instituteName?.trim(), edu.curriculum?.trim()].filter(Boolean).join("  ·  ");
        if (instituteDetails) {
          writeCvText(document, instituteDetails, "Regular", rightContentLeft + 11, rightY, rightInnerWidth - 11, { size: 7.6, color: "#475569" });
          rightY += 10.5;
        }

        rightY += 2.5;
      });
      rightY += 7;
    } else {
      // Fallback only if highestEducation or institution exists
      const fallbackEdu = [cv.highestEducation, cv.institution, cv.education].filter(Boolean).join(" · ").trim();
      if (fallbackEdu) {
        document.font("Heavy").fontSize(8.5).fillColor("#0d5fae").text("EDUCATIONAL BACKGROUND", rightContentLeft, rightY, { characterSpacing: 1.1 });
        rightY += 11;
        writeCvText(document, fallbackEdu, "Regular", rightContentLeft, rightY, rightInnerWidth, { size: 8, color: "#334155" });
        rightY += 16;
      }
    }

    // ------------------------------------------
    // SECTION: TEACHING EXPERIENCE & HIGHLIGHTS (Only if filled)
    // ------------------------------------------
    const hasExpDetails = Boolean(
      (cv.teachingExperienceYears !== undefined && cv.teachingExperienceYears !== null) ||
      cv.priorTeachingExperience?.trim() ||
      cv.teachingApproach?.trim() ||
      cv.specialExpertise?.trim()
    );

    if (hasExpDetails) {
      document.font("Heavy").fontSize(8.5).fillColor("#0d5fae").text("TEACHING EXPERIENCE & METHODOLOGY", rightContentLeft, rightY, { characterSpacing: 1.1 });
      rightY += 11;

      // Compact Stat boxes
      const expYears = cv.teachingExperienceYears ?? 0;
      const statBoxWidth = (rightInnerWidth - 10) / 2;
      const statBoxHeight = 31;

      // Box 1: Experience Years
      document.save().roundedRect(rightContentLeft, rightY, statBoxWidth, statBoxHeight, 4).fill("#f1f5f9").restore();
      document.font("Heavy").fontSize(11).fillColor("#0d5fae").text(`${expYears}+ Years`, rightContentLeft + 8, rightY + 3.5, { width: statBoxWidth - 16 });
      document.font("Regular").fontSize(7.2).fillColor("#475569").text("Tutoring Experience", rightContentLeft + 8, rightY + 17, { width: statBoxWidth - 16 });

      // Box 2: Verification Status
      document.save().roundedRect(rightContentLeft + statBoxWidth + 10, rightY, statBoxWidth, statBoxHeight, 4).fill("#f1f5f9").restore();
      document.font("Heavy").fontSize(11).fillColor("#15803d").text(cv.verified ? "100% Verified" : "Registered Profile", rightContentLeft + statBoxWidth + 18, rightY + 3.5, { width: statBoxWidth - 16 });
      document.font("Regular").fontSize(7.2).fillColor("#475569").text("Credentials & Identity Checked", rightContentLeft + statBoxWidth + 18, rightY + 17, { width: statBoxWidth - 16 });

      rightY += statBoxHeight + 7;

      // Teacher's own prior teaching experience note
      if (cv.priorTeachingExperience?.trim()) {
        document.font("Bold").fontSize(7.6).fillColor("#0f2137").text("Experience Highlights:", rightContentLeft, rightY);
        rightY += 9;
        const h = writeCvText(document, cv.priorTeachingExperience.trim(), "Regular", rightContentLeft, rightY, rightInnerWidth, { size: 7.6, color: "#334155", lineGap: 1.6 });
        rightY += Math.min(36, Math.max(12, h)) + 5;
      }

      // Teacher's own teaching approach / methodology
      if (cv.teachingApproach?.trim()) {
        document.font("Bold").fontSize(7.6).fillColor("#0f2137").text("Teaching Methodology & Approach:", rightContentLeft, rightY);
        rightY += 9;
        const h = writeCvText(document, cv.teachingApproach.trim(), "Regular", rightContentLeft, rightY, rightInnerWidth, { size: 7.6, color: "#334155", lineGap: 1.6 });
        rightY += Math.min(34, Math.max(12, h)) + 5;
      }

      // Teacher's special expertise
      if (cv.specialExpertise?.trim() && cv.specialExpertise.trim() !== cv.priorTeachingExperience?.trim()) {
        document.font("Bold").fontSize(7.6).fillColor("#0f2137").text("Special Expertise:", rightContentLeft, rightY);
        rightY += 9;
        const h = writeCvText(document, cv.specialExpertise.trim(), "Regular", rightContentLeft, rightY, rightInnerWidth, { size: 7.6, color: "#334155", lineGap: 1.6 });
        rightY += Math.min(28, Math.max(12, h)) + 5;
      }

      rightY += 4;
    }

    // ------------------------------------------
    // SECTION: WHY CHOOSE ME (Only if filled)
    // ------------------------------------------
    if (cv.whyChooseMe?.trim()) {
      document.font("Heavy").fontSize(8.5).fillColor("#0d5fae").text("WHY CHOOSE ME", rightContentLeft, rightY, { characterSpacing: 1.1 });
      rightY += 10.5;
      const h = writeCvText(document, cv.whyChooseMe.trim(), "Regular", rightContentLeft, rightY, rightInnerWidth, { size: 7.6, color: "#334155", lineGap: 1.6 });
      rightY += Math.min(36, Math.max(12, h)) + 7;
    }

    // ------------------------------------------
    // SECTION: PREFERRED TUITION AREAS (Only if filled)
    // ------------------------------------------
    const areas = (cv.preferredLocations ?? []).filter(Boolean);
    if (areas.length > 0 && rightY < footerTop - 40) {
      document.font("Heavy").fontSize(8.5).fillColor("#0d5fae").text("PREFERRED TUITION AREAS", rightContentLeft, rightY, { characterSpacing: 1.1 });
      rightY += 10.5;
      const areaString = areas.slice(0, 10).join("  •  ");
      writeCvText(document, areaString, "Regular", rightContentLeft, rightY, rightInnerWidth, { size: 7.6, color: "#1e293b", lineGap: 1.4 });
      rightY += 15;
    }

    // ==========================================
    // FOOTER: VERIFICATION SEAL & QR CODE
    // ==========================================
    document.save().lineWidth(0.8).strokeColor("#cbd5e1").moveTo(rightContentLeft, footerTop).lineTo(rightContentLeft + rightInnerWidth, footerTop).stroke().restore();

    const qrSize = 56;
    const qrX = rightContentLeft + rightInnerWidth - qrSize;
    const qrY = footerTop + 10;
    const profileUrl = cv.publicProfileUrl || `https://${SITE_ADDRESS}/tutors/${cv.tutorId}`;

    drawQrCode(document, profileUrl, qrX, qrY, qrSize, "#0f2137");

    // Authority Seal & Verification Info
    const sealRadius = 21;
    const sealCenterX = rightContentLeft + sealRadius;
    const sealCenterY = footerTop + 12 + sealRadius;

    document.save().lineWidth(1.2).strokeColor("#0d5fae").circle(sealCenterX, sealCenterY, sealRadius).stroke().restore();
    document.save().lineWidth(0.6).dash(2, { space: 2 }).strokeColor("#0d5fae").circle(sealCenterX, sealCenterY, sealRadius - 3.5).stroke().undash().restore();
    const cradleScale = 22 / 48;
    drawCradle(document, sealCenterX - 24 * cradleScale, sealCenterY - 24 * cradleScale, cradleScale, 1.2);

    const sealTextLeft = sealCenterX + sealRadius + 9;
    const sealTextWidth = qrX - sealTextLeft - 8;

    document.font("Heavy").fontSize(8.2).fillColor("#0f2137").text("CONNECT TUTORS BD", sealTextLeft, footerTop + 12, { width: sealTextWidth });
    document.font("Bold").fontSize(7.2).fillColor("#15803d").text("OFFICIALLY VERIFIED PROFILE", sealTextLeft, footerTop + 22.5, { width: sealTextWidth });
    document.font("Regular").fontSize(6.8).fillColor("#64748b").text(`Scan QR code or visit ${SITE_ADDRESS} to verify background, certificates and reviews.`, sealTextLeft, footerTop + 33, { width: sealTextWidth, lineGap: 1.4 });

    document.end();
  });
}

