/** Rules and wording shared by the Guardian's rating dialog and the server. */

export const TUTOR_RATING_MIN = 1;
export const TUTOR_RATING_MAX = 5;
export const TUTOR_REVIEW_COMMENT_MAX = 300;

export type TutorRatingSummary = { average: number | null; count: number };

/** "4.6 · 5 ratings", "5.0 · 1 rating" - or null when nobody has rated yet. */
export function formatTutorRating(summary: TutorRatingSummary) {
  if (!summary.count || summary.average === null) return null;
  return `${summary.average.toFixed(1)} · ${summary.count} ${summary.count === 1 ? "rating" : "ratings"}`;
}

/** Averages to one decimal, the way every screen shows it. */
export function summariseTutorRatings(ratings: readonly number[]): TutorRatingSummary {
  if (!ratings.length) return { average: null, count: 0 };
  const total = ratings.reduce((sum, rating) => sum + rating, 0);
  return { average: Math.round((total / ratings.length) * 10) / 10, count: ratings.length };
}
