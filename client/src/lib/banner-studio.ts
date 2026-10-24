import {
  drawCradle,
  drawQrTile,
  drawText,
  fillRoundedGradient,
  fillRoundedRect,
  gradientFill,
  hairline,
  measure,
  POSTER_FONT_STACK,
  radialGlow,
  roundedRectPath,
  strokeRoundedRect,
  wrapLines,
} from "@/lib/poster/canvas-kit";
import { posterIcons, type PosterIconName } from "@/lib/poster-studio";

export type BannerSizeId = "facebook-cover" | "share-banner" | "youtube-banner";

export type BannerThemeId = "navy" | "emerald" | "crimson" | "slate" | "sunset";

export type BannerTheme = {
  id: BannerThemeId;
  name: string;
  gradientStops: Array<[number, string]>;
  accent: string;
  secondaryAccent: string;
  highlightGlow: string;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  ctaBg: [string, string];
  ctaText: string;
  sealRing: string;
};

export const bannerThemes: readonly BannerTheme[] = [
  {
    id: "navy",
    name: "Royal Navy",
    gradientStops: [
      [0, "#061836"],
      [0.5, "#0b2e63"],
      [1, "#071938"],
    ],
    accent: "#38bdf8",
    secondaryAccent: "#f59e0b",
    highlightGlow: "#1e40af",
    cardBg: "rgba(255, 255, 255, 0.07)",
    cardBorder: "rgba(255, 255, 255, 0.16)",
    textPrimary: "#ffffff",
    textSecondary: "#cbd5e1",
    ctaBg: ["#0284c7", "#0369a1"],
    ctaText: "#ffffff",
    sealRing: "#f59e0b",
  },
  {
    id: "emerald",
    name: "Emerald Green",
    gradientStops: [
      [0, "#05261a"],
      [0.5, "#0a4730"],
      [1, "#041c13"],
    ],
    accent: "#34d399",
    secondaryAccent: "#fbbf24",
    highlightGlow: "#065f46",
    cardBg: "rgba(255, 255, 255, 0.08)",
    cardBorder: "rgba(255, 255, 255, 0.18)",
    textPrimary: "#ffffff",
    textSecondary: "#d1fae5",
    ctaBg: ["#059669", "#047857"],
    ctaText: "#ffffff",
    sealRing: "#fbbf24",
  },
  {
    id: "crimson",
    name: "Royal Crimson",
    gradientStops: [
      [0, "#360613"],
      [0.5, "#570e22"],
      [1, "#29040e"],
    ],
    accent: "#fb7185",
    secondaryAccent: "#facc15",
    highlightGlow: "#881337",
    cardBg: "rgba(255, 255, 255, 0.08)",
    cardBorder: "rgba(255, 255, 255, 0.18)",
    textPrimary: "#ffffff",
    textSecondary: "#ffe4e6",
    ctaBg: ["#e11d48", "#be123c"],
    ctaText: "#ffffff",
    sealRing: "#facc15",
  },
  {
    id: "slate",
    name: "Dark Slate",
    gradientStops: [
      [0, "#090d16"],
      [0.5, "#162032"],
      [1, "#0a0e17"],
    ],
    accent: "#818cf8",
    secondaryAccent: "#38bdf8",
    highlightGlow: "#3730a3",
    cardBg: "rgba(255, 255, 255, 0.06)",
    cardBorder: "rgba(255, 255, 255, 0.14)",
    textPrimary: "#ffffff",
    textSecondary: "#94a3b8",
    ctaBg: ["#4f46e5", "#4338ca"],
    ctaText: "#ffffff",
    sealRing: "#818cf8",
  },
  {
    id: "sunset",
    name: "Twilight Amber",
    gradientStops: [
      [0, "#1c0b2b"],
      [0.5, "#33154e"],
      [1, "#180824"],
    ],
    accent: "#fb923c",
    secondaryAccent: "#f472b6",
    highlightGlow: "#581c87",
    cardBg: "rgba(255, 255, 255, 0.08)",
    cardBorder: "rgba(255, 255, 255, 0.16)",
    textPrimary: "#ffffff",
    textSecondary: "#fed7aa",
    ctaBg: ["#ea580c", "#c2410c"],
    ctaText: "#ffffff",
    sealRing: "#fb923c",
  },
];

export function findBannerTheme(id: string): BannerTheme {
  return bannerThemes.find(theme => theme.id === id) ?? bannerThemes[0];
}

