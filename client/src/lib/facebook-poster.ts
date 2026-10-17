import { buildJobShareUrl } from "@shared/job-share";
import { learningNeedsFromLegacy, type LearningNeed } from "@shared/learning-needs";
import {
  areaText,
  areaWithoutCity,
  cityOf,
  classesText,
  curriculaText,
  daysPhrase,
  daysValue,
  POSTER_WORDS,
  posterDate,
  salaryText,
  subjectsText,
  timeValue,
  tuitionCount,
  tutorValue,
  type PosterLocale,
} from "@shared/poster-copy";
import { PUBLIC_SITE_HOST, PUBLIC_SITE_ORIGIN } from "@shared/public-site";
import { drawCombinedLandscape, drawCombinedSquare } from "./poster/combined-layouts";
import { drawSingleLandscape, drawSingleSquare } from "./poster/single-layouts";
import {
  POSTER_SIZES,
  type CombinedPosterInput,
  type CombinedPosterTheme,
  type PosterSize,
  type PosterTuition,
  type SinglePosterTheme,
} from "./poster/types";

export { loadPosterFonts } from "./poster/canvas-kit";
export type { CombinedPosterTheme, PosterSize, SinglePosterTheme } from "./poster/types";
export type { PosterLocale } from "@shared/poster-copy";

/**
 * Facebook posters for the Admin Facebook Posts page: one tuition (Navy,
 * Cream) or up to four (Navy, Emerald, Crimson), square 1080×1080 or
 * landscape 1200×675, in Bangla or English, drawn on a canvas and saved as PNG.
 *
 * Only public facts reach a poster — the same ones the Job Board shows. The
 * Guardian's address note and institute name are never read here.
 */

export const SINGLE_POSTER_THEMES: SinglePosterTheme[] = ["navy", "cream"];
export const COMBINED_POSTER_THEMES: CombinedPosterTheme[] = ["navy", "emerald", "crimson"];
export const MAX_COMBINED_TUITIONS = 4;

/** The fields a poster reads from an Admin posted-job row. */
export type FacebookPosterJob = {
  id: number;
  jobId: string;
  classCourse?: string | null;
  category?: string | null;
  curriculumType?: string | null;
  subjects?: string | null | string[];
  learningNeeds?: LearningNeed[] | null;
  tuitionType?: string | null;
  tuitionLocationLabel?: string | null;
  budgetAmount?: number | null;
  daysPerWeek?: number | null;
  tutoringTime?: string | null;
  preferredGender?: string | null;
};

function needsOf(job: FacebookPosterJob): LearningNeed[] {
  if (job.learningNeeds?.length) return job.learningNeeds;
  const subjects = Array.isArray(job.subjects) ? JSON.stringify(job.subjects) : job.subjects ?? "";
  return learningNeedsFromLegacy({ category: job.category ?? "", classCourse: job.classCourse ?? "", subjects, curriculumType: job.curriculumType ?? null });
}

/** One job, worded for the poster. `shortArea` drops the city when the poster's header already names it. */
export function toPosterTuition(job: FacebookPosterJob, locale: PosterLocale, shortArea = false): PosterTuition {
  const needs = needsOf(job);
  const area = areaText(job, locale);
  const rowArea = area && shortArea ? areaWithoutCity(area) : area;
  return {
    jobId: job.jobId,
    classes: classesText(needs, locale),
    curricula: curriculaText(needs, locale),
    subjects: subjectsText(needs, locale),
    rowTitle: `${classesText(needs, locale, 2)} · ${subjectsText(needs, locale, 2, ", ")}`,
    rowMeta: [rowArea, daysPhrase(job.daysPerWeek, locale)].filter(Boolean).join(" · "),
    area,
    week: daysValue(job.daysPerWeek, locale),
    time: timeValue(job.tutoringTime, locale),
    tutor: tutorValue(job.preferredGender, locale),
    salary: salaryText(job.budgetAmount, locale),
  };
}

