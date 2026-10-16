import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import {
  SITE_ADDRESS,
  colour,
  drawCradle,
  formatLetterPhone,
  splitScriptRuns,
} from "./confirmation-letter-pdf";

const require = createRequire(import.meta.url);

/**
 * Tutor CV & Biodata is set in Inter - the international corporate & executive
 * gold standard for crisp readability across print and screen.
 * Noto Sans Bengali is paired for multi-script Bengali support.
 */
export const cvFontFiles = {
  Regular: require.resolve("@fontsource/inter/files/inter-latin-400-normal.woff"),
  Medium: require.resolve("@fontsource/inter/files/inter-latin-500-normal.woff"),
  SemiBold: require.resolve("@fontsource/inter/files/inter-latin-600-normal.woff"),
  Bold: require.resolve("@fontsource/inter/files/inter-latin-700-normal.woff"),
  Heavy: require.resolve("@fontsource/inter/files/inter-latin-800-normal.woff"),
  Bengali: require.resolve("@fontsource/noto-sans-bengali/files/noto-sans-bengali-bengali-400-normal.woff"),
  BengaliBold: require.resolve("@fontsource/noto-sans-bengali/files/noto-sans-bengali-bengali-700-normal.woff"),
} as const;

export type CvFont = "Regular" | "Medium" | "SemiBold" | "Bold" | "Heavy";

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
  profileStatus?: string | null;
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

/** Status resolution for badge, stat box, and verification seal */
export type TutorCvStatusInfo = {
  badgeText: string;
  badgeBg: string;
  statTitle: string;
  statSubtitle: string;
  sealStatus: string;
  statColor: string;
};

export function resolveTutorCvStatus(profileStatus?: string | null, verified?: boolean): TutorCvStatusInfo {
  const normStatus = (profileStatus || "").toLowerCase().trim();
  // 1. If verified by platform
  if (verified || normStatus === "verified") {
    return {
      badgeText: "✓  VERIFIED TUTOR",
      badgeBg: "#16a34a",
      statTitle: "100% Verified",
      statSubtitle: "Credentials & Identity Checked",
      sealStatus: "OFFICIALLY VERIFIED PROFILE",
      statColor: "#15803d",
    };
  }
  // 2. Approved profile
  if (normStatus === "approved") {
    return {
      badgeText: "✓  APPROVED PROFILE",
      badgeBg: "#0284c7",
      statTitle: "Approved Profile",
      statSubtitle: "Admin Reviewed & Approved",
      sealStatus: "OFFICIALLY APPROVED PROFILE",
      statColor: "#0284c7",
    };
  }
  // 3. Pending review
  if (normStatus === "pending" || normStatus === "submitted") {
    return {
      badgeText: "UNDER REVIEW",
      badgeBg: "#d97706",
      statTitle: "Under Review",
      statSubtitle: "Profile Submitted for Review",
      sealStatus: "PROFILE UNDER REVIEW",
      statColor: "#b45309",
    };
  }
  // 4. Draft profile
  return {
    badgeText: "DRAFT PROFILE",
    badgeBg: "#475569",
    statTitle: "Draft Profile",
    statSubtitle: "Profile Details In Progress",
    sealStatus: "OFFICIAL TUTOR BIODATA",
    statColor: "#475569",
  };
}

// ==========================================
// VECTOR ICONS (Crisp, High-DPI, Scalable)
// ==========================================

export function drawPinIcon(doc: PDFKit.PDFDocument, x: number, y: number, size = 10, color = "#ffffff") {
  const cx = x + size / 2;
  const r = size * 0.35;
  const topY = y + r + 0.5;
  doc.save();
  doc.fillColor(color);
  doc.circle(cx, topY, r).fill();
  doc.polygon([cx - r * 0.75, topY + r * 0.45], [cx + r * 0.75, topY + r * 0.45], [cx, y + size]).fill();
  doc.fillColor(color === "#ffffff" ? "#0d5fae" : "#ffffff");
  doc.circle(cx, topY, r * 0.42).fill();
  doc.restore();
}