export type BannerPill = {
  icon: PosterIconName;
  text: string;
};

export type BannerContent = {
  tagline: string;
  headlineMain: string;
  headlineAccent: string;
  subline: string;
  pills: BannerPill[];
  badge: string;
  ctaText: string;
  showQr: boolean;
  qrCaption: string;
  phone: string;
  website: string;
};

export type BannerTemplate = {
  id: string;
  name: string;
  defaultTheme: BannerThemeId;
  content: BannerContent;
};

export const bannerTemplates: readonly BannerTemplate[] = [
  {
    id: "brand-hero",
    name: "ব্র্যান্ড পরিচিতি ও বিশ্বস্ততা",
    defaultTheme: "navy",
    content: {
      tagline: "কানেক্ট টিউটরস · বিশ্বস্ত গৃহশিক্ষক ম্যাচিং প্ল্যাটফর্ম",
      headlineMain: "আপনার সন্তানের জন্য",
      headlineAccent: "সেরা শিক্ষক খুঁজুন",
      subline: "সারা বাংলাদেশে অভিজ্ঞ ও যাচাইকৃত বিশ্ববিদ্যালয় পড়ুয়া টিউটর সহজেই খুঁজে নিন।",
      pills: [
        { icon: "shield", text: "১০০% ভেরিফাইড শিক্ষক" },
        { icon: "home", text: "হোম ও অনলাইন টিউশন" },
        { icon: "sparkles", text: "অভিভাবকদের জন্য সম্পূর্ণ ফ্রি" },
      ],
      badge: "Since 2015 | BTPA Member · Code: BTPA-077",
      ctaText: "টিউশন রিকোয়েস্ট দিন",
      showQr: true,
      qrCaption: "স্ক্যান করুন",
      phone: "+880 1516-131411",
      website: "connecttutorsbd.com",
    },
  },
  {
    id: "services-highlight",
    name: "একাডেমিক ও কারিকুলাম স্পেশাল",
    defaultTheme: "emerald",
    content: {
      tagline: "সকল কারিকুলাম ও ক্লাসের জন্য পারদর্শী টিউটর",
      headlineMain: "অভিজ্ঞ শিক্ষক প্রয়োজন?",
      headlineAccent: "আমরা দিচ্ছি দ্রুত সমাধান",
      subline: "বাংলা মাধ্যম, ইংলিশ ভার্সন, ইংলিশ মিডিয়াম এবং ভর্তি পরীক্ষার স্পেশাল গাইডেন্স।",
      pills: [
        { icon: "book", text: "বাংলা ও ইংলিশ ভার্সন" },
        { icon: "cap", text: "ইংলিশ মিডিয়াম (O/A Level)" },
        { icon: "star", text: "মেডিকেল ও বুয়েট ভর্তি প্রস্তুতি" },
        { icon: "heart", text: "কুরআন ও ইসলামিক স্টাডিজ" },
      ],
      badge: "Verified Matching | 100% Satisfaction Guarantee",
      ctaText: "হটলাইনে কল করুন",
      showQr: true,
      qrCaption: "ভিজিট করুন",
      phone: "+880 1516-131411",
      website: "connecttutorsbd.com",
    },
  },
  {
    id: "tutor-recruitment",
    name: "শিক্ষক নিয়োগ ও ক্যারিয়ার",
    defaultTheme: "slate",
    content: {
      tagline: "দেশের বৃহত্তম টিউটর নেটওয়ার্কে যুক্ত হোন",
      headlineMain: "টিউশন খুঁজছেন?",
      headlineAccent: "আজই টিউটর হিসেবে যোগ দিন",
      subline: "পছন্দের এলাকায় সুবিধাজনক সময়ে নিয়মিত ও আকর্ষণীয় পারিশ্রমিকে টিউশন পাওয়ার নিশ্চয়তা।",
      pills: [
        { icon: "user", text: "সহজ ফ্রি রেজিস্ট্রেশন" },
        { icon: "shield", text: "টিউশন ফি ১০০% সুরক্ষিত" },
        { icon: "clock", text: "ইনস্ট্যান্ট নতুন টিউশন অ্যালার্ট" },
      ],
      badge: "Join 10,000+ Tutors across Bangladesh",
      ctaText: "রেজিস্ট্রেশন করুন",
      showQr: true,
      qrCaption: "আবেদন করুন",
      phone: "+880 1516-131411",
      website: "connecttutorsbd.com/become-tutor",
    },
  },
  {
    id: "minimal-trust",
    name: "মিনিমালিস্ট ও ট্রাস্ট সীল",
    defaultTheme: "sunset",
    content: {
      tagline: "Connect Tutors Bangladesh · Leading Tuition Platform",
      headlineMain: "দক্ষ ও অভিজ্ঞ শিক্ষকদের সাথে",
      headlineAccent: "গড়ুন আগামীর ভবিষ্যৎ",
      subline: "অভিভাবকদের আস্থার ১০ বছর। প্রতিটি শিক্ষক এনআইডি ও অ্যাকাডেমিক ভেরিফাইড।",
      pills: [
        { icon: "shield", text: "NID & Student ID Verified" },
        { icon: "star", text: "৪.৯/৫ স্টার রেটেড শিক্ষক" },
        { icon: "pin", text: "সারাদেশের ৬৪ জেলায় সেবা" },
      ],
      badge: "BTPA Registered · Govt Recognized",
      ctaText: "Get Started Now",
      showQr: true,
      qrCaption: "Book Online",
      phone: "+880 1516-131411",
      website: "connecttutorsbd.com",
    },
  },
];