export function combinedPosterInput(jobs: FacebookPosterJob[], locale: PosterLocale, now = new Date()): CombinedPosterInput {
  const shown = jobs.slice(0, MAX_COMBINED_TUITIONS);
  const cities = new Set(shown.map(job => cityOf(job)));
  const sharedCity = cities.size === 1 ? Array.from(cities)[0] : null;
  const count = tuitionCount(shown.length, locale);
  const words = POSTER_WORDS[locale];
  const head = sharedCity ? `${sharedCity} · ${count}` : count;
  return {
    locale,
    tuitions: shown.map(job => toPosterTuition(job, locale, Boolean(sharedCity))),
    url: `${PUBLIC_SITE_ORIGIN}/job-board`,
    boardAddress: `${PUBLIC_SITE_HOST}/job-board`,
    host: PUBLIC_SITE_HOST,
    date: posterDate(now, locale),
    sub: `${head} · ${words.tutorsNeeded}`,
    subShort: head,
  };
}

function prepare(canvas: HTMLCanvasElement, size: PosterSize): CanvasRenderingContext2D | null {
  const { width, height } = POSTER_SIZES[size];
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext("2d");
}

export type SinglePosterOptions = { theme: SinglePosterTheme; size: PosterSize; locale: PosterLocale };
export type CombinedPosterOptions = { theme: CombinedPosterTheme; size: PosterSize; locale: PosterLocale; now?: Date };

export function renderSingleTuitionPoster(canvas: HTMLCanvasElement, job: FacebookPosterJob, options: SinglePosterOptions) {
  const ctx = prepare(canvas, options.size);
  if (!ctx) return;
  const input = {
    locale: options.locale,
    tuition: toPosterTuition(job, options.locale),
    url: buildJobShareUrl(PUBLIC_SITE_ORIGIN, job.jobId),
    host: PUBLIC_SITE_HOST,
  };
  if (options.size === "square") drawSingleSquare(ctx, input, options.theme);
  else drawSingleLandscape(ctx, input, options.theme);
}

export function renderCombinedTuitionsPoster(canvas: HTMLCanvasElement, jobs: FacebookPosterJob[], options: CombinedPosterOptions) {
  const ctx = prepare(canvas, options.size);
  if (!ctx) return;
  const input = combinedPosterInput(jobs, options.locale, options.now);
  if (options.size === "square") drawCombinedSquare(ctx, input, options.theme);
  else drawCombinedLandscape(ctx, input, options.theme);
}

/** `connect-tutors-6912-navy-bn-square.png`, `connect-tutors-4-tuitions-crimson-en-landscape.png`. */
export function posterFileName(subject: { jobId: string } | { count: number }, theme: string, locale: PosterLocale, size: PosterSize): string {
  const what = "jobId" in subject ? subject.jobId : `${subject.count}-${subject.count === 1 ? "tuition" : "tuitions"}`;
  return `connect-tutors-${what}-${theme}-${locale}-${size}.png`;
}

export function exportCanvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== "function") {
      reject(new Error("Canvas blob export failed"));
      return;
    }
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("Canvas blob export failed"))), "image/png");
  });
}

export type CopyImageResult = "copied" | "unsupported" | "failed";

/** Puts the PNG on the clipboard. "unsupported" means this browser cannot hold images; "failed" means it refused (e.g. permission). */
export async function copyCanvasImageToClipboard(canvas: HTMLCanvasElement): Promise<CopyImageResult> {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return "unsupported";
  try {
    const blob = await exportCanvasToBlob(canvas);
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return "copied";
  } catch {
    return "failed";
  }
}

/** Saves the PNG through a temporary link; resolves false when the image could not be made. */
export async function downloadCanvasImage(canvas: HTMLCanvasElement, filename: string): Promise<boolean> {
  try {
    const blob = await exportCanvasToBlob(canvas);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}
