import { drawCradle, drawQrTile, POSTER_FONT_STACK, roundedRectPath } from "@/lib/poster/canvas-kit";

/**
 * The Image Section's poster engine: a template is a fixed arrangement - logo,
 * a two-tone headline, a line under it, a few points with icons, a photo that
 * fades into the page, and a band at the foot with the trust badge, the Book Now
 * button, a QR code and the WhatsApp number - and the Admin fills it in. Every
 * measurement is in a 1080-wide space and scaled, so one layout serves the
 * square, the 4:5 and the story size; on a shorter picture the type shrinks
 * until it all fits above the band.
 */

export type PosterTone = "navy" | "accent";
export type PosterHeadlineLine = { text: string; tone: PosterTone };
export type PosterFeature = { icon: PosterIconName; text: string };

export type PosterContent = {
  /** A short line under the logo; empty leaves it out. */
  tagline: string;
  headline: PosterHeadlineLine[];
  subline: string;
  features: PosterFeature[];
  badge: string;
  cta: string;
  showQr: boolean;
  qrCaption: string;
};

export type PosterTheme = {
  ground: string;
  tint: string;
  navy: string;
  accent: string;
  body: string;
  band: [string, string];
  ctaFrom: string;
  ctaTo: string;
};

export type PosterTemplate = {
  id: string;
  name: string;
  theme: PosterTheme;
  content: PosterContent;
};