export function findBannerTemplate(id: string): BannerTemplate {
  return bannerTemplates.find(template => template.id === id) ?? bannerTemplates[0];
}

/** Formats a raw phone number into `+880 1516-131411` */
export function formatBannerPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const match = /^880(\d{4})(\d{6})$/.exec(digits);
  if (match) return `+880 ${match[1]}-${match[2]}`;
  const local = /^0(\d{4})(\d{6})$/.exec(digits);
  if (local) return `+880 ${local[1]}-${local[2]}`;
  return raw;
}

export type BannerSafeZone = {
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
};

/**
 * Calculates the platform safe zone (e.g. Mobile safe area on Facebook Cover or YouTube Banner).
 */
export function getBannerSafeZone(sizeId: BannerSizeId, width: number, height: number): BannerSafeZone {
  if (sizeId === "facebook-cover") {
    // 1640x624: Mobile view cuts ~140px on left and right, leaving 1360px centered
    const marginX = Math.round(width * 0.085);
    return {
      x: marginX,
      y: 0,
      width: width - marginX * 2,
      height,
      description: "Mobile Safe Zone (1360×624 px) — keep main text & CTAs inside",
    };
  }

  if (sizeId === "youtube-banner") {
    // 2560x1440: Central safe area is 1546x423
    const safeW = Math.round((1546 / 2560) * width);
    const safeH = Math.round((423 / 1440) * height);
    return {
      x: Math.round((width - safeW) / 2),
      y: Math.round((height - safeH) / 2),
      width: safeW,
      height: safeH,
      description: "All-Device Safe Area (Mobile, Tablet & Desktop: 1546×423 px)",
    };
  }

  // share-banner (1200x630): Standard 5% padding around perimeter
  const padX = Math.round(width * 0.05);
  const padY = Math.round(height * 0.05);
  return {
    x: padX,
    y: padY,
    width: width - padX * 2,
    height: height - padY * 2,
    description: "Standard Social Share Safe Margin",
  };
}

export type BannerFonts = {
  headline: string;
  headlineWeight: number;
  body: string;
  bodyWeight: number;
  english: string;
  englishWeight: number;
};

export type BannerRenderInput = {
  width: number;
  height: number;
  scale: number;
  sizeId: BannerSizeId;
  template: BannerTemplate;
  theme: BannerTheme;
  content: BannerContent;
  fonts: BannerFonts;
  showSafeZoneOverlay?: boolean;
};

function iconPath(ctx: CanvasRenderingContext2D, paths: readonly string[], x: number, y: number, size: number, color: string, lineWidth = 2) {
  if (typeof Path2D !== "function") return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of paths) ctx.stroke(new Path2D(d));
  ctx.restore();
}

/**
 * Main banner rendering engine on HTML5 Canvas.
 */