export function drawPhoneIcon(doc: PDFKit.PDFDocument, x: number, y: number, size = 10, color = "#ffffff") {
  const w = size * 0.62;
  const h = size * 0.95;
  const rx = x + (size - w) / 2;
  const ry = y + (size - h) / 2;
  doc.save();
  doc.roundedRect(rx, ry, w, h, 1.8).lineWidth(0.9).strokeColor(color).stroke();
  doc.fillColor(color).circle(rx + w / 2, ry + h - 1.8, 0.65).fill();
  doc.lineWidth(0.8).strokeColor(color).moveTo(rx + w * 0.35, ry + 1.8).lineTo(rx + w * 0.65, ry + 1.8).stroke();
  doc.restore();
}

export function drawMailIcon(doc: PDFKit.PDFDocument, x: number, y: number, size = 10, color = "#ffffff") {
  const w = size * 0.94;
  const h = size * 0.68;
  const rx = x + (size - w) / 2;
  const ry = y + (size - h) / 2;
  doc.save();
  doc.roundedRect(rx, ry, w, h, 1.5).lineWidth(0.9).strokeColor(color).stroke();
  doc.lineWidth(0.8).strokeColor(color)
    .moveTo(rx + 1, ry + 1)
    .lineTo(rx + w / 2, ry + h * 0.58)
    .lineTo(rx + w - 1, ry + 1)
    .stroke();
  doc.restore();
}

export function drawCalendarIcon(doc: PDFKit.PDFDocument, x: number, y: number, size = 10, color = "#ffffff") {
  const w = size * 0.88;
  const h = size * 0.88;
  const rx = x + (size - w) / 2;
  const ry = y + (size - h) / 2 + 0.8;
  doc.save();
  doc.roundedRect(rx, ry, w, h - 0.8, 1.5).lineWidth(0.9).strokeColor(color).stroke();
  doc.rect(rx, ry, w, 2.8).fillColor(color).fill();
  doc.lineWidth(0.9).strokeColor(color)
    .moveTo(rx + w * 0.28, ry - 1.2).lineTo(rx + w * 0.28, ry + 1)
    .moveTo(rx + w * 0.72, ry - 1.2).lineTo(rx + w * 0.72, ry + 1)
    .stroke();
  doc.fillColor(color)
    .circle(rx + w * 0.32, ry + 4.8, 0.6).fill()
    .circle(rx + w * 0.68, ry + 4.8, 0.6).fill()
    .circle(rx + w * 0.32, ry + 7.2, 0.6).fill()
    .circle(rx + w * 0.68, ry + 7.2, 0.6).fill();
  doc.restore();
}

export function drawReligionIcon(doc: PDFKit.PDFDocument, x: number, y: number, size = 10, color = "#ffffff") {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.46;
  const rInner = size * 0.16;
  doc.save();
  doc.fillColor(color);
  doc.moveTo(cx, cy - r)
    .lineTo(cx + rInner, cy - rInner)
    .lineTo(cx + r, cy)
    .lineTo(cx + rInner, cy + rInner)
    .lineTo(cx, cy + r)
    .lineTo(cx - rInner, cy + rInner)
    .lineTo(cx - r, cy)
    .lineTo(cx - rInner, cy - rInner)
    .closePath()
    .fill();
  doc.circle(cx, cy, rInner * 0.75).fillColor(color === "#ffffff" ? "#0d5fae" : "#ffffff").fill();
  doc.restore();
}

export function drawGenderIcon(doc: PDFKit.PDFDocument, x: number, y: number, size = 10, color = "#ffffff") {
  const cx = x + size / 2;
  const cy = y + size / 2;
  doc.save();
  doc.fillColor(color);
  doc.circle(cx, cy - size * 0.2, size * 0.22).fill();
  doc.path(`M ${cx - size * 0.38} ${cy + size * 0.44} C ${cx - size * 0.38} ${cy + size * 0.12} ${cx + size * 0.38} ${cy + size * 0.12} ${cx + size * 0.38} ${cy + size * 0.44} Z`).fill();
  doc.restore();
}

