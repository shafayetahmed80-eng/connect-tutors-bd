import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import PDFDocument from "pdfkit";
import {
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

const cvFontBuffers = new Map<string, Buffer>();

/** Loads the CV fonts into a document; the files are read once and shared by every document made after. */
function registerCvFonts(document: PDFKit.PDFDocument) {
  for (const [name, file] of Object.entries(cvFontFiles)) {
    let buffer = cvFontBuffers.get(name);
    if (!buffer) {
      buffer = readFileSync(file);
      cvFontBuffers.set(name, buffer);
    }
    document.registerFont(name, buffer);
  }
}

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
  /** At least one of the Tutor's tuitions is Confirmed (the platform's Verified rule). */
  isVerified: boolean;
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
      isVerified: true,
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
      isVerified: false,
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
      isVerified: false,
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
    isVerified: false,
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

/**
 * Renders multi-script text with fallback to Noto Sans Bengali when Bengali
 * characters are present, and returns the height it really took (wrapped lines
 * and Bengali runs included) - the next block starts below that, never at a
 * guessed height.
 */
export function writeCvText(
  document: PDFKit.PDFDocument,
  text: string,
  font: CvFont,
  x: number,
  y: number,
  width: number,
  options?: { size?: number; color?: string; align?: "left" | "center" | "right"; lineGap?: number },
): number {
  const size = options?.size ?? 9;
  const lineGap = options?.lineGap ?? 1.5;
  const color = options?.color ?? "#0f2137";
  const align = options?.align ?? "left";

  // Each line of the text is written on its own: a line end that fell between a Bengali and an English run
  // would otherwise be swallowed and two lines would run together.
  let cursorY = y;
  for (const line of text.split("\n")) {
    if (!line.trim()) {
      document.font(font).fontSize(size);
      cursorY += document.heightOfString("A", { width, lineGap });
      continue;
    }
    const runs = splitScriptRuns(line);
    document.fontSize(size).fillColor(color);
    runs.forEach((run, index) => {
      const fontName = run.bengali
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
        document.text(run.text, x, cursorY, textOpts);
      } else {
        document.text(run.text, textOpts);
      }
    });
    cursorY = document.y;
  }

  return Math.max(0, cursorY - y);
}

/** How tall `text` would be at this width, measured without drawing it. */
export function measureCvText(
  document: PDFKit.PDFDocument,
  text: string,
  font: CvFont,
  width: number,
  size: number,
  lineGap = 1.5,
): number {
  if (!text) return 0;
  let total = 0;
  for (const line of text.split("\n")) {
    if (!line.trim()) {
      document.font(font).fontSize(size);
      total += document.heightOfString("A", { width, lineGap });
      continue;
    }
    const fonts = new Set<string>();
    for (const run of splitScriptRuns(line)) {
      fonts.add(run.bengali ? (font === "Regular" || font === "Medium" ? "Bengali" : "BengaliBold") : font);
    }
    let height = 0;
    fonts.forEach(name => {
      document.font(name).fontSize(size);
      height = Math.max(height, document.heightOfString(line, { width, lineGap }));
    });
    total += height;
  }
  return total;
}

/**
 * A Tutor's own text, tidied for the page: Windows line ends become one kind,
 * a star or dash bullet becomes a dot, trailing spaces go, and a run of blank
 * lines becomes one.
 */
export function tidyCvText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(line => line.replace(/\s+$/g, "").replace(/^(\s*)[*-]\s+/, "$1• "))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Cuts `text` after the most it can hold in `maxHeight` - at a space or a line
 * end, not in the middle of a word - and hands back the rest, so a long text
 * can carry on at the top of the next page.
 */
export function splitCvTextToHeight(
  document: PDFKit.PDFDocument,
  text: string,
  font: CvFont,
  width: number,
  size: number,
  lineGap: number,
  maxHeight: number,
): { head: string; tail: string } {
  if (measureCvText(document, text, font, width, size, lineGap) <= maxHeight) return { head: text, tail: "" };
  let low = 0;
  let high = text.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (measureCvText(document, text.slice(0, middle).trimEnd(), font, width, size, lineGap) <= maxHeight) low = middle;
    else high = middle - 1;
  }
  let cut = low;
  if (cut < text.length) {
    const boundary = Math.max(text.lastIndexOf("\n", cut), text.lastIndexOf(" ", cut));
    if (boundary > 0 && boundary > cut - 80) cut = boundary;
  }
  return { head: text.slice(0, cut).trimEnd(), tail: text.slice(cut).trimStart() };
}