export function renderBanner(canvas: HTMLCanvasElement, input: BannerRenderInput) {
  const { width, height, scale, sizeId, theme, content, fonts, showSafeZoneOverlay } = input;

  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.save();
  ctx.scale(scale, scale);

  // 1. Background Fill with Ambient Glow
  ctx.fillStyle = gradientFill(ctx, 0, 0, width, height, 135, theme.gradientStops);
  ctx.fillRect(0, 0, width, height);

  // Radial ambient glows for visual depth
  radialGlow(ctx, width * 0.25, height * 0.2, Math.max(width, height) * 0.45, theme.highlightGlow, 0.4);
  radialGlow(ctx, width * 0.85, height * 0.75, Math.max(width, height) * 0.5, theme.accent, 0.15);

  // 2. Decorative Watermark Cradle Mark in the background
  const bgCradleWidth = width * 0.42;
  drawCradle(
    ctx,
    width - bgCradleWidth * 0.85,
    height * 0.15,
    bgCradleWidth,
    "rgba(255, 255, 255, 0.03)",
    "rgba(255, 255, 255, 0.05)",
    1.5,
    1,
  );

  // 3. Coordinate System based on Banner Size & Safe Zones
  const safeZone = getBannerSafeZone(sizeId, width, height);

  // Vertical layout anchor:
  // For YouTube banner (large height with narrow safe strip), we bound all key content inside safeZone.y
  const inSafeY = sizeId === "youtube-banner";
  const contentTop = inSafeY ? safeZone.y + 24 : Math.round(height * 0.08);
  const contentBottom = inSafeY ? safeZone.y + safeZone.height - 24 : Math.round(height * 0.92);
  const availableHeight = contentBottom - contentTop;

  // Horizontal layout anchor:
  const contentLeft = safeZone.x + (sizeId === "facebook-cover" ? 40 : 36);
  const contentRight = safeZone.x + safeZone.width - (sizeId === "facebook-cover" ? 40 : 36);
  const availableWidth = contentRight - contentLeft;

  // Scale factor for text & layout proportional to banner width (standardized around 1640 width)
  const u = Math.min(width / 1640, inSafeY ? (safeZone.height / 423) * 1.05 : 1.25);

  // 4. Header Bar: Logo & Tagline Pill
  const logoWidth = Math.round(180 * u);
  const cradleSize = Math.round(36 * u);
  const headerY = contentTop + Math.round(18 * u);

  // Draw Cradle brand mark + "Connect Tutors" typography
  drawCradle(ctx, contentLeft, headerY - Math.round(14 * u), cradleSize, "#ffffff", theme.accent, 1.4);

  // Brand name text next to cradle
  const brandX = contentLeft + cradleSize + Math.round(14 * u);
  drawText(ctx, "Connect Tutors", brandX, headerY, {
    size: Math.round(22 * u),
    weight: fonts.englishWeight || 700,
    color: "#ffffff",
    face: "sans",
  });

  // Tagline badge / chip next to brand name
  if (content.tagline) {
    const brandWidth = measure(ctx, "Connect Tutors", Math.round(22 * u), fonts.englishWeight || 700, 0, "sans");
    const tagX = brandX + brandWidth + Math.round(18 * u);
    const tagFontSize = Math.round(13 * u);
    const tagTextWidth = measure(ctx, content.tagline, tagFontSize, 600, 0, "sans");
    const tagPadX = Math.round(12 * u);
    const tagH = Math.round(24 * u);

    // Pill background
    fillRoundedRect(
      ctx,
      tagX,
      headerY - tagH / 2,
      tagTextWidth + tagPadX * 2,
      tagH,
      Math.round(tagH / 2),
      "rgba(255, 255, 255, 0.12)",
    );
    strokeRoundedRect(
      ctx,
      tagX,
      headerY - tagH / 2,
      tagTextWidth + tagPadX * 2,
      tagH,
      Math.round(tagH / 2),
      theme.cardBorder,
      1,
    );

    drawText(ctx, content.tagline, tagX + tagPadX, headerY, {
      size: tagFontSize,
      weight: 600,
      color: theme.accent,
      face: "sans",
    });
  }

  // 5. Main Headline & Subline (Left Side)
  const textColWidth = Math.round(availableWidth * 0.62);
  const headlineStartY = headerY + Math.round(44 * u);
  const headlineSize = Math.round(42 * u);

  // Main headline (Line 1)
  drawText(ctx, content.headlineMain, contentLeft, headlineStartY, {
    size: headlineSize,
    weight: fonts.headlineWeight || 700,
    color: theme.textPrimary,
    face: "sans",
    maxWidth: textColWidth,
  });

  // Accent headline (Line 2)
  const line2Y = headlineStartY + Math.round(50 * u);
  drawText(ctx, content.headlineAccent, contentLeft, line2Y, {
    size: headlineSize,
    weight: fonts.headlineWeight || 800,
    color: theme.accent,
    face: "sans",
    maxWidth: textColWidth,
  });

  // Subtitle / Description under headline
  const sublineY = line2Y + Math.round(44 * u);
  const sublineSize = Math.round(18 * u);
  const sublineLines = wrapLines(ctx, content.subline, sublineSize, fonts.bodyWeight || 500, textColWidth, 2, "sans");
  sublineLines.forEach((line, idx) => {
    drawText(ctx, line, contentLeft, sublineY + idx * Math.round(26 * u), {
      size: sublineSize,
      weight: fonts.bodyWeight || 500,
      color: theme.textSecondary,
      face: "sans",
    });
  });

  // 6. Feature Pills (Badges with Icons)
  const pillsStartY = sublineY + sublineLines.length * Math.round(26 * u) + Math.round(22 * u);
  const pillHeight = Math.round(36 * u);
  const pillFontSize = Math.round(14 * u);
  const pillIconSize = Math.round(16 * u);

  let currentPillX = contentLeft;
  let currentPillY = pillsStartY;

  content.pills.forEach(pill => {
    const textW = measure(ctx, pill.text, pillFontSize, 600, 0, "sans");
    const pillW = Math.round(pillIconSize + textW + 28 * u);

    // If next pill overflows text column, wrap to next line
    if (currentPillX + pillW > contentLeft + textColWidth && currentPillX !== contentLeft) {
      currentPillX = contentLeft;
      currentPillY += pillHeight + Math.round(10 * u);
    }

    // Pill background
    fillRoundedRect(ctx, currentPillX, currentPillY, pillW, pillHeight, Math.round(10 * u), theme.cardBg);
    strokeRoundedRect(ctx, currentPillX, currentPillY, pillW, pillHeight, Math.round(10 * u), theme.cardBorder, 1);

    // Pill icon
    const iconPaths = posterIcons[pill.icon] ?? posterIcons.shield;
    iconPath(
      ctx,
      iconPaths,
      currentPillX + Math.round(10 * u),
      currentPillY + Math.round((pillHeight - pillIconSize) / 2),
      pillIconSize,
      theme.accent,
      2,
    );

    // Pill text
    drawText(ctx, pill.text, currentPillX + pillIconSize + Math.round(16 * u), currentPillY + pillHeight / 2, {
      size: pillFontSize,
      weight: 600,
      color: "#ffffff",
      face: "sans",
    });

    currentPillX += pillW + Math.round(12 * u);
  });

  // 7. Right Side Container: Trust Seal & CTA Box / QR Card
  const rightColWidth = Math.round(availableWidth * 0.32);
  const rightColX = contentRight - rightColWidth;
  const rightCardY = headerY + Math.round(20 * u);
  const rightCardH = availableHeight - Math.round(80 * u);

  // Right card glassmorphic container
  fillRoundedGradient(ctx, rightColX, rightCardY, rightColWidth, rightCardH, Math.round(18 * u), 160, [
    [0, "rgba(255, 255, 255, 0.11)"],
    [1, "rgba(255, 255, 255, 0.03)"],
  ]);
  strokeRoundedRect(ctx, rightColX, rightCardY, rightColWidth, rightCardH, Math.round(18 * u), theme.cardBorder, 1.2);

  // Trust Badge on Right Card
  if (content.badge) {
    const badgeY = rightCardY + Math.round(28 * u);
    drawText(ctx, "★ OFFICIAL ACCREDITED ★", rightColX + rightColWidth / 2, badgeY, {
      size: Math.round(12 * u),
      weight: 800,
      color: theme.secondaryAccent,
      align: "center",
      face: "sans",
    });

    drawText(ctx, content.badge, rightColX + rightColWidth / 2, badgeY + Math.round(22 * u), {
      size: Math.round(14 * u),
      weight: 700,
      color: "#ffffff",
      align: "center",
      face: "sans",
      maxWidth: rightColWidth - Math.round(32 * u),
    });

    hairline(
      ctx,
      rightColX + Math.round(24 * u),
      badgeY + Math.round(40 * u),
      rightColX + rightColWidth - Math.round(24 * u),
      badgeY + Math.round(40 * u),
      "rgba(255, 255, 255, 0.15)",
    );
  }

  // QR Tile inside Right Card (or Hotline emphasis if QR disabled)
  const qrCenterY = rightCardY + Math.round(rightCardH * 0.52);
  if (content.showQr) {
    const qrTileSize = Math.round(100 * u);
    const qrTileX = Math.round(rightColX + (rightColWidth - qrTileSize) / 2);
    const qrTileY = Math.round(qrCenterY - qrTileSize / 2);

    const qrUrl = typeof window === "undefined" ? "https://connecttutorsbd.com" : `${window.location.origin}/request-tutor`;
    drawQrTile(
      ctx,
      qrUrl,
      qrTileX,
      qrTileY,
      qrTileSize,
      "#0f172a",
      Math.max(6, Math.round(8 * u)),
      Math.max(8, Math.round(12 * u)),
    );
    if (content.qrCaption) {
      drawText(
        ctx,
        content.qrCaption,
        rightColX + rightColWidth / 2,
        qrTileY + qrTileSize + Math.round(14 * u),
        {
          size: Math.round(12 * u),
          weight: 600,
          color: theme.accent,
          align: "center",
          face: "sans",
        },
      );
    }
  } else {
    // Large Phone Icon & Hotline display if QR is turned off
    drawText(ctx, "📞 24/7 HELPLINE", rightColX + rightColWidth / 2, qrCenterY - Math.round(15 * u), {
      size: Math.round(13 * u),
      weight: 700,
      color: theme.accent,
      align: "center",
      face: "sans",
    });
    drawText(ctx, formatBannerPhone(content.phone), rightColX + rightColWidth / 2, qrCenterY + Math.round(16 * u), {
      size: Math.round(22 * u),
      weight: 800,
      color: "#ffffff",
      align: "center",
      face: "sans",
    });
  }

  // CTA Button inside Right Card
  if (content.ctaText) {
    const btnW = Math.round(rightColWidth - 40 * u);
    const btnH = Math.round(44 * u);
    const btnX = Math.round(rightColX + 20 * u);
    const btnY = Math.round(rightCardY + rightCardH - btnH - 20 * u);

    // Button gradient & shadow
    fillRoundedGradient(ctx, btnX, btnY, btnW, btnH, Math.round(12 * u), 90, [
      [0, theme.ctaBg[0]],
      [1, theme.ctaBg[1]],
    ]);
    strokeRoundedRect(ctx, btnX, btnY, btnW, btnH, Math.round(12 * u), "rgba(255, 255, 255, 0.3)", 1);

    drawText(ctx, content.ctaText, btnX + btnW / 2, btnY + btnH / 2, {
      size: Math.round(16 * u),
      weight: 700,
      color: theme.ctaText,
      align: "center",
      face: "sans",
    });
  }

  // 8. Footer Strip (Phone, Website & Quick Badges)
  const footerY = contentBottom - Math.round(12 * u);
  const footerFontSize = Math.round(15 * u);

  // Phone with phone icon
  const phoneText = `📞 ${formatBannerPhone(content.phone)}`;
  drawText(ctx, phoneText, contentLeft, footerY, {
    size: footerFontSize,
    weight: 700,
    color: "#ffffff",
    face: "sans",
  });

  // Website address
  const phoneW = measure(ctx, phoneText, footerFontSize, 700, 0, "sans");
  const webX = contentLeft + phoneW + Math.round(28 * u);
  drawText(ctx, `🌐 ${content.website}`, webX, footerY, {
    size: footerFontSize,
    weight: 600,
    color: theme.accent,
    face: "sans",
  });

  // 9. Safe Zone Visual Overlay (optional guide for admin inspection)
  if (showSafeZoneOverlay) {
    ctx.save();
    // Darken areas outside safe zone
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";

    // Top
    if (safeZone.y > 0) ctx.fillRect(0, 0, width, safeZone.y);
    // Bottom
    if (safeZone.y + safeZone.height < height) {
      ctx.fillRect(0, safeZone.y + safeZone.height, width, height - (safeZone.y + safeZone.height));
    }
    // Left
    if (safeZone.x > 0) ctx.fillRect(0, safeZone.y, safeZone.x, safeZone.height);
    // Right
    if (safeZone.x + safeZone.width < width) {
      ctx.fillRect(safeZone.x + safeZone.width, safeZone.y, width - (safeZone.x + safeZone.width), safeZone.height);
    }

    // Dashed border around safe area
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.strokeRect(safeZone.x, safeZone.y, safeZone.width, safeZone.height);

    // Label on safe zone
    drawText(ctx, `⚑ ${safeZone.description}`, safeZone.x + 12, safeZone.y + 20, {
      size: 13,
      weight: 700,
      color: "#fbbf24",
      face: "sans",
    });
    ctx.restore();
  }

  ctx.restore();
}
