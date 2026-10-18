import fontFiles from "./image-studio-font-files.json";

/**
 * The Image Section's font library: 13 Bangla and 30 English families, self-hosted
 * under /image-fonts with their licences (scripts/fetch-image-studio-fonts.mjs).
 * A family is fetched only when an Admin's screen needs it - never by the rest of
 * the site, and never into the installed app's offline copy (vite.config.ts).
 *
 * The codes (B1, E5, C3) are the ones on the Owner's font specimen page.
 */

export type StudioFontScript = "bn" | "en";
export type StudioFontCategory = "sans" | "serif" | "display" | "hand";

export type StudioFont = {
  id: string;
  code: string;
  name: string;
  script: StudioFontScript;
  category: StudioFontCategory;
};

type FontFile = { weight: number; url: string; unicodeRange?: string };
const files = fontFiles as Record<string, FontFile[]>;

export const studioFonts: readonly StudioFont[] = [
  { id: "noto-sans-bengali", code: "B1", name: "Noto Sans Bengali", script: "bn", category: "sans" },
  { id: "hind-siliguri", code: "B2", name: "Hind Siliguri", script: "bn", category: "sans" },
  { id: "anek-bangla", code: "B3", name: "Anek Bangla", script: "bn", category: "sans" },
  { id: "baloo-da-2", code: "B4", name: "Baloo Da 2", script: "bn", category: "display" },
  { id: "mina", code: "B5", name: "Mina", script: "bn", category: "sans" },
  { id: "noto-serif-bengali", code: "B6", name: "Noto Serif Bengali", script: "bn", category: "serif" },
  { id: "tiro-bangla", code: "B7", name: "Tiro Bangla", script: "bn", category: "serif" },
  { id: "atma", code: "B8", name: "Atma", script: "bn", category: "hand" },
  { id: "galada", code: "B9", name: "Galada", script: "bn", category: "display" },
  { id: "solaimanlipi", code: "B10", name: "SolaimanLipi", script: "bn", category: "sans" },
  { id: "siyam-rupali", code: "B11", name: "Siyam Rupali", script: "bn", category: "sans" },
  { id: "ekushey-lohit", code: "B12", name: "Ekushey Lohit", script: "bn", category: "serif" },
  { id: "mukti", code: "B13", name: "Mukti", script: "bn", category: "serif" },
  { id: "dm-sans", code: "E1", name: "DM Sans", script: "en", category: "sans" },
  { id: "manrope", code: "E2", name: "Manrope", script: "en", category: "sans" },
  { id: "poppins", code: "E3", name: "Poppins", script: "en", category: "sans" },
  { id: "montserrat", code: "E4", name: "Montserrat", script: "en", category: "sans" },
  { id: "plus-jakarta-sans", code: "E5", name: "Plus Jakarta Sans", script: "en", category: "sans" },
  { id: "outfit", code: "E6", name: "Outfit", script: "en", category: "sans" },
  { id: "sora", code: "E7", name: "Sora", script: "en", category: "sans" },
  { id: "playfair-display", code: "E8", name: "Playfair Display", script: "en", category: "serif" },
  { id: "fraunces", code: "E9", name: "Fraunces", script: "en", category: "serif" },
  { id: "lora", code: "E10", name: "Lora", script: "en", category: "serif" },
  { id: "bebas-neue", code: "E11", name: "Bebas Neue", script: "en", category: "display" },
  { id: "archivo-black", code: "E12", name: "Archivo Black", script: "en", category: "display" },
  { id: "unbounded", code: "E13", name: "Unbounded", script: "en", category: "display" },
  { id: "syne", code: "E14", name: "Syne", script: "en", category: "display" },
  { id: "righteous", code: "E15", name: "Righteous", script: "en", category: "display" },
  { id: "fredoka", code: "E16", name: "Fredoka", script: "en", category: "display" },
  { id: "comfortaa", code: "E17", name: "Comfortaa", script: "en", category: "sans" },
  { id: "lexend", code: "E18", name: "Lexend", script: "en", category: "sans" },
  { id: "urbanist", code: "E19", name: "Urbanist", script: "en", category: "sans" },
  { id: "krona-one", code: "E20", name: "Krona One", script: "en", category: "display" },
  { id: "josefin-sans", code: "E21", name: "Josefin Sans", script: "en", category: "sans" },
  { id: "abril-fatface", code: "E22", name: "Abril Fatface", script: "en", category: "serif" },
  { id: "dm-serif-display", code: "E23", name: "DM Serif Display", script: "en", category: "serif" },
  { id: "yeseva-one", code: "E24", name: "Yeseva One", script: "en", category: "serif" },
  { id: "cormorant-garamond", code: "E25", name: "Cormorant Garamond", script: "en", category: "serif" },
  { id: "alfa-slab-one", code: "E26", name: "Alfa Slab One", script: "en", category: "display" },
  { id: "bungee", code: "E27", name: "Bungee", script: "en", category: "display" },
  { id: "pacifico", code: "E28", name: "Pacifico", script: "en", category: "hand" },
  { id: "caveat", code: "E29", name: "Caveat", script: "en", category: "hand" },
  { id: "kalam", code: "E30", name: "Kalam", script: "en", category: "hand" },
];

