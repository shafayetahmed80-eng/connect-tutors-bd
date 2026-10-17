/**
 * The ground an "Auto" poster is drawn on: the colour of the curriculum it is
 * about, so a feed of posters tells English Medium from Bangla Medium at a
 * glance. A poster about one curriculum takes that curriculum's colour; one
 * about several (or none) keeps the design's own, because no one colour is
 * right for it.
 *
 * The colours are the picker's own deep presets, so each draws as picked and
 * needs no legibility nudge (see palette.ts).
 */
export const AUTO_GROUND_BY_CURRICULUM: Record<string, string> = {
  "English Medium": "#0e2442",
  "English Version": "#0e3b43",
  "Bangla Medium": "#0b3d2e",
  "Madrasa Medium": "#2e1a47",
  "Admission Test": "#3a0b17",
};

/** A curriculum with no colour of its own. */
export const AUTO_GROUND_FALLBACK = "#1e293b";

/** The ground for a poster about these curricula (the stored English names), or null for the design's own. */
export function autoGroundForCurricula(curricula: string[]): string | null {
  const names = Array.from(new Set(curricula.map(name => name.trim()).filter(Boolean)));
  if (names.length !== 1) return null;
  return AUTO_GROUND_BY_CURRICULUM[names[0]] ?? AUTO_GROUND_FALLBACK;
}
