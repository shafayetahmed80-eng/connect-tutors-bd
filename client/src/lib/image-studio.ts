/**
 * The Admin Image Section: social-media pictures drawn in the browser on a
 * canvas and saved as files - nothing is stored on the server. Each section
 * (poster, banner, logo) offers the sizes the platforms ask for; the designs
 * themselves arrive section by section, so for now each size shows a plain
 * test plate that proves the size and the export.
 */

import { POSTER_FONT_STACK } from "@/lib/poster/canvas-kit";

export const imageStudioSections = ["poster", "banner", "logo"] as const;
export type ImageStudioSection = (typeof imageStudioSections)[number];

export type ImageStudioSize = {
  id: string;
  label: string;
  width: number;
  height: number;
};

/** The sizes each platform asks for, largest useful upload first where a platform shrinks it on display. */
export const imageStudioSizes: Record<ImageStudioSection, readonly ImageStudioSize[]> = {
  poster: [
    { id: "square-post", label: "Facebook / Instagram post", width: 1080, height: 1080 },
    { id: "portrait-post", label: "Portrait post", width: 1080, height: 1350 },
    { id: "story", label: "Story / WhatsApp status", width: 1080, height: 1920 },
  ],
  banner: [
    { id: "facebook-cover", label: "Facebook cover", width: 1640, height: 624 },
    { id: "share-banner", label: "Link share banner", width: 1200, height: 630 },
    { id: "youtube-banner", label: "YouTube banner", width: 2560, height: 1440 },
  ],
  logo: [
    { id: "square-logo", label: "Square logo", width: 1024, height: 1024 },
    { id: "profile-picture", label: "Profile picture", width: 720, height: 720 },
    { id: "wide-logo", label: "Wide logo", width: 1200, height: 400 },
  ],
};

export const imageStudioSectionLabels: Record<ImageStudioSection, string> = {
  poster: "Poster",
  banner: "Banner",
  logo: "Logo",
};

export function isImageStudioSection(value: string | undefined): value is ImageStudioSection {
  return imageStudioSections.includes(value as ImageStudioSection);
}

export type ImageExportFormat = "png" | "jpg";
export const imageExportScales = [1, 2, 3] as const;
export type ImageExportScale = (typeof imageExportScales)[number];

/** A canvas this large fails silently on many phones; a 3× YouTube banner (7680×4320) is past it, so the scale is capped per size. */
const MAX_EXPORT_PIXELS = 16_777_216;

export function maxScaleFor(size: ImageStudioSize): ImageExportScale {
  const allowed = imageExportScales.filter(scale => size.width * scale * size.height * scale <= MAX_EXPORT_PIXELS);
  return allowed[allowed.length - 1] ?? 1;
}

export function imageFileName(section: ImageStudioSection, size: ImageStudioSize, format: ImageExportFormat, scale: ImageExportScale) {
  const pixels = `${size.width * scale}x${size.height * scale}`;
  return `connect-tutors-${section}-${size.id}-${pixels}.${format}`;
}

/** The site's own blues (`index.css`), so even the test plate looks like the brand. */
const PLATE = { ground: "#0b4b86", accent: "#1677e8", line: "rgba(255,255,255,0.35)", text: "#ffffff" };

/**
 * Draws the test plate in the size's own units; `scale` multiplies every pixel
 * so a 2× export is the same picture, sharper. The dashed frame sits 5% in -
 * the margin a platform may crop or cover.
 */
export function drawTestPlate(canvas: HTMLCanvasElement, section: ImageStudioSection, size: ImageStudioSize, scale: number = 1) {
  canvas.width = size.width * scale;
  canvas.height = size.height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  const { width, height } = size;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, PLATE.ground);
  gradient.addColorStop(1, PLATE.accent);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const inset = Math.round(Math.min(width, height) * 0.05);
  ctx.strokeStyle = PLATE.line;
  ctx.lineWidth = Math.max(2, Math.round(Math.min(width, height) / 300));
  ctx.setLineDash([ctx.lineWidth * 6, ctx.lineWidth * 4]);
  ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
  ctx.setLineDash([]);

  const unit = Math.min(width, height);
  ctx.fillStyle = PLATE.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(unit * 0.09)}px ${POSTER_FONT_STACK}`;
  ctx.fillText(imageStudioSectionLabels[section], width / 2, height / 2 - unit * 0.06);
  ctx.font = `500 ${Math.round(unit * 0.05)}px ${POSTER_FONT_STACK}`;
  ctx.fillText(`${size.width} × ${size.height}`, width / 2, height / 2 + unit * 0.06);
}

/** PNG keeps transparency; JPG has none, so whatever is drawn is laid on white first. */
export function canvasToImageBlob(canvas: HTMLCanvasElement, format: ImageExportFormat): Promise<Blob> {
  let source = canvas;
  if (format === "jpg") {
    source = document.createElement("canvas");
    source.width = canvas.width;
    source.height = canvas.height;
    const ctx = source.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, source.width, source.height);
      ctx.drawImage(canvas, 0, 0);
    }
  }
  return new Promise((resolve, reject) => {
    if (typeof source.toBlob !== "function") {
      reject(new Error("This browser cannot save the image."));
      return;
    }
    source.toBlob(blob => (blob ? resolve(blob) : reject(new Error("The image could not be made."))), format === "jpg" ? "image/jpeg" : "image/png", 0.92);
  });
}

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