/** Ready-made Bangla + English pairs from the specimen page (C1-C12). */
export const studioFontPairs: readonly { code: string; bn: string; en: string }[] = [
  { code: "C1", bn: "noto-sans-bengali", en: "dm-sans" },
  { code: "C2", bn: "hind-siliguri", en: "poppins" },
  { code: "C3", bn: "anek-bangla", en: "plus-jakarta-sans" },
  { code: "C4", bn: "baloo-da-2", en: "outfit" },
  { code: "C5", bn: "noto-serif-bengali", en: "playfair-display" },
  { code: "C6", bn: "mina", en: "montserrat" },
  { code: "C7", bn: "anek-bangla", en: "unbounded" },
  { code: "C8", bn: "baloo-da-2", en: "fredoka" },
  { code: "C9", bn: "galada", en: "righteous" },
  { code: "C10", bn: "tiro-bangla", en: "dm-serif-display" },
  { code: "C11", bn: "atma", en: "caveat" },
  { code: "C12", bn: "hind-siliguri", en: "syne" },
];

export const studioFontCategoryLabels: Record<StudioFontCategory, string> = {
  sans: "Sans",
  serif: "Serif",
  display: "Display",
  hand: "Handwritten",
};

export const DEFAULT_BANGLA_FONT = "noto-sans-bengali";
export const DEFAULT_ENGLISH_FONT = "dm-sans";

export function findStudioFont(id: string) {
  return studioFonts.find(font => font.id === id);
}

/** The CSS family a library font is registered under - its own name, so it never collides with the site's faces. */
export function studioFontFamily(id: string) {
  return `studio-${id}`;
}

/** The heaviest weight the family ships, for headlines; one-weight families answer with that weight. */
export function studioFontBoldWeight(id: string) {
  return Math.max(...(files[id] ?? [{ weight: 400 }]).map(file => file.weight));
}

export function studioFontRegularWeight(id: string) {
  return Math.min(...(files[id] ?? [{ weight: 400 }]).map(file => file.weight));
}

export type StudioFontMarks = Map<string, { starred: boolean; archived: boolean }>;

/**
 * The list an Admin picks from: one script, an optional category and search,
 * archived families left out unless asked for, starred ones first, the rest in
 * specimen order.
 */
export function visibleStudioFonts(options: {
  script: StudioFontScript;
  category?: StudioFontCategory | "all";
  search?: string;
  marks: StudioFontMarks;
  showArchived?: boolean;
}) {
  const term = options.search?.trim().toLowerCase() ?? "";
  const fonts = studioFonts.filter(font => {
    if (font.script !== options.script) return false;
    if (options.category && options.category !== "all" && font.category !== options.category) return false;
    if (term && !font.name.toLowerCase().includes(term) && font.code.toLowerCase() !== term) return false;
    const archived = options.marks.get(font.id)?.archived ?? false;
    return options.showArchived ? archived : !archived;
  });
  const starred = (font: StudioFont) => (options.marks.get(font.id)?.starred ? 0 : 1);
  return fonts.map((font, index) => ({ font, index })).sort((a, b) => starred(a.font) - starred(b.font) || a.index - b.index).map(entry => entry.font);
}

const loading = new Map<string, Promise<void>>();

/** Fetches and registers one family (every weight and character set it ships). Safe to call again; a family loads once. */
export function loadStudioFont(id: string): Promise<void> {
  const existing = loading.get(id);
  if (existing) return existing;
  const sources = files[id];
  if (!sources || typeof FontFace === "undefined" || typeof document === "undefined") return Promise.resolve();
  const promise = Promise.all(sources.map(async source => {
    const face = new FontFace(studioFontFamily(id), `url(${source.url})`, {
      weight: String(source.weight),
      ...(source.unicodeRange ? { unicodeRange: source.unicodeRange } : {}),
      display: "swap",
    });
    document.fonts.add(await face.load());
  })).then(() => undefined, () => {
    // A family that failed to load is tried again next time instead of staying broken.
    loading.delete(id);
  });
  loading.set(id, promise);
  return promise;
}
