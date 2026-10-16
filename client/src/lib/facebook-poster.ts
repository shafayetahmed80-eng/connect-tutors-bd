import QRCode from "qrcode";
import { formatSalaryAmount } from "@shared/salary-amount";

export type PosterThemeId = "navy" | "emerald" | "crimson";
export type PosterAspectRatio = "square" | "landscape";

export interface PosterTheme {
  id: PosterThemeId;
  label: string;
  bgGradStart: string;
  bgGradEnd: string;
  cardBg: string;
  cardBorder: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  salaryBg: string;
  salaryBorder: string;
  salaryText: string;
  tagline: string;
}

export const POSTER_THEMES: Record<PosterThemeId, PosterTheme> = {
  navy: {
    id: "navy",
    label: "Classic Navy (Standard)",
    bgGradStart: "#0a192f",
    bgGradEnd: "#0f172a",
    cardBg: "rgba(15, 23, 42, 0.75)",
    cardBorder: "rgba(56, 189, 248, 0.25)",
    accentColor: "#38bdf8",
    badgeBg: "#1877f2",
    badgeText: "#ffffff",
    salaryBg: "rgba(16, 185, 129, 0.15)",
    salaryBorder: "rgba(52, 211, 153, 0.45)",
    salaryText: "#34d399",
    tagline: "TUITION ALERT",
  },
  emerald: {
    id: "emerald",
    label: "Emerald Premium (High Budget)",
    bgGradStart: "#022c22",
    bgGradEnd: "#064e3b",
    cardBg: "rgba(2, 44, 34, 0.75)",
    cardBorder: "rgba(52, 211, 153, 0.3)",
    accentColor: "#34d399",
    badgeBg: "#059669",
    badgeText: "#ffffff",
    salaryBg: "rgba(245, 158, 11, 0.2)",
    salaryBorder: "rgba(251, 191, 36, 0.5)",
    salaryText: "#fbbf24",
    tagline: "HIGH BUDGET TUITION",
  },
  crimson: {
    id: "crimson",
    label: "Sunset Crimson (Urgent)",
    bgGradStart: "#270707",
    bgGradEnd: "#4c0519",
    cardBg: "rgba(39, 7, 7, 0.75)",
    cardBorder: "rgba(251, 113, 133, 0.3)",
    accentColor: "#fb7185",
    badgeBg: "#e11d48",
    badgeText: "#ffffff",
    salaryBg: "rgba(250, 204, 21, 0.18)",
    salaryBorder: "rgba(250, 204, 21, 0.5)",
    salaryText: "#facc15",
    tagline: "URGENT REQUIREMENT",
  },
};

export interface FacebookPosterJob {
  id: number;
  jobId: string;
  classCourse?: string | null;
  category?: string | null;
  curriculumType?: string | null;
  subjects?: string | null | string[];
  tuitionType?: string | null;
  tuitionLocationLabel?: string | null;
  locationText?: string | null;
  addressDetails?: string | null;
  budgetAmount?: number | null;
  daysPerWeek?: number | null;
  tutoringTime?: string | null;
  studentGender?: string | null;
  studentCount?: number | null;
  preferredGender?: string | null;
  instituteName?: string | null;
  origin?: string;
}

export interface PosterOptions {
  theme?: PosterThemeId;
  ratio?: PosterAspectRatio;
  headline?: string;
}

function parseSubjectsList(subjects: string | null | string[] | undefined): string {
  if (!subjects) return "General";
  if (Array.isArray(subjects)) return subjects.join(", ");
  try {
    const parsed = JSON.parse(subjects);
    if (Array.isArray(parsed)) return parsed.join(", ");
  } catch {}
  return subjects;
}

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Draws a sharp QR code onto the canvas context synchronously using QRCode.create.
 */
export function drawQrCode(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  bgColor = "#ffffff",
  fgColor = "#0f172a"
) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const count = qr.modules.size;
  const cellSize = size / count;

  // Background box with small rounded corner
  ctx.fillStyle = bgColor;
  drawRoundedRect(ctx, x - 6, y - 6, size + 12, size + 12, 10);
  ctx.fill();

  ctx.fillStyle = fgColor;
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.modules.get(row, col)) {
        ctx.fillRect(
          Math.round(x + col * cellSize),
          Math.round(y + row * cellSize),
          Math.ceil(cellSize),
          Math.ceil(cellSize)
        );
      }
    }
  }
}

/**
 * Renders a single tuition social media banner (1080x1080 or 1200x675).
 */
