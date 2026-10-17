import type { PosterLocale } from "@shared/poster-copy";

export type PosterSize = "square" | "landscape";
export type SinglePosterTheme = "navy" | "cream";
export type CombinedPosterTheme = "navy" | "emerald" | "crimson";
export type PosterThemeId = SinglePosterTheme | CombinedPosterTheme;

export const POSTER_SIZES: Record<PosterSize, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  landscape: { width: 1200, height: 675 },
};

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