export function drawGradCapIcon(doc: PDFKit.PDFDocument, x: number, y: number, size = 11, color = "#0d5fae") {
  const cx = x + size / 2;
  const topY = y + size * 0.12;
  doc.save();
  doc.fillColor(color).strokeColor(color);
  doc.moveTo(cx, topY)
    .lineTo(x + size * 0.96, topY + size * 0.28)
    .lineTo(cx, topY + size * 0.56)
    .lineTo(x + size * 0.04, topY + size * 0.28)
    .closePath()
    .fill();
  doc.moveTo(x + size * 0.24, topY + size * 0.42)
    .lineTo(x + size * 0.24, topY + size * 0.72)
    .bezierCurveTo(x + size * 0.24, topY + size * 0.88, x + size * 0.76, topY + size * 0.88, x + size * 0.76, topY + size * 0.72)
    .lineTo(x + size * 0.76, topY + size * 0.42)
    .closePath()
    .fill();
  doc.lineWidth(0.8)
    .moveTo(x + size * 0.88, topY + size * 0.3)
    .lineTo(x + size * 0.94, topY + size * 0.76)
    .stroke();
  doc.circle(x + size * 0.94, topY + size * 0.82, 0.7).fill();
  doc.restore();
}

export function drawSummaryIcon(doc: PDFKit.PDFDocument, x: number, y: number, size = 11, color = "#0d5fae") {
  const w = size * 0.76;
  const h = size * 0.94;
  const rx = x + (size - w) / 2;
  const ry = y + (size - h) / 2;
  doc.save();
  doc.roundedRect(rx, ry, w, h, 1.5).lineWidth(0.9).strokeColor(color).stroke();
  doc.lineWidth(0.8).strokeColor(color)
    .moveTo(rx + 2, ry + 2.8).lineTo(rx + w - 2, ry + 2.8).stroke()
    .moveTo(rx + 2, ry + 5.2).lineTo(rx + w - 2, ry + 5.2).stroke()
    .moveTo(rx + 2, ry + 7.6).lineTo(rx + w * 0.62, ry + 7.6).stroke();
  doc.restore();
}

export function drawBriefcaseIcon(doc: PDFKit.PDFDocument, x: number, y: number, size = 11, color = "#0d5fae") {
  const w = size * 0.92;
  const h = size * 0.68;
  const rx = x + (size - w) / 2;
  const ry = y + size * 0.26;
  doc.save();
  doc.roundedRect(rx, ry, w, h, 1.5).lineWidth(0.9).strokeColor(color).stroke();
  doc.roundedRect(rx + w * 0.32, ry - 2.2, w * 0.36, 2.2, 0.8).lineWidth(0.8).strokeColor(color).stroke();
  doc.lineWidth(0.7).strokeColor(color).moveTo(rx, ry + h * 0.42).lineTo(rx + w, ry + h * 0.42).stroke();
  doc.fillColor(color).rect(rx + w / 2 - 1, ry + h * 0.35, 2, 2).fill();
  doc.restore();
}

export function drawStarMedalIcon(doc: PDFKit.PDFDocument, x: number, y: number, size = 11, color = "#0d5fae") {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const outerR = size * 0.48;
  const innerR = size * 0.22;
  doc.save();
  doc.fillColor(color);
  doc.moveTo(cx, cy - outerR);
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i * 72 - 90) * (Math.PI / 180);
    const innerAngle = (i * 72 + 36 - 90) * (Math.PI / 180);
    doc.lineTo(cx + Math.cos(outerAngle) * outerR, cy + Math.sin(outerAngle) * outerR);
    doc.lineTo(cx + Math.cos(innerAngle) * innerR, cy + Math.sin(innerAngle) * innerR);
  }
  doc.closePath().fill();
  doc.restore();
}

export function drawAreasIcon(doc: PDFKit.PDFDocument, x: number, y: number, size = 11, color = "#0d5fae") {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.46;
  doc.save();
  doc.circle(cx, cy, r).lineWidth(0.9).strokeColor(color).stroke();
  doc.fillColor(color);
  doc.polygon([cx, cy - r * 0.75], [cx + r * 0.35, cy], [cx, cy + r * 0.75], [cx - r * 0.35, cy]).fill();
  doc.circle(cx, cy, 1.2).fillColor(color === "#ffffff" ? "#0d5fae" : "#ffffff").fill();
  doc.restore();
}