/** One line of text that must stay one line: it shrinks a little, then ends in an ellipsis. */
function fitCvLine(
  document: PDFKit.PDFDocument,
  text: string,
  font: CvFont,
  width: number,
  startSize: number,
  minSize: number,
): { text: string; size: number } {
  let size = startSize;
  const oneLine = (candidate: string, candidateSize: number) => measureCvText(document, candidate, font, width, candidateSize, 0) <= candidateSize * 1.6;
  while (size > minSize && !oneLine(text, size)) size = Math.max(minSize, size - 0.4);
  if (oneLine(text, size)) return { text, size };
  let kept = text;
  while (kept.length > 1 && !oneLine(`${kept.trimEnd()}…`, size)) kept = kept.slice(0, -1);
  return { text: `${kept.trimEnd()}…`, size };
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

// ==========================================
// PAGE GEOMETRY (A4, in points)
// ==========================================
const CV_PAGE = { width: 595.28, height: 841.89 } as const;
const CV_SIDEBAR_WIDTH = 195;
const CV_SIDEBAR_PADDING = 18;
const CV_SIDEBAR_INNER = CV_SIDEBAR_WIDTH - CV_SIDEBAR_PADDING * 2;
const CV_FOOTER_HEIGHT = 84;
const CV_FOOTER_TOP = CV_PAGE.height - CV_FOOTER_HEIGHT;
const CV_CONTENT_LEFT = CV_SIDEBAR_WIDTH + 24;
const CV_CONTENT_WIDTH = CV_PAGE.width - CV_SIDEBAR_WIDTH - 48;
const CV_FIRST_TOP = 28;
/** The lowest a block of the right column may end: a little above the footer rule. */
const CV_CONTENT_LIMIT = CV_FOOTER_TOP - 12;

/** The blue sidebar and the thin bar above the right column, drawn first on every page. */
function drawCvPageShell(document: PDFKit.PDFDocument) {
  const sidebarGradient = document.linearGradient(0, 0, 0, CV_PAGE.height);
  sidebarGradient.stop(0, "#0d5fae");
  sidebarGradient.stop(1, "#0a4c8c");
  document.save();
  document.rect(0, 0, CV_SIDEBAR_WIDTH, CV_PAGE.height).fill(sidebarGradient);
  document.restore();

  document.save();
  document.rect(CV_SIDEBAR_WIDTH, 0, CV_PAGE.width - CV_SIDEBAR_WIDTH, 5).fill("#0d5fae");
  document.restore();
}

/** Photo (or monogram), status badge and Tutor ID at the top of the sidebar; returns where the sidebar goes on. */
function drawCvSidebarIdentity(document: PDFKit.PDFDocument, cv: TutorCvDocument, statusInfo: TutorCvStatusInfo): number {
  let leftY = 30;
  const photoDiameter = 76;
  const photoRadius = photoDiameter / 2;
  const photoCenterX = CV_SIDEBAR_PADDING + CV_SIDEBAR_INNER / 2;
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
      .map(p => Array.from(p)[0]?.toUpperCase() ?? "")
      .join("") || "T";
    document.font(/[\u0980-\u09FF]/.test(initials) ? "BengaliBold" : "Heavy").fontSize(24).fillColor("#ffffff");
    document.text(initials, photoCenterX - 30, photoCenterY - 13, { width: 60, align: "center", lineBreak: false });
  }

  leftY += photoDiameter + 10;

  // Status Badge
  const badgeWidth = 118;
  const badgeHeight = 20;
  const badgeX = photoCenterX - badgeWidth / 2;
  document.save();
  document.roundedRect(badgeX, leftY, badgeWidth, badgeHeight, 10).fill(statusInfo.badgeBg);
  document.font("Bold").fontSize(7.4).fillColor("#ffffff");
  const badgeHasCheck = statusInfo.badgeText.startsWith("✓");
  const badgeLabel = statusInfo.badgeText.replace(/^✓\s*/, "");
  if (badgeHasCheck) {
    const labelWidth = document.widthOfString(badgeLabel, { characterSpacing: 0.6 });
    const markSize = 8;
    const startX = badgeX + (badgeWidth - (markSize + 5 + labelWidth)) / 2;
    drawCheckMark(document, startX, leftY + (badgeHeight - markSize) / 2, markSize, "#ffffff");
    document.text(badgeLabel, startX + markSize + 5, leftY + 5.5, { characterSpacing: 0.6, lineBreak: false });
  } else {
    document.text(badgeLabel, badgeX, leftY + 5.5, {
      width: badgeWidth,
      align: "center",
      characterSpacing: 0.6,
      lineBreak: false,
    });
  }
  document.restore();

  leftY += badgeHeight + 8;

  // Tutor ID Tag
  const tutorIdDisplay = cv.tutorNumber ? `TUTOR ID: ${cv.tutorNumber}` : `ID: ${cv.tutorId}`;
  document.font("SemiBold").fontSize(8.5).fillColor("#dbeafe");
  document.text(tutorIdDisplay, CV_SIDEBAR_PADDING, leftY, { width: CV_SIDEBAR_INNER, align: "center", characterSpacing: 0.8 });
  leftY += 16;

  // Divider
  document.save().lineWidth(0.6).strokeColor("#2773be").moveTo(CV_SIDEBAR_PADDING, leftY).lineTo(CV_SIDEBAR_WIDTH - CV_SIDEBAR_PADDING, leftY).stroke().restore();
  return leftY + 12;
}