/** Lucide line icons (ISC licence) on a 24-unit grid; circles and polygons written as paths. */
export const posterIcons = {
  shield: ["M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z", "m9 12 2 2 4-4"],
  user: ["M7 8a5 5 0 1 0 10 0a5 5 0 1 0 -10 0", "M20 21a8 8 0 0 0-16 0"],
  home: ["M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8", "M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],
  book: ["M12 7v14", "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"],
  clock: ["M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0", "M12 6L12 12L16 14"],
  star: ["M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26Z"],
  cap: ["M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z", "M22 10v6", "M6 12.5V16a6 3 0 0 0 12 0v-3.5"],
  heart: ["M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"],
  pin: ["M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0", "M9 10a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  sparkles: ["M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z", "M20 3v4", "M22 5h-4", "M4 17v2", "M5 18H3"],
} as const;
export type PosterIconName = keyof typeof posterIcons;
export const posterIconNames = Object.keys(posterIcons) as PosterIconName[];

const PHONE = "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z";

export const posterTemplates: readonly PosterTemplate[] = [
  {
    id: "female-tutor",
    name: "নারী টিউটর",
    theme: {
      ground: "#ffffff",
      tint: "#fdeef4",
      navy: "#0d2a6e",
      accent: "#e5246b",
      body: "#1b2333",
      band: ["#0b3d91", "#1565d8"],
      ctaFrom: "#1d7cf2",
      ctaTo: "#0b4b9e",
    },
    content: {
      tagline: "",
      headline: [
        { text: "মেয়েদের জন্য", tone: "navy" },
        { text: "নিরাপদ ও বিশ্বস্ত", tone: "accent" },
        { text: "নারী টিউটর", tone: "accent" },
      ],
      subline: "আপনার মেয়ের শিক্ষার জন্য আমরা দিচ্ছি সেরা নারী শিক্ষক।",
      features: [
        { icon: "shield", text: "নিরাপদ ও বিশ্বাসযোগ্য" },
        { icon: "user", text: "অভিজ্ঞ ও দক্ষ নারী শিক্ষক" },
        { icon: "home", text: "আপনার সুবিধামতো সময়ে ক্লাস" },
      ],
      badge: "Since 2015 | BTPA Member · Code: BTPA-077",
      cta: "Book Now",
      showQr: true,
      qrCaption: "স্ক্যান করুন",
    },
  },
];

export function findPosterTemplate(id: string) {
  return posterTemplates.find(template => template.id === id);
}

/** "8801516131411" -> "+880 1516-131411", the way the number is read aloud and printed here. */
export function formatPosterPhone(number: string) {
  const digits = number.replace(/\D/g, "");
  const match = /^880(\d{4})(\d{6})$/.exec(digits);
  return match ? `+880 ${match[1]}-${match[2]}` : `+${digits}`;
}

export type PosterFonts = { headline: string; body: string; english: string; headlineWeight: number; bodyWeight: number; englishWeight: number };

/** Where the photo sits in its frame: `zoom` 1 just covers it; `x` and `y` run -1..1 across whatever is left over. */
export type PosterPhoto = { source: CanvasImageSource & { width: number; height: number }; zoom: number; x: number; y: number };

export type PosterRender = {
  width: number;
  height: number;
  scale: number;
  template: PosterTemplate;
  content: PosterContent;
  fonts: PosterFonts;
  /** Overrides the template's accent - the second headline colour, the icon circles, the badge. */
  accent?: string;
  whatsapp: string;
  qrUrl: string;
  photo?: PosterPhoto | null;
};

/** The photo's frame on the picture, in pixels: right of the text column, from the top to just under the band's edge. */
export function posterPhotoFrame(width: number, height: number) {
  const u = width / 1080;
  const bandTop = height - BAND * u;
  return { x: width * 0.34, y: 0, width: width * 0.66, height: bandTop + 70 * u };
}

/** The part of the image drawn into the frame for a zoom and position: always covers it, never stretches. */
export function photoCrop(image: { width: number; height: number }, frame: { width: number; height: number }, zoom: number, x: number, y: number) {
  const cover = Math.max(frame.width / image.width, frame.height / image.height) * Math.max(1, zoom);
  const sw = frame.width / cover;
  const sh = frame.height / cover;
  const clamp = (value: number) => Math.min(1, Math.max(-1, value));
  const sx = ((image.width - sw) / 2) * (1 + clamp(x));
  const sy = ((image.height - sh) / 2) * (1 + clamp(y));
  return { sx, sy, sw, sh };
}

/** Opaque to clear along a smoothstep, as gradient stops: no visible line where a fade ends. */
function easedFade() {
  return Array.from({ length: 9 }, (_, i) => {
    const at = i / 8;
    const alpha = Math.round(255 * (1 - at * at * (3 - 2 * at)));
    return [at, alpha.toString(16).padStart(2, "0")] as const;
  });
}

const PAD = 70;
const BAND = 330;

function stack(primary: string, secondary: string) {
  return `"${primary}", "${secondary}", ${POSTER_FONT_STACK}`;
}

/** Words onto lines no wider than `width`; a word wider than the line keeps its own line. */
export function wrapWords(measureWidth: (text: string) => number, text: string, width: number, maxLines: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && measureWidth(next) > width) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1]} ${lines.slice(maxLines).join(" ")}`;
  return kept;
}

type Plan = {
  k: number;
  headlineSize: number;
  headlineTop: number;
  dividerY: number;
  sublineTop: number;
  sublineLines: string[];
  sublineSize: number;
  featureTop: number;
  featureRows: { lines: string[]; height: number }[];
  featureSize: number;
  bottom: number;
};

function iconPaths(ctx: CanvasRenderingContext2D, paths: readonly string[], x: number, y: number, size: number, colour: string, width = 2) {
  if (typeof Path2D !== "function") return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of paths) ctx.stroke(new Path2D(d));
  ctx.restore();
}

const SEAL_R = 96;

/** "Since 2015 | BTPA Member · Code: BTPA-077" -> the seal's three lines: top label, big number, foot. */
export function parsePosterBadge(badge: string) {
  const parts = badge.split("|");
  if (parts.length < 2) return null;
  const rest = parts.slice(1).join(" ").trim();
  const number = /(\d+)\s*$/.exec(rest);
  if (!number) return null;
  const label = rest.slice(0, number.index).split(/[·•]/)[0].replace(/[-:\s]+$/, "").trim() || "Member";
  return { label: label.toUpperCase(), big: number[1], foot: parts[0].trim().toUpperCase() };
}

/** A round stamp: two white rings on the accent, the number big in the middle. Text that does not fit the pattern is wrapped inside it. */
function drawSeal(
  ctx: CanvasRenderingContext2D,
  badge: string,
  cx: number,
  cy: number,
  r: number,
  colour: string,
  font: (size: number, weight?: number) => string,
  widthIn: (font: string) => (text: string) => number,
) {
  const k = r / SEAL_R;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.2)";
  ctx.shadowBlur = 18 * k;
  ctx.shadowOffsetY = 6 * k;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3.5 * k;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 9 * k, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.5 * k;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 17 * k, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fit = (text: string, size: number, weight: number, max: number) => {
    let s = size;
    while (s > 8 * k && widthIn(font(s, weight))(text) > max) s -= 0.5 * k;
    return s;
  };
  const parsed = parsePosterBadge(badge);
  if (parsed) {
    const max = 124 * k;
    ctx.font = font(fit(parsed.label, 17 * k, 800, max), 800);
    ctx.fillText(parsed.label, cx, cy - 40 * k);
    ctx.font = font(fit(parsed.big, 62 * k, 800, max), 800);
    ctx.fillText(parsed.big, cx, cy + 3 * k);
    ctx.font = font(fit(parsed.foot, 17 * k, 800, max), 800);
    ctx.fillText(parsed.foot, cx, cy + 46 * k);
    ctx.globalAlpha = 0.7;
    ctx.fillRect(cx - 34 * k, cy - 26 * k, 68 * k, 1.5 * k);
    ctx.fillRect(cx - 34 * k, cy + 32 * k, 68 * k, 1.5 * k);
    ctx.globalAlpha = 1;
    return;
  }
  const size = 20 * k;
  ctx.font = font(size, 800);
  const lines = wrapWords(widthIn(font(size, 800)), badge, 124 * k, 4);
  lines.forEach((line, i) => ctx.fillText(line, cx, cy + (i - (lines.length - 1) / 2) * size * 1.3));
}

/** Draws the whole poster onto `canvas`, sized `width × height` times `scale`. */
export function renderPoster(canvas: HTMLCanvasElement, input: PosterRender) {
  const { width: W, height: H, scale } = input;
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  const u = W / 1080;
  const theme = { ...input.template.theme, accent: input.accent ?? input.template.theme.accent };
  const content = input.content;
  const headlineFont = (size: number) => `${input.fonts.headlineWeight} ${size}px ${stack(input.fonts.headline, input.fonts.english)}`;
  const bodyFont = (size: number, weight = input.fonts.bodyWeight) => `${weight} ${size}px ${stack(input.fonts.body, input.fonts.english)}`;
  const englishFont = (size: number, weight = input.fonts.englishWeight) => `${weight} ${size}px ${stack(input.fonts.english, input.fonts.body)}`;
  const widthIn = (font: string) => (text: string) => {
    ctx.font = font;
    return ctx.measureText(text).width;
  };

  const pad = PAD * u;
  const bandTop = H - BAND * u;
  const column = W * 0.56;

  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, W, H);

  // The photo, faded into the page on its left and top, or a quiet stand-in.
  const frame = posterPhotoFrame(W, H);
  if (input.photo) {
    const { sx, sy, sw, sh } = photoCrop(input.photo.source, frame, input.photo.zoom, input.photo.x, input.photo.y);
    ctx.drawImage(input.photo.source, sx, sy, sw, sh, frame.x, frame.y, frame.width, frame.height);
    // Eased stops, so the photo melts into the page instead of ending on a seam.
    const fadeWidth = W * 0.3;
    const left = ctx.createLinearGradient(frame.x, 0, frame.x + fadeWidth, 0);
    for (const [at, alpha] of easedFade()) left.addColorStop(at, `${theme.ground}${alpha}`);
    ctx.fillStyle = left;
    ctx.fillRect(frame.x, frame.y, fadeWidth, frame.height);
    const top = ctx.createLinearGradient(0, 0, 0, H * 0.08);
    top.addColorStop(0, `${theme.ground}cc`);
    top.addColorStop(1, `${theme.ground}00`);
    ctx.fillStyle = top;
    ctx.fillRect(frame.x, 0, frame.width, H * 0.08);
  }
  // A soft tint from the top corner, laid over the photo's edge too so nothing shows a seam.
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.9);
  for (const [at, alpha] of easedFade()) glow.addColorStop(at, `${theme.tint}${alpha}`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  if (!input.photo) {
    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(W * 0.86, bandTop * 0.52, W * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = theme.navy;
    ctx.beginPath();
    ctx.arc(W * 0.98, bandTop * 0.2, W * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Logo: the cradle and "Connect Tutors", with the tagline under the name.
  const markWidth = 104 * u;
  drawCradle(ctx, pad, pad, markWidth, theme.navy, theme.accent, 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = theme.navy;
  const nameX = pad + markWidth + 18 * u;
  ctx.font = englishFont(46 * u, 400);
  const first = ctx.measureText("Connect ").width;
  ctx.fillText("Connect ", nameX, pad + 50 * u);
  ctx.font = englishFont(46 * u, 800);
  ctx.fillText("Tutors", nameX + first, pad + 50 * u);
  if (content.tagline.trim()) {
    ctx.font = englishFont(20 * u, 400);
    ctx.fillStyle = theme.body;
    ctx.globalAlpha = 0.75;
    ctx.fillText(content.tagline.trim(), nameX, pad + 80 * u);
    ctx.globalAlpha = 1;
  }

  // Lay the text column out, shrinking the type until it fits above the band.
  const headlines = content.headline.filter(line => line.text.trim());
  const features = content.features.filter(feature => feature.text.trim());
  const limit = bandTop - 44 * u;
  const plan = (k: number): Plan => {
    const headlineTop = pad + 140 * u;
    let size = 118 * u * k;
    for (const line of headlines) {
      const w = widthIn(headlineFont(size))(line.text);
      if (w > column - pad) size *= (column - pad) / w;
    }
    const headlineBottom = headlineTop + headlines.length * size * 1.2;
    const dividerY = headlineBottom + 30 * u * k;
    const sublineSize = 38 * u * k;
    const sublineTop = dividerY + 36 * u * k;
    const sublineLines = content.subline.trim() ? wrapWords(widthIn(bodyFont(sublineSize)), content.subline, column - pad, 3) : [];
    const featureSize = 34 * u * k;
    const circle = 92 * u * k;
    const featureTop = sublineTop + sublineLines.length * sublineSize * 1.45 + 34 * u * k;
    const textWidth = column - pad - circle - 26 * u * k;
    const featureRows = features.map(feature => {
      const lines = wrapWords(widthIn(bodyFont(featureSize)), feature.text, textWidth, 2);
      return { lines, height: Math.max(circle, lines.length * featureSize * 1.35) + 22 * u * k };
    });
    const bottom = featureTop + featureRows.reduce((sum, row) => sum + row.height, 0);
    return { k, headlineSize: size, headlineTop, dividerY, sublineTop, sublineLines, sublineSize, featureTop, featureRows, featureSize, bottom };
  };
  let chosen = plan(1);
  for (let k = 0.96; chosen.bottom > limit && k >= 0.5; k -= 0.04) chosen = plan(k);
  // A tall picture (a story) has room to spare: let the column breathe instead of hugging the top.
  const spare = Math.max(0, limit - chosen.bottom);
  const shift = Math.min(spare * 0.45, 260 * u);

  ctx.textBaseline = "alphabetic";
  let y = chosen.headlineTop + shift;
  for (const line of headlines) {
    ctx.font = headlineFont(chosen.headlineSize);
    ctx.fillStyle = line.tone === "accent" ? theme.accent : theme.navy;
    ctx.fillText(line.text, pad, y + chosen.headlineSize * 0.95);
    y += chosen.headlineSize * 1.2;
  }

  // The divider: a hairline either side of a small flower.
  const dividerY = chosen.dividerY + shift;
  const flowerX = pad + (column - pad) * 0.45;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2.5 * u;
  ctx.beginPath();
  ctx.moveTo(pad, dividerY);
  ctx.lineTo(flowerX - 26 * u, dividerY);
  ctx.moveTo(flowerX + 26 * u, dividerY);
  ctx.lineTo(column - pad * 0.2, dividerY);
  ctx.stroke();
  ctx.fillStyle = theme.accent;
  for (let petal = 0; petal < 6; petal += 1) {
    const angle = (petal * Math.PI) / 3;
    ctx.beginPath();
    ctx.arc(flowerX + Math.cos(angle) * 9 * u, dividerY + Math.sin(angle) * 9 * u, 6.5 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = theme.ground;
  ctx.beginPath();
  ctx.arc(flowerX, dividerY, 5 * u, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = theme.body;
  ctx.font = bodyFont(chosen.sublineSize);
  chosen.sublineLines.forEach((line, index) => ctx.fillText(line, pad, chosen.sublineTop + shift + chosen.sublineSize * (1 + index * 1.45)));

  // The points: an accent circle with a white icon, the text beside it, a hairline between rows.
  let rowTop = chosen.featureTop + shift;
  const circle = 92 * u * chosen.k;
  features.forEach((feature, index) => {
    const row = chosen.featureRows[index];
    const centreY = rowTop + (row.height - 22 * u * chosen.k) / 2;
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(pad + circle / 2, centreY, circle / 2, 0, Math.PI * 2);
    ctx.fill();
    iconPaths(ctx, posterIcons[feature.icon], pad + circle / 2 - circle * 0.28, centreY - circle * 0.28, circle * 0.56, "#ffffff", 2.2);
    ctx.fillStyle = theme.body;
    ctx.font = bodyFont(chosen.featureSize);
    const textX = pad + circle + 26 * u * chosen.k;
    const blockHeight = row.lines.length * chosen.featureSize * 1.35;
    row.lines.forEach((line, lineIndex) => ctx.fillText(line, textX, centreY - blockHeight / 2 + chosen.featureSize * (1 + lineIndex * 1.35) - chosen.featureSize * 0.18));
    if (index < features.length - 1) {
      ctx.strokeStyle = theme.body;
      ctx.globalAlpha = 0.12;
      ctx.lineWidth = 1.5 * u;
      ctx.beginPath();
      ctx.moveTo(textX - 6 * u, rowTop + row.height - 11 * u * chosen.k);
      ctx.lineTo(column - pad * 0.2, rowTop + row.height - 11 * u * chosen.k);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    rowTop += row.height;
  });

  // The band: a wave rising to the left, in the theme's blues.
  const band = ctx.createLinearGradient(0, bandTop, W, H);
  band.addColorStop(0, theme.band[0]);
  band.addColorStop(1, theme.band[1]);
  ctx.fillStyle = band;
  ctx.beginPath();
  ctx.moveTo(0, bandTop - 30 * u);
  ctx.bezierCurveTo(W * 0.3, bandTop + 40 * u, W * 0.7, bandTop - 60 * u, W, bandTop + 10 * u);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  const qrSize = 204 * u;
  const qrY = bandTop + 48 * u;
  const hasQr = content.showQr && Boolean(input.qrUrl);
  const leftWidth = hasQr ? W - pad * 2 - qrSize - 44 * u : W - pad * 2;
  const centreX = pad + leftWidth / 2;

  // The trust seal, top right.
  if (content.badge.trim()) drawSeal(ctx, content.badge, W - pad - SEAL_R * u, pad + SEAL_R * u - 6 * u, SEAL_R * u, theme.accent, englishFont, widthIn);

  // Book Now: a white-ringed pill with the button's own blues and an arrow.
  const ctaHeight = 112 * u;
  const ctaY = qrY + qrSize / 2 - ctaHeight / 2;
  ctx.font = englishFont(58 * u, 800);
  const ctaText = content.cta.trim() || "Book Now";
  const ctaWidth = Math.min(leftWidth, ctx.measureText(ctaText).width + 190 * u);
  const ctaX = centreX - ctaWidth / 2;
  const ctaFill = ctx.createLinearGradient(0, ctaY, 0, ctaY + ctaHeight);
  ctaFill.addColorStop(0, theme.ctaFrom);
  ctaFill.addColorStop(1, theme.ctaTo);
  ctx.fillStyle = "#ffffff";
  roundedRectPath(ctx, ctaX - 6 * u, ctaY - 6 * u, ctaWidth + 12 * u, ctaHeight + 12 * u, (ctaHeight + 12 * u) / 2);
  ctx.fill();
  ctx.fillStyle = ctaFill;
  roundedRectPath(ctx, ctaX, ctaY, ctaWidth, ctaHeight, ctaHeight / 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ctaText, centreX - 18 * u, ctaY + ctaHeight / 2 + 2 * u);
  const arrowX = ctaX + ctaWidth - 62 * u;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 6 * u;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(arrowX, ctaY + ctaHeight / 2 - 16 * u);
  ctx.lineTo(arrowX + 16 * u, ctaY + ctaHeight / 2);
  ctx.lineTo(arrowX, ctaY + ctaHeight / 2 + 16 * u);
  ctx.stroke();

  // WhatsApp: a green disc with a handset, and the number.
  const waSize = 50 * u;
  ctx.font = englishFont(46 * u, 800);
  const waText = `WhatsApp: ${input.whatsapp}`;
  let waTextSize = 46 * u;
  while (waTextSize > 20 * u && widthIn(englishFont(waTextSize, 800))(waText) > leftWidth - waSize - 24 * u) waTextSize -= 1 * u;
  ctx.font = englishFont(waTextSize, 800);
  const waWidth = waSize + 20 * u + ctx.measureText(waText).width;
  const waY = H - 62 * u;
  const waX = centreX - waWidth / 2;
  ctx.fillStyle = "#25d366";
  ctx.beginPath();
  ctx.arc(waX + waSize / 2, waY, waSize / 2, 0, Math.PI * 2);
  ctx.fill();
  iconPaths(ctx, [PHONE], waX + waSize * 0.24, waY - waSize * 0.26, waSize * 0.52, "#ffffff", 2.4);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText(waText, waX + waSize + 20 * u, waY + 2 * u);

  // The QR code to the request page, with its caption.
  if (hasQr) {
    const qrX = W - pad - qrSize;
    drawQrTile(ctx, input.qrUrl, qrX, qrY, qrSize, theme.navy, 12 * u, 18 * u);
    if (content.qrCaption.trim()) {
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = bodyFont(24 * u, 600);
      ctx.fillText(content.qrCaption.trim(), qrX + qrSize / 2, qrY + qrSize + 30 * u);
    }
  }
  ctx.textAlign = "left";
}

export function posterFileName(templateId: string, size: { id: string; width: number; height: number }, format: "png" | "jpg", scale: number) {
  return `connect-tutors-poster-${templateId}-${size.id}-${size.width * scale}x${size.height * scale}.${format}`;
}
