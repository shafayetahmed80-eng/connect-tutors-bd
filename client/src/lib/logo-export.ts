import { studioFontFiles } from "@/lib/image-studio-fonts";
import { buildLogo, type BuiltLogo, type LogoColourway, type LogoFonts, type LogoForm, type LogoNameMode } from "@/lib/logo-studio";

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(binary);
}

const dataUriCache = new Map<string, Promise<string>>();

function fontDataUri(url: string) {
  let found = dataUriCache.get(url);
  if (!found) {
    found = fetch(url, { credentials: "include" })
      .then(response => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(`Font ${url} could not be read.`))))
      .then(buffer => `data:font/${url.match(/\.(woff2|woff|ttf|otf)(?:$|\?)/)?.[1] ?? "woff2"};base64,${toBase64(new Uint8Array(buffer))}`);
    dataUriCache.set(url, found);
  }
  return found;
}

/** `@font-face` rules that carry the families' files inside the SVG, so it draws the same wherever it is opened. */
export async function embeddedFontCss(families: readonly { id: string; family: string; weights: readonly number[] }[]) {
  const rules: string[] = [];
  for (const { id, family, weights } of families) {
    // Only the weights the logo draws, and not the extended-Latin file: the name is plain letters, so the rest would only add size.
    for (const file of studioFontFiles(id).filter(file => weights.includes(file.weight) && !file.url.includes("latin-ext"))) {
      const uri = await fontDataUri(file.url);
      rules.push(`@font-face{font-family:"${family}";font-weight:${file.weight};src:url(${uri});${file.unicodeRange ? `unicode-range:${file.unicodeRange};` : ""}}`);
    }
  }
  return rules.join("");
}

let measureContext: CanvasRenderingContext2D | null = null;
export function measureWithCanvas(text: string, font: string) {
  measureContext ??= document.createElement("canvas").getContext("2d");
  if (!measureContext) return text.length * 20;
  measureContext.font = font;
  return measureContext.measureText(text).width;
}

/** Builds the SVG with its fonts embedded. */
export async function renderLogoSvg(input: { form: LogoForm; name: LogoNameMode; colourway: LogoColourway; fonts: LogoFonts; bnId: string; enId: string }): Promise<BuiltLogo> {
  const fontCss = await embeddedFontCss([
    ...(input.form !== "icon" && input.name !== "bn" ? [{ id: input.enId, family: input.fonts.enFamily, weights: [input.fonts.enRegular, input.fonts.enBold] }] : []),
    ...(input.form !== "icon" && input.name !== "en" ? [{ id: input.bnId, family: input.fonts.bnFamily, weights: [input.fonts.bnWeight] }] : []),
  ]);
  return buildLogo({ form: input.form, name: input.name, colourway: input.colourway, fonts: input.fonts, measure: measureWithCanvas, fontCss });
}

/** The PNG of a built logo at `scale` times its natural size; a transparent way keeps its transparency. */
export async function logoPngBlob(built: BuiltLogo, scale: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([built.svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(built.width * scale);
    canvas.height = Math.round(built.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot make the image.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("The image could not be made."))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}