/** Contact, subjects, classes, delivery and rating: the rest of the first page's sidebar. */
function drawCvSidebarDetails(document: PDFKit.PDFDocument, cv: TutorCvDocument, startY: number) {
  const leftPadding = CV_SIDEBAR_PADDING;
  const leftInnerWidth = CV_SIDEBAR_INNER;
  const leftColWidth = CV_SIDEBAR_WIDTH;
  let leftY = startY;

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
      // A long subject name shrinks to fit the badge instead of wrapping over the next one.
      const fitted = fitCvLine(document, subj, "SemiBold", leftInnerWidth - 12, 7.2, 5.6);
      writeCvText(document, fitted.text, "SemiBold", leftPadding + 6, leftY + 3, leftInnerWidth - 12, { size: fitted.size, color: "#ffffff" });
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
  }

  // Rating Badge at bottom of left column
  if (cv.ratingAverage && cv.ratingAverage > 0) {
    const bottomRatingY = CV_PAGE.height - 40;
    document.save().roundedRect(leftPadding, bottomRatingY, leftInnerWidth, 22, 5).fill("#073b6e").restore();
    const filled = Math.round(cv.ratingAverage);
    const averageText = cv.ratingAverage.toFixed(1);
    const reviewText = cv.reviewCount ? `(${cv.reviewCount} reviews)` : "";
    const starSize = 9;
    const starStep = starSize + 1.5;
    document.font("Bold").fontSize(8.5);
    const averageWidth = document.widthOfString(averageText);
    const reviewWidth = reviewText ? document.widthOfString(reviewText) : 0;
    const rowWidth = averageWidth + 6 + starStep * 5 + (reviewText ? 4 + reviewWidth : 0);
    let rowX = leftPadding + (leftInnerWidth - rowWidth) / 2;
    document.fillColor("#fbbf24").text(averageText, rowX, bottomRatingY + 5.5, { lineBreak: false });
    rowX += averageWidth + 6;
    for (let star = 0; star < 5; star += 1) {
      drawStarMedalIcon(document, rowX + star * starStep, bottomRatingY + (22 - starSize) / 2, starSize, star < filled ? "#fbbf24" : "#4d78a8");
    }
    if (reviewText) {
      document.font("Bold").fontSize(8.5).fillColor("#fbbf24").text(reviewText, rowX + starStep * 5 + 4, bottomRatingY + 5.5, { lineBreak: false });
    }
  }
}

/** A check mark drawn as lines: the CV font has no check-mark glyph. */
function drawCheckMark(document: PDFKit.PDFDocument, x: number, y: number, size: number, color: string) {
  document.save().lineWidth(size * 0.17).lineCap("round").lineJoin("round").strokeColor(color)
    .moveTo(x + size * 0.12, y + size * 0.55)
    .lineTo(x + size * 0.4, y + size * 0.82)
    .lineTo(x + size * 0.88, y + size * 0.2)
    .stroke()
    .restore();
}

