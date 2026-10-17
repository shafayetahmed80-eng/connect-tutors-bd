import type { PosterLocale } from "@shared/poster-copy";

/**
 * `tall` is the Mist list for a long run of tuitions: 1080 wide, as tall as its
 * rows need. Only a combined Mist poster comes in it.
 */
export type PosterSize = "square" | "landscape" | "tall";
export type SinglePosterTheme = "navy" | "cream" | "mist";
export type CombinedPosterTheme = "navy" | "emerald" | "crimson" | "mist";
/** The designs drawn by single-layouts.ts and combined-layouts.ts; Mist has its own file. */
export type ClassicSingleTheme = Exclude<SinglePosterTheme, "mist">;
export type ClassicCombinedTheme = Exclude<CombinedPosterTheme, "mist">;
export type PosterThemeId = SinglePosterTheme | CombinedPosterTheme;

export const POSTER_SIZES: Record<Exclude<PosterSize, "tall">, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  landscape: { width: 1200, height: 675 },
};

export const TALL_POSTER_WIDTH = 1080;

/** One tuition, already worded for the poster's language. Nothing private reaches this shape. */
export type PosterTuition = {
  jobId: string;
  /** "ক্লাস ৮" — the headline. */
  classes: string;
  /** "ইংলিশ ভার্সন" — beside the headline. */
  curricula: string;
  /** "গণিত · পদার্থবিজ্ঞান · রসায়ন". */
  subjects: string;
  /** "ক্লাস ৮ · গণিত, পদার্থবিজ্ঞান" — one line on a combined poster. */
  rowTitle: string;
  /** "Dhanmondi · সপ্তাহে ৩ দিন" — the line under it. */
  rowMeta: string;
  area: string | null;
  week: string | null;
  time: string | null;
  tutor: string;
  salary: string | null;
  /** The preferred tutor as a kind - what the Mist poster colours its pill and card edge by. */
  tutorKind: "male" | "female" | "any";
  /** "MALE TUTOR" / "পুরুষ শিক্ষক" — the Mist poster's pill. */
  tutorPill: string;
  /** Each subject as its own chip, at most three and then "+২টি". */
  subjectChips: string[];
  /** The curriculum a grouped list files this tuition under. */
  group: { key: string; label: string };
  /** The place as a row says it: without its city when the poster's header already names it. */
  areaLine: string | null;
  /** "সপ্তাহে ৩ দিন" / "3 days a week", on its own. */
  weekPhrase: string | null;
};

export type SinglePosterInput = {
  locale: PosterLocale;
  tuition: PosterTuition;
  /** The QR link: this job on the live Job Board. */
  url: string;
  host: string;
};

export type CombinedPosterInput = {
  locale: PosterLocale;
  tuitions: PosterTuition[];
  /** The QR link: the live Job Board. */
  url: string;
  /** "connecttutorsbd.com/job-board". */
  boardAddress: string;
  host: string;
  date: string;
  /** "Dhaka · ৪টি টিউশন · শিক্ষক প্রয়োজন". */
  sub: string;
  /** "Dhaka · ৪টি টিউশন". */
  subShort: string;
};