export function renderSingleTuitionPoster(
  canvas: HTMLCanvasElement,
  job: FacebookPosterJob,
  options: PosterOptions = {}
) {
  const ratio = options.ratio || "square";
  const theme = POSTER_THEMES[options.theme || "navy"];

  const width = ratio === "square" ? 1080 : 1200;
  const height = ratio === "square" ? 1080 : 675;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 1. Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, theme.bgGradStart);
  bgGrad.addColorStop(1, theme.bgGradEnd);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle aesthetic glow/orbs
  const glow = ctx.createRadialGradient(width * 0.8, height * 0.2, 50, width * 0.8, height * 0.2, 500);
  glow.addColorStop(0, "rgba(24, 119, 242, 0.18)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Border outline
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, width - 16, height - 16);

  // 2. Header Section
  const headerTop = ratio === "square" ? 64 : 44;
  const padX = ratio === "square" ? 72 : 64;

  // Brand Name "Connect Tutors"
  ctx.font = "bold 44px 'Manrope', 'Inter', system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Connect Tutors", padX, headerTop + 14);

  // Brand Subtitle
  ctx.font = "500 18px 'Inter', system-ui, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Verified Tuition Matching Platform", padX, headerTop + 48);

  // Tagline Badge on Right (TUITION ALERT / URGENT)
  const badgeText = options.headline || theme.tagline;
  ctx.font = "bold 20px 'Inter', system-ui, sans-serif";
  const badgeMetrics = ctx.measureText(badgeText);
  const badgeWidth = badgeMetrics.width + 36;
  const badgeHeight = 42;
  const badgeX = width - padX - badgeWidth;
  const badgeY = headerTop + 4;

  ctx.fillStyle = theme.badgeBg;
  drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 21);
  ctx.fill();

  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);

  // Divider line
  const dividerY = headerTop + 84;
  const divGrad = ctx.createLinearGradient(padX, dividerY, width - padX, dividerY);
  divGrad.addColorStop(0, "rgba(56, 189, 248, 0.6)");
  divGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.15)");
  divGrad.addColorStop(1, "rgba(255, 255, 255, 0.02)");
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, dividerY);
  ctx.lineTo(width - padX, dividerY);
  ctx.stroke();

  // 3. Central Job Card
  const cardTop = dividerY + (ratio === "square" ? 36 : 24);
  const cardBottom = ratio === "square" ? height - 170 : height - 140;
  const cardHeight = cardBottom - cardTop;
  const cardWidth = width - padX * 2;

  // Card background
  ctx.fillStyle = theme.cardBg;
  drawRoundedRect(ctx, padX, cardTop, cardWidth, cardHeight, 24);
  ctx.fill();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Job ID Badge inside Card
  const code = job.jobId;
  const cardInnerX = padX + (ratio === "square" ? 44 : 36);
  let curY = cardTop + (ratio === "square" ? 48 : 36);

  ctx.fillStyle = "#1e293b";
  drawRoundedRect(ctx, cardInnerX, curY - 14, 180, 40, 20);
  ctx.fill();
  ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "bold 20px 'Inter', system-ui, sans-serif";
  ctx.fillStyle = "#f59e0b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`Job ID: ${code}`, cardInnerX + 90, curY + 6);

  // Class & Curriculum Heading
  curY += ratio === "square" ? 64 : 48;
  const classTitle = `${job.classCourse || "Standard Tuition"} ${job.category ? `• ${job.category}` : ""}`;
  ctx.font = ratio === "square" ? "bold 38px 'Manrope', 'Inter', system-ui, sans-serif" : "bold 32px 'Manrope', 'Inter', system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(classTitle, cardInnerX, curY);

  if (job.curriculumType && ratio === "square") {
    curY += 46;
    ctx.font = "500 20px 'Inter', system-ui, sans-serif";
    ctx.fillStyle = theme.accentColor;
    ctx.fillText(job.curriculumType, cardInnerX, curY);
  }

  // Info Items Grid / Rows
  curY += ratio === "square" ? 44 : 38;
  const subjects = parseSubjectsList(job.subjects);
  const location = job.tuitionLocationLabel || job.locationText || "Dhaka";
  const address = job.addressDetails ? ` (${job.addressDetails})` : "";
  const tutorPref = job.preferredGender
    ? `${job.preferredGender.toUpperCase()} Tutor Preferred`
    : "Any Qualified Tutor";
  const institute = job.instituteName ? ` (${job.instituteName})` : "";
  const schedule = `${job.daysPerWeek ? `${job.daysPerWeek} Days/Week` : "Flexible"}${job.tutoringTime ? ` • ${job.tutoringTime}` : ""}`;

  const infoRows = [
    { icon: "📖", label: "SUBJECTS", val: subjects },
    { icon: "📍", label: "LOCATION", val: `${location}${address}` },
    { icon: "🎓", label: "PREFERENCE", val: `${tutorPref}${institute}` },
    { icon: "⏰", label: "SCHEDULE", val: schedule },
  ];

  const rowGap = ratio === "square" ? 52 : 36;
  const labelFont = "bold 15px 'Inter', system-ui, sans-serif";
  const valFont = ratio === "square" ? "600 24px 'Inter', system-ui, sans-serif" : "600 20px 'Inter', system-ui, sans-serif";

  infoRows.forEach(row => {
    // Icon + Label
    ctx.font = labelFont;
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`${row.icon}  ${row.label}`, cardInnerX, curY);

    // Value
    curY += ratio === "square" ? 22 : 18;
    ctx.font = valFont;
    ctx.fillStyle = "#f8fafc";

    // Truncate text if too long
    let displayVal = row.val;
    const maxValWidth = cardWidth - (ratio === "square" ? 90 : 70);
    while (ctx.measureText(displayVal).width > maxValWidth && displayVal.length > 10) {
      displayVal = displayVal.slice(0, -4) + "…";
    }
    ctx.fillText(displayVal, cardInnerX, curY);

    curY += rowGap;
  });

  // Salary Highlight Pill / Box
  const salaryY = cardBottom - (ratio === "square" ? 92 : 72);
  const salaryH = ratio === "square" ? 68 : 56;
  const salaryW = cardWidth - (ratio === "square" ? 88 : 72);

  ctx.fillStyle = theme.salaryBg;
  drawRoundedRect(ctx, cardInnerX, salaryY, salaryW, salaryH, 16);
  ctx.fill();
  ctx.strokeStyle = theme.salaryBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const salaryDisplay = formatSalaryAmount(job.budgetAmount);
  ctx.font = ratio === "square" ? "bold 28px 'Manrope', 'Inter', system-ui, sans-serif" : "bold 24px 'Manrope', 'Inter', system-ui, sans-serif";
  ctx.fillStyle = theme.salaryText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`💰  SALARY: ${salaryDisplay}`, cardInnerX + salaryW / 2, salaryY + salaryH / 2);

  // 4. Footer Section (BTPA-077 Badge, Website URL, QR Code)
  const footerTop = cardBottom + (ratio === "square" ? 28 : 20);
  const qrSize = ratio === "square" ? 96 : 84;
  const qrX = width - padX - qrSize - 8;
  const qrY = height - (ratio === "square" ? 140 : 120);

  // Left Info: Website + BTPA-077
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // BTPA - 077 Badge
  const btpaBadgeY = qrY - 4;
  ctx.fillStyle = "#1e293b";
  drawRoundedRect(ctx, padX, btpaBadgeY, 220, 36, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "bold 16px 'Inter', system-ui, sans-serif";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("🛡️ Member: BTPA - 077", padX + 16, btpaBadgeY + 9);

  // Website URL
  ctx.font = ratio === "square" ? "bold 24px 'Manrope', 'Inter', system-ui, sans-serif" : "bold 20px 'Manrope', 'Inter', system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("🌐 connect-tutors.com", padX, btpaBadgeY + 44);

  ctx.font = "500 15px 'Inter', system-ui, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Scan QR code to apply directly or check details", padX, btpaBadgeY + 76);

  // QR Code
  const jobUrl = `${job.origin || "https://connect-tutors.com"}/jobs?jobId=${code}`;
  drawQrCode(ctx, jobUrl, qrX, qrY, qrSize, "#ffffff", "#0f172a");

  // QR Label
  ctx.font = "bold 12px 'Inter', system-ui, sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.textAlign = "center";
  ctx.fillText("SCAN TO APPLY", qrX + qrSize / 2, qrY + qrSize + 14);
}