/** Logo and "Connect Tutors" at the top right of the right column. */
function drawCvBrandMark(document: PDFKit.PDFDocument, brandY: number) {
  const brandBlockWidth = 120;
  const brandBlockX = CV_CONTENT_LEFT + CV_CONTENT_WIDTH - brandBlockWidth;
  drawCradle(document, brandBlockX, brandY + 1, 22 / 48);
  document.font("Bold").fontSize(10).fillColor("#0d5fae").text("Connect Tutors", brandBlockX + 25, brandY, { lineBreak: false });
  document.font("SemiBold").fontSize(6.2).fillColor("#64748b").text("OFFICIAL TUTOR BIODATA", brandBlockX + 25, brandY + 12.5, { characterSpacing: 0.8, lineBreak: false });
}

/** What the right column of a second page starts with: the brand mark, the Tutor's name, a rule. Returns where the content begins. */
function drawCvContinuationHeader(document: PDFKit.PDFDocument, cv: TutorCvDocument): number {
  drawCvBrandMark(document, CV_FIRST_TOP - 2);
  const nameHeight = writeCvText(document, cv.name, "Heavy", CV_CONTENT_LEFT, CV_FIRST_TOP, CV_CONTENT_WIDTH - 130, { size: 12.5, color: "#0f2137", lineGap: 1.2 });
  const ruleY = Math.max(CV_FIRST_TOP + nameHeight + 8, 54);
  document.save().lineWidth(0.8).strokeColor("#e2e8f0").moveTo(CV_CONTENT_LEFT, ruleY).lineTo(CV_CONTENT_LEFT + CV_CONTENT_WIDTH, ruleY).stroke().restore();
  return ruleY + 12;
}

type CvLayoutOptions = {
  /** 1 = the type sizes the design was drawn at; a little less pulls a CV that spills a few lines back onto one page. */
  scale: number;
  /** Starts the next page and returns where its content begins. Null measures only: nothing ever breaks to a new page. */
  newPage: (() => number) | null;
};

/**
 * The right column, from the name to the last section. Every block starts
 * below what the one before really took, and a long text carries on at the top
 * of the next page; a section the Tutor left empty is simply not there.
 * Returns where the content ended on its last page.
 */