/** Draws an executive section header with a rounded icon pill and fine accent line */
export function drawSectionHeader(
  document: PDFKit.PDFDocument,
  title: string,
  iconDrawer: (doc: PDFKit.PDFDocument, x: number, y: number, size: number, color: string) => void,
  x: number,
  y: number,
  maxWidth: number
): number {
  const iconBoxSize = 17;
  const iconInnerSize = 9.5;
  document.save().roundedRect(x, y, iconBoxSize, iconBoxSize, 4).fill("#eff6ff").restore();
  iconDrawer(document, x + (iconBoxSize - iconInnerSize) / 2, y + (iconBoxSize - iconInnerSize) / 2, iconInnerSize, "#0d5fae");

  document.font("Bold").fontSize(8.4).fillColor("#0d5fae");
  const textX = x + iconBoxSize + 7;
  const textY = y + 4;
  document.text(title, textX, textY, { characterSpacing: 0.8, lineBreak: false });
  const titleWidth = document.widthOfString(title, { characterSpacing: 0.8 });

  const lineStartX = textX + titleWidth + 10;
  if (lineStartX < x + maxWidth) {
    document.save().lineWidth(0.5).strokeColor("#e2e8f0").moveTo(lineStartX, y + 8.5).lineTo(x + maxWidth, y + 8.5).stroke().restore();
  }

  return iconBoxSize + 7;
}

