// Shared field + button styling for the public guardian and tutor journeys.
// Colours resolve through the `--j-*` design tokens declared in `index.css`.

/**
 * One label style for every field in a journey.
 *
 * The request steps used to set their own `text-sm font-extrabold` here, so a
 * form held 13px/600 labels beside 14px/800 ones and the eye could not tell
 * which weight meant what. The quieter of the two wins: a section legend is
 * `text-sm font-extrabold`, and a field label sitting under it should not
 * shout the same volume.
 */
export const fieldLabel = "block text-[13px] font-semibold text-j-ink-soft";

/** The red asterisk on a required field. One red, everywhere. */
export const requiredMark = "text-[#d74545]";
/** The grey "(optional)" note. One word for the idea, and one grey. */
export const optionalMark = "font-normal text-[#71889b]";

/**
 * The field grid every step lays out on.
 *
 * Two columns from `sm` up with one gutter. The account step used to run its
 * own `gap-x-7 md:grid-cols-2`, so the two halves of the same journey broke
 * to one column at different widths and sat on different gutters.
 */
export const fieldGrid = "grid gap-x-6 gap-y-4 sm:grid-cols-2";
/** A field that needs the full width of `fieldGrid` - a textarea, usually. */
export const fieldGridWide = "sm:col-span-2";

export const filledField =
  "modal-field-journey input-text-journey w-full rounded-xl border border-j-field-border bg-j-surface-sunken px-3.5 text-j-ink outline-none transition placeholder:text-[#9aabbb] focus:border-j-accent focus:bg-white focus:ring-4 focus:ring-j-accent/12";

export const filledArea =
  "input-text-journey w-full rounded-xl border border-j-field-border bg-j-surface-sunken px-3.5 py-3 leading-6 text-j-ink outline-none transition placeholder:text-[#9aabbb] focus:border-j-accent focus:bg-white focus:ring-4 focus:ring-j-accent/12";

// Height, text size, and horizontal padding are the Owner's, set in
// Admin > Button Section and applied against `.journey-button` - the literal
// min-h-12/px-5/py-3/text-sm that used to sit here are gone, so nothing
// competes with the rule that replaces them.
const journeyButton =
  "journey-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-extrabold transition focus:outline-none focus:ring-4 focus:ring-j-accent/25 disabled:cursor-wait disabled:opacity-60";

export const primaryButton = `${journeyButton} bg-j-accent text-white shadow-[0_10px_20px_rgba(22,125,221,.24)] hover:-translate-y-0.5 hover:bg-j-accent-hover`;

export const ghostButton = `${journeyButton} bg-[#eef5f9] text-[#365d7d] hover:bg-[#e1eff7]`;