function drawCvRightColumn(
  document: PDFKit.PDFDocument,
  cv: TutorCvDocument,
  statusInfo: TutorCvStatusInfo,
  options: CvLayoutOptions,
): { endY: number } {
  const left = CV_CONTENT_LEFT;
  const width = CV_CONTENT_WIDTH;
  const k = options.scale;
  const breakable = options.newPage !== null;
  let y = CV_FIRST_TOP;

  const nextPage = () => {
    y = options.newPage ? options.newPage() : y;
  };
  /** Moves to the next page when `needed` points do not fit under what is drawn. */
  const room = (needed: number) => {
    if (breakable && y + needed > CV_CONTENT_LIMIT) nextPage();
  };
  const lineHeight = (size: number, gap: number) => measureCvText(document, "Ag", "Regular", width, size, gap);

  /** Writes a long text, carrying on at the top of the next page where it runs out of room. */
  const flow = (text: string, x: number, w: number, size: number, gap: number, color: string) => {
    let rest = text;
    let loops = 0;
    while (rest && loops < 12) {
      loops += 1;
      const available = CV_CONTENT_LIMIT - y;
      if (!breakable || measureCvText(document, rest, "Regular", w, size, gap) <= available) {
        y += writeCvText(document, rest, "Regular", x, y, w, { size, color, lineGap: gap });
        return;
      }
      const { head, tail } = available >= lineHeight(size, gap) * 2
        ? splitCvTextToHeight(document, rest, "Regular", w, size, gap, available)
        : { head: "", tail: rest };
      if (head) y += writeCvText(document, head, "Regular", x, y, w, { size, color, lineGap: gap });
      nextPage();
      rest = tail;
    }
  };

  const section = (title: string, icon: (doc: PDFKit.PDFDocument, x: number, y: number, size: number, color: string) => void) => {
    // A heading never ends a page on its own: it needs a couple of lines under it.
    room(24 + 26);
    y += drawSectionHeader(document, title, icon, left, y, width);
  };

  // Header: brand mark, name, headline
  drawCvBrandMark(document, y - 2);

  let nameSize = 16.5;
  if (measureCvText(document, cv.name, "Heavy", width - 130, nameSize, 1.5) > nameSize * 3.2) nameSize = 13.5;
  const nameHeight = writeCvText(document, cv.name, "Heavy", left, y, width - 130, { size: nameSize, color: "#0f2137", lineGap: 1.5 });
  y += Math.max(23, nameHeight + 2);

  const headline = cv.headline?.trim() || [cv.highestEducation, cv.institution].filter(Boolean).join(" · ") || "";
  if (headline) {
    const headlineHeight = writeCvText(document, headline, "SemiBold", left, y, width, { size: 9.2, color: "#0d5fae", lineGap: 1.2 });
    y += headlineHeight + 4;
  }

  document.save().lineWidth(0.8).strokeColor("#e2e8f0").moveTo(left, y).lineTo(left + width, y).stroke().restore();
  y += 12;

  // PROFESSIONAL SUMMARY - only what the Tutor wrote about themselves
  const summaryText = tidyCvText(cv.aboutMe);
  if (summaryText) {
    section("PROFESSIONAL SUMMARY", drawSummaryIcon);
    flow(summaryText, left, width, 7.8 * k, 2.0 * k, "#334155");
    y += 9;
  }

  // EDUCATIONAL BACKGROUND
  const rawEduList = (cv.educationRecords ?? []).filter(e => e.qualificationLevel || e.degreeExamTitle || e.instituteName);
  const sortedEduList = [...rawEduList].sort((a, b) => {
    const rankA = getEducationLevelRank(a.qualificationLevel || a.degreeExamTitle);
    const rankB = getEducationLevelRank(b.qualificationLevel || b.degreeExamTitle);
    if (rankA !== rankB) return rankA - rankB;
    return (b.passingYear ?? b.studyEndYear ?? 0) - (a.passingYear ?? a.studyEndYear ?? 0);
  });

  if (sortedEduList.length > 0) {
    section("EDUCATIONAL BACKGROUND", drawGradCapIcon);

    // Up to 4 qualification levels (Masters, Honours, HSC, SSC)
    sortedEduList.slice(0, 4).forEach(edu => {
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
      const instituteDetails = [edu.instituteName?.trim(), edu.curriculum?.trim()].filter(Boolean).join("  ·  ");

      // The title takes what the right-hand GPA and year leave, and wraps to a second line when it must.
      document.font("SemiBold").fontSize(7.5);
      const metaWidth = metaRight ? document.widthOfString(metaRight) : 0;
      const titleWidth = width - 11 - (metaWidth ? metaWidth + 14 : 0);
      const titleHeight = measureCvText(document, title, "SemiBold", titleWidth, 8.4, 1.5);
      const instituteHeight = instituteDetails ? measureCvText(document, instituteDetails, "Regular", width - 11, 7.5, 1.5) : 0;
      room(Math.max(11, titleHeight) + (instituteHeight ? Math.max(10.5, instituteHeight) : 0) + 2.5);

      // Mini graduation diamond bullet
      document.save().fillColor("#0d5fae").polygon(
        [left + 3, y + 2],
        [left + 5.5, y + 4.5],
        [left + 3, y + 7],
        [left + 0.5, y + 4.5],
      ).fill().restore();

      const drawnTitle = writeCvText(document, title, "SemiBold", left + 11, y, titleWidth, { size: 8.4, color: "#0f2137" });

      // Meta on the right (GPA / Year)
      if (metaRight) {
        document.font("SemiBold").fontSize(7.5).fillColor("#0d5fae");
        document.text(metaRight, left + 11, y, { width: width - 11, align: "right", lineBreak: false });
      }
      y += Math.max(11, drawnTitle);

      if (instituteDetails) {
        y += Math.max(10.5, writeCvText(document, instituteDetails, "Regular", left + 11, y, width - 11, { size: 7.5, color: "#475569" }));
      }

      y += 2.5;
    });
    y += 7;
  } else {
    const fallbackEdu = [cv.highestEducation, cv.institution, cv.education].filter(Boolean).join(" · ").trim();
    if (fallbackEdu) {
      section("EDUCATIONAL BACKGROUND", drawGradCapIcon);
      flow(fallbackEdu, left, width, 7.8 * k, 1.8 * k, "#334155");
      y += 8;
    }
  }

  // TEACHING EXPERIENCE & METHODOLOGY - the years if the Tutor gave them, and each note the Tutor wrote
  const years = cv.teachingExperienceYears && cv.teachingExperienceYears > 0 ? cv.teachingExperienceYears : null;
  const notes: Array<{ label: string; text: string }> = [];
  const experienceNote = tidyCvText(cv.priorTeachingExperience);
  const approachNote = tidyCvText(cv.teachingApproach);
  const expertiseNote = tidyCvText(cv.specialExpertise);
  if (experienceNote) notes.push({ label: "Experience Highlights:", text: experienceNote });
  if (approachNote) notes.push({ label: "Teaching Methodology & Approach:", text: approachNote });
  if (expertiseNote && expertiseNote !== experienceNote) notes.push({ label: "Special Expertise:", text: expertiseNote });

  const statBoxHeight = 31;
  const drawStatBoxes = (boxes: Array<{ title: string; subtitle: string; color: string; size: number }>) => {
    if (boxes.length === 0) return;
    room(statBoxHeight + 7);
    const statBoxWidth = (width - 10 * (boxes.length - 1)) / boxes.length;
    boxes.forEach((box, index) => {
      const boxX = left + index * (statBoxWidth + 10);
      document.save().roundedRect(boxX, y, statBoxWidth, statBoxHeight, 4).fill("#f1f5f9").restore();
      document.font("Heavy").fontSize(box.size).fillColor(box.color).text(box.title, boxX + 8, y + 3.5, { width: statBoxWidth - 16 });
      document.font("Medium").fontSize(7.2).fillColor("#475569").text(box.subtitle, boxX + 8, y + 17, { width: statBoxWidth - 16 });
    });
    y += statBoxHeight + 7;
  };
  // "100% Verified" is said only of a verified Tutor - one with at least one Confirmed tuition; no other status gets a box.
  const verifiedBoxes = statusInfo.isVerified ? [{ title: statusInfo.statTitle, subtitle: statusInfo.statSubtitle, color: statusInfo.statColor, size: 10.5 }] : [];

  if (years !== null || notes.length > 0) {
    section("TEACHING EXPERIENCE & METHODOLOGY", drawBriefcaseIcon);

    drawStatBoxes([
      ...(years !== null ? [{ title: `${years}+ Years`, subtitle: "Tutoring Experience", color: "#0d5fae", size: 11 }] : []),
      ...verifiedBoxes,
    ]);

    for (const note of notes) {
      // The label stays with the first lines of its text.
      room(9 + lineHeight(7.5 * k, 1.8 * k) * 2);
      document.font("SemiBold").fontSize(7.6).fillColor("#0f2137").text(note.label, left, y);
      y += 9;
      flow(note.text, left, width, 7.5 * k, 1.8 * k, "#334155");
      y += 5;
    }
    y += 4;
  } else if (statusInfo.isVerified) {
    // Nothing to say about experience, but a verified Tutor is still shown to be verified.
    drawStatBoxes(verifiedBoxes);
  }

  // WHY CHOOSE ME - only if the Tutor wrote it
  const whyText = tidyCvText(cv.whyChooseMe);
  if (whyText) {
    section("WHY CHOOSE ME", drawStarMedalIcon);
    flow(whyText, left, width, 7.5 * k, 1.8 * k, "#334155");
    y += 7;
  }

  // PREFERRED TUITION AREAS
  const areas = (cv.preferredLocations ?? []).filter(Boolean);
  if (areas.length > 0) {
    section("PREFERRED TUITION AREAS", drawAreasIcon);
    flow(areas.slice(0, 10).join("  •  "), left, width, 7.5 * k, 1.4 * k, "#1e293b");
    y += 6;
  }

  return { endY: y };
}