/** Draws a sidebar contact/personal item with a neat translucent vector icon pill */
export function drawSidebarContactItem(
  document: PDFKit.PDFDocument,
  iconDrawer: (doc: PDFKit.PDFDocument, x: number, y: number, size: number, color: string) => void,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  isPhone = false
): number {
  const iconBoxSize = 15;
  const iconInnerSize = 8.5;

  document.save().roundedRect(x, y + 1.5, iconBoxSize, iconBoxSize, 3.5).fill("#125494").restore();
  iconDrawer(document, x + (iconBoxSize - iconInnerSize) / 2, y + 1.5 + (iconBoxSize - iconInnerSize) / 2, iconInnerSize, "#bae6fd");

  const contentX = x + iconBoxSize + 7;
  const contentWidth = width - (iconBoxSize + 7);

  document.font("SemiBold").fontSize(6.8).fillColor("#cfe0f5").text(label, contentX, y, { width: contentWidth, lineBreak: false });

  let valueH = 0;
  if (isPhone) {
    document.font("SemiBold").fontSize(7.6).fillColor("#ffffff").text(value, contentX, y + 8.5, { width: contentWidth, lineBreak: false });
    valueH = 10;
  } else {
    valueH = writeCvText(document, value, "Regular", contentX, y + 8.5, contentWidth, { size: 7.4, color: "#ffffff", lineGap: 1 });
  }

  return Math.max(iconBoxSize + 4.5, 8.5 + valueH + 3.5);
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
  font: CvFont,
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
    const fontName = isBengali
      ? (font === "Regular" || font === "Medium" ? "Bengali" : "BengaliBold")
      : font;
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
      Author: "Connect Tutors",
      Subject: "Professional Tutor CV & Biodata",
    },
  });

  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    document.on("data", chunk => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    // Register vector fonts
    for (const [name, file] of Object.entries(cvFontFiles)) {
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

    // Dynamic Status Info (Verified / Approved Profile / Draft Profile / Under Review)
    const statusInfo = resolveTutorCvStatus(cv.profileStatus, cv.verified);

    // Status Badge
    const badgeWidth = 118;
    const badgeHeight = 20;
    const badgeX = photoCenterX - badgeWidth / 2;
    document.save();
    document.roundedRect(badgeX, leftY, badgeWidth, badgeHeight, 10).fill(statusInfo.badgeBg);
    document.font("Bold").fontSize(7.4).fillColor("#ffffff");
    document.text(statusInfo.badgeText, badgeX, leftY + 5.5, {
      width: badgeWidth,
      align: "center",
      characterSpacing: 0.6,
      lineBreak: false,
    });
    document.restore();

    leftY += badgeHeight + 8;

    // Tutor ID Tag
    const tutorIdDisplay = cv.tutorNumber ? `TUTOR ID: ${cv.tutorNumber}` : `ID: ${cv.tutorId}`;
    document.font("SemiBold").fontSize(8.5).fillColor("#dbeafe");
    document.text(tutorIdDisplay, leftPadding, leftY, { width: leftInnerWidth, align: "center", characterSpacing: 0.8 });
    leftY += 16;

    // Divider
    document.save().lineWidth(0.6).strokeColor("#2773be").moveTo(leftPadding, leftY).lineTo(leftColWidth - leftPadding, leftY).stroke().restore();
    leftY += 12;

    // Section: CONTACT & PERSONAL
    document.font("Bold").fontSize(7.8).fillColor("#ffffff").text("CONTACT & PERSONAL", leftPadding, leftY, { characterSpacing: 1.0 });
    leftY += 13;

    // 1. Location (Location, City, Country) with Vector Pin Icon
    if (cv.locationLabel?.trim()) {
      leftY += drawSidebarContactItem(document, drawPinIcon, "Location", cv.locationLabel.trim(), leftPadding, leftY, leftInnerWidth);
    }

    // 2. Phone with Vector Phone Icon
    if (cv.phone?.trim()) {
      const phoneDisplay = formatLetterPhone(cv.phone.trim());
      leftY += drawSidebarContactItem(document, drawPhoneIcon, "Phone Number", phoneDisplay, leftPadding, leftY, leftInnerWidth, true);
    }

    // 3. Email with Vector Envelope Icon
    if (cv.contactEmail?.trim()) {
      leftY += drawSidebarContactItem(document, drawMailIcon, "Email", cv.contactEmail.trim(), leftPadding, leftY, leftInnerWidth);
    }

    // 4. Date of Birth with Vector Calendar Icon
    if (cv.dateOfBirth?.trim()) {
      leftY += drawSidebarContactItem(document, drawCalendarIcon, "Date of Birth", cv.dateOfBirth.trim(), leftPadding, leftY, leftInnerWidth);
    }

    // 5. Religion with Vector Faith/Star Icon
    if (cv.religion?.trim()) {
      leftY += drawSidebarContactItem(document, drawReligionIcon, "Religion", cv.religion.trim(), leftPadding, leftY, leftInnerWidth);
    }

    // 6. Gender with Vector Identity Icon
    if (cv.gender?.trim()) {
      const genderDisplay = cv.gender.trim().charAt(0).toUpperCase() + cv.gender.trim().slice(1);
      leftY += drawSidebarContactItem(document, drawGenderIcon, "Gender", genderDisplay, leftPadding, leftY, leftInnerWidth);
    }

    // Divider
    document.save().lineWidth(0.6).strokeColor("#2773be").moveTo(leftPadding, leftY).lineTo(leftColWidth - leftPadding, leftY).stroke().restore();
    leftY += 11;

    // Section: SUBJECT EXPERTISE
    const subjects = (cv.subjects ?? []).filter(Boolean);
    if (subjects.length > 0) {
      document.font("Bold").fontSize(7.8).fillColor("#ffffff").text("SUBJECT EXPERTISE", leftPadding, leftY, { characterSpacing: 1.0 });
      leftY += 11;

      const subjectBadges = subjects.slice(0, 6);
      subjectBadges.forEach(subj => {
        document.save().roundedRect(leftPadding, leftY, leftInnerWidth, 15, 3.5).fill("#14589c").restore();
        writeCvText(document, subj, "SemiBold", leftPadding + 6, leftY + 3, leftInnerWidth - 12, { size: 7.2, color: "#ffffff" });
        leftY += 17.5;
      });
      leftY += 2;
      document.save().lineWidth(0.6).strokeColor("#2773be").moveTo(leftPadding, leftY).lineTo(leftColWidth - leftPadding, leftY).stroke().restore();
      leftY += 10;
    }

    // Section: PREFERRED CLASSES
    const levels = (cv.levels ?? []).filter(Boolean);
    if (levels.length > 0) {
      document.font("Bold").fontSize(7.8).fillColor("#ffffff").text("PREFERRED CLASSES", leftPadding, leftY, { characterSpacing: 1.0 });
      leftY += 10;
      const levelText = levels.slice(0, 5).join(", ");
      const h = writeCvText(document, levelText, "Regular", leftPadding, leftY, leftInnerWidth, { size: 7.5, color: "#ffffff", lineGap: 1.2 });
      leftY += Math.max(14, h) + 6;
      document.save().lineWidth(0.6).strokeColor("#2773be").moveTo(leftPadding, leftY).lineTo(leftColWidth - leftPadding, leftY).stroke().restore();
      leftY += 10;
    }

    // Section: TUITION DELIVERY
    const modes = (cv.tuitionTypes ?? []).filter(Boolean);
    if (modes.length > 0) {
      document.font("Bold").fontSize(7.8).fillColor("#ffffff").text("TUITION DELIVERY", leftPadding, leftY, { characterSpacing: 1.0 });
      leftY += 10;
      const modeLabels: Record<string, string> = { home: "Home Tuition", online: "Online Tuition", group: "Group Tuition", package: "Package Tuition" };
      const modeText = modes.map(m => modeLabels[m] ?? m).join(" & ");
      writeCvText(document, modeText, "Regular", leftPadding, leftY, leftInnerWidth, { size: 7.5, color: "#ffffff" });
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

    // Header Logo & Brand Watermark at top right: Logo + "Connect Tutors"
    const brandBlockWidth = 120;
    const brandBlockX = rightContentLeft + rightInnerWidth - brandBlockWidth;
    const brandY = rightY - 2;
    drawCradle(document, brandBlockX, brandY + 1, 22 / 48);
    document.font("Bold").fontSize(10).fillColor("#0d5fae").text("Connect Tutors", brandBlockX + 25, brandY, { lineBreak: false });
    document.font("SemiBold").fontSize(6.2).fillColor("#64748b").text("OFFICIAL TUTOR BIODATA", brandBlockX + 25, brandY + 12.5, { characterSpacing: 0.8, lineBreak: false });

    // Tutor Name
    writeCvText(document, cv.name, "Heavy", rightContentLeft, rightY, rightInnerWidth - 130, { size: 16.5, color: "#0f2137", lineGap: 1.5 });
    rightY += 23;

    // Headline / Tagline
    const headline = cv.headline?.trim() || [cv.highestEducation, cv.institution].filter(Boolean).join(" · ") || "";
    if (headline) {
      writeCvText(document, headline, "SemiBold", rightContentLeft, rightY, rightInnerWidth, { size: 9.2, color: "#0d5fae", lineGap: 1.2 });
      rightY += 17;
    }

    // Divider
    document.save().lineWidth(0.8).strokeColor("#e2e8f0").moveTo(rightContentLeft, rightY).lineTo(rightContentLeft + rightInnerWidth, rightY).stroke().restore();
    rightY += 12;

    // ------------------------------------------
    // SECTION: PROFESSIONAL SUMMARY (with vector icon header)
    // ------------------------------------------
    const summaryText = cv.aboutMe?.trim() || (cv.headline?.trim()
      ? `${cv.headline.trim()}. Dedicated educator committed to developing strong conceptual clarity, student engagement, and consistent academic progress.`
      : "Dedicated and passionate educator committed to delivering high-quality, personalized tutoring. Focused on strengthening fundamentals, problem-solving skills, and academic excellence.");

    rightY += drawSectionHeader(document, "PROFESSIONAL SUMMARY", drawSummaryIcon, rightContentLeft, rightY, rightInnerWidth);
    const bioHeight = writeCvText(document, summaryText, "Regular", rightContentLeft, rightY, rightInnerWidth, { size: 7.8, color: "#334155", lineGap: 2.0 });
    rightY += Math.min(48, Math.max(14, bioHeight)) + 9;

    // ------------------------------------------
    // SECTION: EDUCATIONAL BACKGROUND (Masters, Honours, HSC, SSC detailed with graduation icon header)
    // ------------------------------------------
    const rawEduList = (cv.educationRecords ?? []).filter(e => e.qualificationLevel || e.degreeExamTitle || e.instituteName);
    const sortedEduList = [...rawEduList].sort((a, b) => {
      const rankA = getEducationLevelRank(a.qualificationLevel || a.degreeExamTitle);
      const rankB = getEducationLevelRank(b.qualificationLevel || b.degreeExamTitle);
      if (rankA !== rankB) return rankA - rankB;
      return (b.passingYear ?? b.studyEndYear ?? 0) - (a.passingYear ?? a.studyEndYear ?? 0);
    });

    if (sortedEduList.length > 0) {
      rightY += drawSectionHeader(document, "EDUCATIONAL BACKGROUND", drawGradCapIcon, rightContentLeft, rightY, rightInnerWidth);

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

        // Mini graduation diamond bullet
        document.save().fillColor("#0d5fae").polygon(
          [rightContentLeft + 3, rightY + 2],
          [rightContentLeft + 5.5, rightY + 4.5],
          [rightContentLeft + 3, rightY + 7],
          [rightContentLeft + 0.5, rightY + 4.5]
        ).fill().restore();

        // Degree Title
        writeCvText(document, title, "SemiBold", rightContentLeft + 11, rightY, rightInnerWidth - 110, { size: 8.4, color: "#0f2137" });

        // Meta on the right (GPA / Year)
        if (metaRight) {
          document.font("SemiBold").fontSize(7.5).fillColor("#0d5fae");
          document.text(metaRight, rightContentLeft + 11, rightY, { width: rightInnerWidth - 11, align: "right", lineBreak: false });
        }
        rightY += 11;

        // Institute & Curriculum Details
        const instituteDetails = [edu.instituteName?.trim(), edu.curriculum?.trim()].filter(Boolean).join("  ·  ");
        if (instituteDetails) {
          writeCvText(document, instituteDetails, "Regular", rightContentLeft + 11, rightY, rightInnerWidth - 11, { size: 7.5, color: "#475569" });
          rightY += 10.5;
        }

        rightY += 2.5;
      });
      rightY += 7;
    } else {
      // Fallback only if highestEducation or institution exists
      const fallbackEdu = [cv.highestEducation, cv.institution, cv.education].filter(Boolean).join(" · ").trim();
      if (fallbackEdu) {
        rightY += drawSectionHeader(document, "EDUCATIONAL BACKGROUND", drawGradCapIcon, rightContentLeft, rightY, rightInnerWidth);
        writeCvText(document, fallbackEdu, "Regular", rightContentLeft, rightY, rightInnerWidth, { size: 7.8, color: "#334155", lineGap: 1.8 });
        rightY += 16;
      }
    }

    // ------------------------------------------
    // SECTION: TEACHING EXPERIENCE & METHODOLOGY (with briefcase icon header)
    // ------------------------------------------
    rightY += drawSectionHeader(document, "TEACHING EXPERIENCE & METHODOLOGY", drawBriefcaseIcon, rightContentLeft, rightY, rightInnerWidth);

    // Compact Stat boxes
    const expYears = cv.teachingExperienceYears ?? 2;
    const statBoxWidth = (rightInnerWidth - 10) / 2;
    const statBoxHeight = 31;

    // Box 1: Experience Years
    document.save().roundedRect(rightContentLeft, rightY, statBoxWidth, statBoxHeight, 4).fill("#f1f5f9").restore();
    document.font("Heavy").fontSize(11).fillColor("#0d5fae").text(`${expYears}+ Years`, rightContentLeft + 8, rightY + 3.5, { width: statBoxWidth - 16 });
    document.font("Medium").fontSize(7.2).fillColor("#475569").text("Tutoring Experience", rightContentLeft + 8, rightY + 17, { width: statBoxWidth - 16 });

    // Box 2: Verification / Profile Status (Dynamic)
    document.save().roundedRect(rightContentLeft + statBoxWidth + 10, rightY, statBoxWidth, statBoxHeight, 4).fill("#f1f5f9").restore();
    document.font("Heavy").fontSize(10.5).fillColor(statusInfo.statColor).text(statusInfo.statTitle, rightContentLeft + statBoxWidth + 18, rightY + 3.5, { width: statBoxWidth - 16 });
    document.font("Medium").fontSize(7.2).fillColor("#475569").text(statusInfo.statSubtitle, rightContentLeft + statBoxWidth + 18, rightY + 17, { width: statBoxWidth - 16 });

    rightY += statBoxHeight + 7;

    let hasCustomExpNote = false;

    // Teacher's own prior teaching experience note
    if (cv.priorTeachingExperience?.trim()) {
      hasCustomExpNote = true;
      document.font("SemiBold").fontSize(7.6).fillColor("#0f2137").text("Experience Highlights:", rightContentLeft, rightY);
      rightY += 9;
      const h = writeCvText(document, cv.priorTeachingExperience.trim(), "Regular", rightContentLeft, rightY, rightInnerWidth, { size: 7.5, color: "#334155", lineGap: 1.8 });
      rightY += Math.min(34, Math.max(12, h)) + 5;
    }

    // Teacher's own teaching approach / methodology
    if (cv.teachingApproach?.trim()) {
      hasCustomExpNote = true;
      document.font("SemiBold").fontSize(7.6).fillColor("#0f2137").text("Teaching Methodology & Approach:", rightContentLeft, rightY);
      rightY += 9;
      const h = writeCvText(document, cv.teachingApproach.trim(), "Regular", rightContentLeft, rightY, rightInnerWidth, { size: 7.5, color: "#334155", lineGap: 1.8 });
      rightY += Math.min(32, Math.max(12, h)) + 5;
    }

    // Teacher's special expertise
    if (cv.specialExpertise?.trim() && cv.specialExpertise.trim() !== cv.priorTeachingExperience?.trim()) {
      hasCustomExpNote = true;
      document.font("SemiBold").fontSize(7.6).fillColor("#0f2137").text("Special Expertise:", rightContentLeft, rightY);
      rightY += 9;
      const h = writeCvText(document, cv.specialExpertise.trim(), "Regular", rightContentLeft, rightY, rightInnerWidth, { size: 7.5, color: "#334155", lineGap: 1.8 });
      rightY += Math.min(26, Math.max(12, h)) + 5;
    }

    // If teacher has not entered custom notes, show structured teaching highlights
    if (!hasCustomExpNote) {
      const fallbackExp = "Experienced in academic tutoring, personalized lesson planning, syllabus coverage, and preparing students for school, board, and admission examinations with regular assessments and progress tracking.";
      const h = writeCvText(document, fallbackExp, "Regular", rightContentLeft, rightY, rightInnerWidth, { size: 7.5, color: "#334155", lineGap: 1.8 });
      rightY += Math.min(32, Math.max(12, h)) + 5;
    }

    rightY += 4;

    // ------------------------------------------
    // SECTION: WHY CHOOSE ME (with star icon header)
    // ------------------------------------------
    rightY += drawSectionHeader(document, "WHY CHOOSE ME", drawStarMedalIcon, rightContentLeft, rightY, rightInnerWidth);

    const whyText = cv.whyChooseMe?.trim() || "• Conceptual and student-focused teaching methodology.\n• Regular practice tests, homework tracking, and performance evaluation.\n• Patient mentorship, doubt clearance, and clear communication with guardians.";

    const whyHeight = writeCvText(document, whyText, "Regular", rightContentLeft, rightY, rightInnerWidth, { size: 7.5, color: "#334155", lineGap: 1.8 });
    rightY += Math.min(36, Math.max(14, whyHeight)) + 7;

    // ------------------------------------------
    // SECTION: PREFERRED TUITION AREAS (Only if filled, with compass icon header)
    // ------------------------------------------
    const areas = (cv.preferredLocations ?? []).filter(Boolean);
    if (areas.length > 0 && rightY < footerTop - 40) {
      rightY += drawSectionHeader(document, "PREFERRED TUITION AREAS", drawAreasIcon, rightContentLeft, rightY, rightInnerWidth);
      const areaString = areas.slice(0, 10).join("  •  ");
      writeCvText(document, areaString, "Regular", rightContentLeft, rightY, rightInnerWidth, { size: 7.5, color: "#1e293b", lineGap: 1.4 });
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

    document.font("Heavy").fontSize(8.5).fillColor("#0f2137").text("CONNECT TUTORS", sealTextLeft, footerTop + 12, { width: sealTextWidth });
    document.font("Bold").fontSize(7.2).fillColor(statusInfo.statColor).text(statusInfo.sealStatus, sealTextLeft, footerTop + 22.5, { width: sealTextWidth });
    document.font("Regular").fontSize(6.8).fillColor("#64748b").text(`Scan QR code or visit ${SITE_ADDRESS} to verify background, certificates and reviews.`, sealTextLeft, footerTop + 33, { width: sealTextWidth, lineGap: 1.4 });

    document.end();
  });
}

