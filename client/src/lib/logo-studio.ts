/**
 * The Image Section's logo: the Connect Tutors Newton's cradle mark (the same
 * drawing as `BrandMark`) in four forms and five colour ways, built as SVG so one
 * source gives both the SVG and the PNG. Nothing here touches the page: text is
 * measured through a function the caller supplies, so the layout can be tested.
 */

export const logoForms = ["icon", "horizontal", "vertical", "wordmark"] as const;
export type LogoForm = (typeof logoForms)[number];
export const logoFormLabels: Record<LogoForm, string> = {
  icon: "Icon",
  horizontal: "Horizontal",
  vertical: "Vertical",
  wordmark: "Name only",
};

/** What the name says: English, Bangla, or the English name with the Bangla under it. */
export type LogoNameMode = "bn" | "en" | "mixed";
export const LOGO_NAME = { en: { primary: "Connect", secondary: "Tutors" }, bn: "কানেক্ট টিউটর্স" } as const;

export type LogoColourway = {
  id: string;
  label: string;
  /** The square or box behind the logo; null leaves it transparent. */
  ground: string | null;
  /** The cradle's bar, strings and resting balls, and the name. */
  ink: string;
  /** The lifted ball. */
  accent: string;
  /** Where it is meant to sit, for the file list. */
  note: string;
};

export const logoColourways: readonly LogoColourway[] = [
  { id: "site-blue", label: "Site blue", ground: "#0b4b86", ink: "#ffffff", accent: "#ffc24d", note: "white and gold on the site blue" },
  { id: "on-white", label: "On white", ground: "#ffffff", ink: "#0b4b86", accent: "#f5a623", note: "blue and gold on white" },
  { id: "colour", label: "Colour, transparent", ground: null, ink: "#0b4b86", accent: "#f5a623", note: "blue and gold, no background" },
  { id: "white", label: "All white", ground: null, ink: "#ffffff", accent: "#ffffff", note: "white, for dark pictures" },
  { id: "black", label: "All black", ground: null, ink: "#000000", accent: "#000000", note: "black, for light pictures and print" },
];

/** The mark on its own 48-unit grid, cropped to rows 8-40: x 3..37.4 and y 11..38.6 hold every stroke (BrandMark). */
const MARK = { x: 2, y: 9, width: 38, height: 31 };

function markSvg(ink: string, accent: string) {
  return [
    `<path d="M5.6 11V35M12.8 11V35M20 11V35M27.2 11V35" fill="none" stroke="${ink}" stroke-width="1.3"/>`,
    ...[5.6, 12.8, 20, 27.2].map(x => `<circle cx="${x}" cy="35" r="3.6" fill="${ink}"/>`),
    `<g transform="rotate(-22 34.4 11)"><path d="M34.4 11V35" fill="none" stroke="${accent}" stroke-width="1.3"/><circle cx="34.4" cy="35" r="3.6" fill="${accent}"/></g>`,
    `<path d="M3 11H37" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`,
  ].join("");
}

/** Measures a line of text in a font, in pixels at the given size; the caller decides how (a canvas, or a stub in a test). */
export type MeasureText = (text: string, font: string) => number;

export type LogoFonts = {
  bnFamily: string;
  bnWeight: number;
  enFamily: string;
  enRegular: number;
  enBold: number;
};

type NameLine = { runs: { text: string; weight: number; family: string }[]; family: string; weight: number; size: number };