/** The seal, the status of the profile and, on a CV of several pages, the page number. */
function drawCvFooter(document: PDFKit.PDFDocument, statusInfo: TutorCvStatusInfo, page: number, pageCount: number) {
  const left = CV_CONTENT_LEFT;
  const width = CV_CONTENT_WIDTH;
  const footerTop = CV_FOOTER_TOP;

  document.save().lineWidth(0.8).strokeColor("#cbd5e1").moveTo(left, footerTop).lineTo(left + width, footerTop).stroke().restore();

  // Authority Seal
  const sealRadius = 21;
  const sealCenterX = left + sealRadius;
  const sealCenterY = footerTop + 12 + sealRadius;

  document.save().lineWidth(1.2).strokeColor("#0d5fae").circle(sealCenterX, sealCenterY, sealRadius).stroke().restore();
  document.save().lineWidth(0.6).dash(2, { space: 2 }).strokeColor("#0d5fae").circle(sealCenterX, sealCenterY, sealRadius - 3.5).stroke().undash().restore();
  const cradleScale = 22 / 48;
  drawCradle(document, sealCenterX - 24 * cradleScale, sealCenterY - 24 * cradleScale, cradleScale, 1.2);

  const sealTextLeft = sealCenterX + sealRadius + 9;
  const sealTextWidth = left + width - sealTextLeft;

  document.font("Heavy").fontSize(8.5).fillColor("#0f2137").text("CONNECT TUTORS", sealTextLeft, footerTop + 23, { width: sealTextWidth, lineBreak: false });
  document.font("Bold").fontSize(7.2).fillColor(statusInfo.statColor).text(statusInfo.sealStatus, sealTextLeft, footerTop + 34.5, { width: sealTextWidth, lineBreak: false });
  if (pageCount > 1) {
    document.font("SemiBold").fontSize(7.2).fillColor("#64748b").text(`Page ${page} of ${pageCount}`, left, footerTop + 29, { width, align: "right", lineBreak: false });
  }
}