/**
 * Renders a bulk/multi-tuition grid poster (for up to 4 selected jobs).
 */
export function renderBulkTuitionsPoster(
  canvas: HTMLCanvasElement,
  jobs: FacebookPosterJob[],
  options: PosterOptions = {}
) {
  const ratio = options.ratio || "square";
  const theme = POSTER_THEMES[options.theme || "navy"];

  const width = ratio === "square" ? 1080 : 1200;
  const height = ratio === "square" ? 1080 : 675;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, theme.bgGradStart);
  bgGrad.addColorStop(1, theme.bgGradEnd);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Border outline
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, width - 16, height - 16);

  // Header
  const headerTop = ratio === "square" ? 54 : 36;
  const padX = ratio === "square" ? 64 : 54;

  ctx.font = "bold 40px 'Manrope', 'Inter', system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Connect Tutors", padX, headerTop + 14);

  const headline = options.headline || `AVAILABLE TUITIONS (${jobs.length})`;
  ctx.font = "bold 20px 'Inter', system-ui, sans-serif";
  const badgeMetrics = ctx.measureText(headline);
  const badgeWidth = badgeMetrics.width + 36;
  const badgeHeight = 40;
  const badgeX = width - padX - badgeWidth;
  const badgeY = headerTop - 4;

  ctx.fillStyle = theme.badgeBg;
  drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 20);
  ctx.fill();

  ctx.fillStyle = theme.badgeText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(headline, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);

  // Divider
  const dividerY = headerTop + 54;
  ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, dividerY);
  ctx.lineTo(width - padX, dividerY);
  ctx.stroke();

  // Grid Layout
  const displayJobs = jobs.slice(0, 4);
  const gridTop = dividerY + 24;
  const gridBottom = ratio === "square" ? height - 160 : height - 130;
  const totalGridHeight = gridBottom - gridTop;
  const totalGridWidth = width - padX * 2;

  const cols = displayJobs.length > 2 || ratio === "landscape" ? 2 : 1;
  const rows = Math.ceil(displayJobs.length / cols);
  const gap = 18;

  const cardW = (totalGridWidth - (cols - 1) * gap) / cols;
  const cardH = (totalGridHeight - (rows - 1) * gap) / rows;

  displayJobs.forEach((job, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = padX + col * (cardW + gap);
    const cy = gridTop + row * (cardH + gap);

    // Card background
    ctx.fillStyle = theme.cardBg;
    drawRoundedRect(ctx, cx, cy, cardW, cardH, 18);
    ctx.fill();
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Job ID Badge
    ctx.fillStyle = "#1e293b";
    drawRoundedRect(ctx, cx + 18, cy + 14, 110, 26, 13);
    ctx.fill();
    ctx.strokeStyle = "rgba(245, 158, 11, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = "bold 13px 'Inter', system-ui, sans-serif";
    ctx.fillStyle = "#f59e0b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(job.jobId, cx + 73, cy + 27);

    // Class / Category
    ctx.font = "bold 18px 'Manrope', 'Inter', system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const classText = `${job.classCourse || "Tuition"} ${job.category ? `• ${job.category}` : ""}`;
    ctx.fillText(classText, cx + 18, cy + 50);

    // Info Lines
    const subs = parseSubjectsList(job.subjects);
    const loc = job.tuitionLocationLabel || job.locationText || "Dhaka";
    const salary = formatSalaryAmount(job.budgetAmount);

    ctx.font = "500 14px 'Inter', system-ui, sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(`📖 ${subs}`, cx + 18, cy + 76);
    ctx.fillText(`📍 ${loc}`, cx + 18, cy + 98);

    // Salary Pill inside card
    ctx.fillStyle = theme.salaryBg;
    drawRoundedRect(ctx, cx + 18, cy + cardH - 42, cardW - 36, 30, 10);
    ctx.fill();
    ctx.font = "bold 15px 'Manrope', 'Inter', system-ui, sans-serif";
    ctx.fillStyle = theme.salaryText;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`💰 SALARY: ${salary}`, cx + cardW / 2, cy + cardH - 27);
  });

  // Footer
  const qrSize = ratio === "square" ? 90 : 80;
  const qrX = width - padX - qrSize - 8;
  const qrY = height - (ratio === "square" ? 134 : 116);

  // BTPA - 077 Badge
  const btpaBadgeY = qrY - 2;
  ctx.fillStyle = "#1e293b";
  drawRoundedRect(ctx, padX, btpaBadgeY, 210, 34, 17);
  ctx.fill();
  ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "bold 15px 'Inter', system-ui, sans-serif";
  ctx.fillStyle = "#38bdf8";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("🛡️ Member: BTPA - 077", padX + 16, btpaBadgeY + 8);

  ctx.font = "bold 22px 'Manrope', 'Inter', system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("🌐 connect-tutors.com", padX, btpaBadgeY + 40);

  ctx.font = "500 14px 'Inter', system-ui, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Scan QR code to apply or view all live tuitions", padX, btpaBadgeY + 70);

  // QR Code
  const qrUrl = "https://connect-tutors.com/jobs";
  drawQrCode(ctx, qrUrl, qrX, qrY, qrSize, "#ffffff", "#0f172a");

  ctx.font = "bold 11px 'Inter', system-ui, sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.textAlign = "center";
  ctx.fillText("SCAN TO APPLY", qrX + qrSize / 2, qrY + qrSize + 12);
}

/**
 * Converts a rendered HTMLCanvasElement to a PNG Blob.
 */
export function exportCanvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas blob export failed"));
    }, "image/png");
  });
}

/**
 * Copies the canvas image directly to clipboard so admin can Ctrl+V into Facebook post.
 */
export async function copyCanvasImageToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard && navigator.clipboard.write) {
      const blob = await exportCanvasToBlob(canvas);
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Downloads the canvas image as a PNG file.
 */
export function downloadCanvasImage(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a");
  link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