const escapeXml = (text: string) => text.replace(/[<>&"]/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[character] ?? character);

export type BuiltLogo = { svg: string; width: number; height: number };

/**
 * The finished logo: its SVG and its natural size in pixels. `fontCss` is the
 * `@font-face` rules for the faces used (embedded so the SVG draws the same
 * anywhere); pass an empty string while measuring or in tests.
 */
export function buildLogo(options: {
  form: LogoForm;
  name: LogoNameMode;
  colourway: LogoColourway;
  fonts: LogoFonts;
  measure: MeasureText;
  fontCss?: string;
}): BuiltLogo {
  const { form, name, colourway, fonts, measure } = options;
  const markHeight = 100;
  const markScale = markHeight / MARK.height;
  const markWidth = MARK.width * markScale;
  const font = (family: string, weight: number, size: number) => `${weight} ${size}px "${family}"`;

  const lines = (size: number): NameLine[] => {
    const english = (px: number): NameLine => ({
      runs: [
        { text: LOGO_NAME.en.primary + " ", weight: fonts.enRegular, family: fonts.enFamily },
        { text: LOGO_NAME.en.secondary, weight: fonts.enBold, family: fonts.enFamily },
      ],
      family: fonts.enFamily, weight: fonts.enBold, size: px,
    });
    const bangla = (px: number): NameLine => ({ runs: [{ text: LOGO_NAME.bn, weight: fonts.bnWeight, family: fonts.bnFamily }], family: fonts.bnFamily, weight: fonts.bnWeight, size: px });
    if (name === "en") return [english(size)];
    if (name === "bn") return [bangla(size)];
    return [english(size), bangla(size * 0.62)];
  };
  const lineWidth = (line: NameLine) => line.runs.reduce((sum, run) => sum + measure(run.text, font(run.family, run.weight, line.size)), 0);
  const lineSvg = (line: NameLine, x: number, baseline: number, anchor: "start" | "middle") =>
    `<text x="${x}" y="${baseline}" text-anchor="${anchor}" fill="${colourway.ink}" font-size="${line.size}">${line.runs.map(run => `<tspan font-family="${escapeXml(run.family)}" font-weight="${run.weight}">${escapeXml(run.text)}</tspan>`).join("")}</text>`;

  const pad = 40;
  let width: number;
  let height: number;
  let body: string;
  const place = (x: number, y: number, scale = markScale) => `<g transform="translate(${x} ${y}) scale(${scale}) translate(${-MARK.x} ${-MARK.y})">${markSvg(colourway.ink, colourway.accent)}</g>`;

  if (form === "icon") {
    const side = 400;
    const scale = (side * 0.64) / MARK.width;
    width = height = side;
    body = place((side - MARK.width * scale) / 2, (side - MARK.height * scale) / 2, scale);
  } else if (form === "wordmark") {
    const set = lines(96);
    const widest = Math.max(...set.map(lineWidth));
    width = Math.ceil(widest + pad * 2);
    const gap = 14;
    height = Math.ceil(set.reduce((sum, line) => sum + line.size * 1.25, 0) + gap * (set.length - 1) + pad * 2);
    let y = pad;
    body = set.map(line => {
      const baseline = y + line.size * 0.98;
      y += line.size * 1.25 + gap;
      return lineSvg(line, width / 2, baseline, "middle");
    }).join("");
  } else if (form === "horizontal") {
    const set = lines(64);
    const widest = Math.max(...set.map(lineWidth));
    const gapX = 34;
    const textHeight = set.reduce((sum, line) => sum + line.size * 1.25, 0) + 8 * (set.length - 1);
    width = Math.ceil(pad + markWidth + gapX + widest + pad);
    height = Math.ceil(Math.max(markHeight, textHeight) + pad * 2);
    let y = (height - textHeight) / 2;
    body = place(pad, (height - markHeight) / 2) + set.map(line => {
      const baseline = y + line.size * 0.98;
      y += line.size * 1.25 + 8;
      return lineSvg(line, pad + markWidth + gapX, baseline, "start");
    }).join("");
  } else {
    const set = lines(72);
    const widest = Math.max(markWidth * 1.4, ...set.map(lineWidth));
    const bigScale = (markHeight * 1.5) / MARK.height;
    const bigWidth = MARK.width * bigScale;
    width = Math.ceil(widest + pad * 2);
    const textHeight = set.reduce((sum, line) => sum + line.size * 1.25, 0) + 10 * (set.length - 1);
    height = Math.ceil(pad + markHeight * 1.5 + 26 + textHeight + pad);
    let y = pad + markHeight * 1.5 + 26;
    body = place((width - bigWidth) / 2, pad, bigScale) + set.map(line => {
      const baseline = y + line.size * 0.98;
      y += line.size * 1.25 + 10;
      return lineSvg(line, width / 2, baseline, "middle");
    }).join("");
  }

  const radius = form === "icon" ? Math.round(width * 0.22) : Math.round(Math.min(width, height) * 0.08);
  const ground = colourway.ground ? `<rect width="${width}" height="${height}" rx="${radius}" fill="${colourway.ground}"/>` : "";
  const defs = options.fontCss ? `<defs><style>${options.fontCss}</style></defs>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${defs}${ground}${body}</svg>`;
  return { svg, width, height };
}

export function logoFileName(form: LogoForm, colourwayId: string, name: LogoNameMode, extension: "png" | "svg", scale = 1) {
  const language = form === "icon" ? "" : `-${name === "mixed" ? "en-bn" : name}`;
  return `connect-tutors-logo-${form}${language}-${colourwayId}${scale > 1 ? `@${scale}x` : ""}.${extension}`;
}

/** Every form × colour way as one list - what "Download all" packs. The icon has no name, so it ignores the language. */
export function allLogoVariants() {
  return logoForms.flatMap(form => logoColourways.map(colourway => ({ form, colourway })));
}