/** A throwaway document, tall enough that nothing in it breaks to a new page, to measure a layout before it is drawn for real. */
function createCvScratchDocument(): PDFKit.PDFDocument {
  const scratch = new PDFDocument({ size: [CV_PAGE.width, 8000], margins: { top: 0, bottom: 0, left: 0, right: 0 } });
  scratch.on("data", () => {});
  registerCvFonts(scratch);
  return scratch;
}

/**
 * Builds the Tutor CV & Biodata PDF on A4: one page when it all fits, a second
 * page - the same sidebar, the same footer - when it does not. Nothing is cut
 * short, and anything the Tutor left empty is not mentioned.
 * Exact A4 dimensions: 595.28 x 841.89 points.
 */
export async function renderTutorCvPdf(cv: TutorCvDocument): Promise<Buffer> {
  const document = new PDFDocument({
    size: "A4",
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    bufferPages: true,
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

    registerCvFonts(document);
    const statusInfo = resolveTutorCvStatus(cv.profileStatus, cv.verified);

    // A CV that spills a few lines past the first page is drawn a touch smaller instead of leaving them alone on a second one.
    let scale = 1;
    const scratch = createCvScratchDocument();
    const natural = drawCvRightColumn(scratch, cv, statusInfo, { scale: 1, newPage: null }).endY;
    if (natural > CV_CONTENT_LIMIT && natural - CV_CONTENT_LIMIT < (CV_CONTENT_LIMIT - CV_FIRST_TOP) * 0.14) {
      const smaller = drawCvRightColumn(scratch, cv, statusInfo, { scale: 0.92, newPage: null }).endY;
      if (smaller <= CV_CONTENT_LIMIT) scale = 0.92;
    }
    scratch.end();

    // Page 1: the sidebar, then the right column
    drawCvPageShell(document);
    const sidebarY = drawCvSidebarIdentity(document, cv, statusInfo);
    drawCvSidebarDetails(document, cv, sidebarY);

    drawCvRightColumn(document, cv, statusInfo, {
      scale,
      newPage: () => {
        document.addPage();
        drawCvPageShell(document);
        drawCvSidebarIdentity(document, cv, statusInfo);
        return drawCvContinuationHeader(document, cv);
      },
    });

    // The footer goes on every page, now that the number of pages is known.
    const { count } = document.bufferedPageRange();
    for (let page = 0; page < count; page += 1) {
      document.switchToPage(page);
      drawCvFooter(document, statusInfo, page + 1, count);
    }

    document.end();
  });
}
