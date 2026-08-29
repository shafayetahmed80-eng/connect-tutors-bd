// Shared field + button styling for the public guardian and tutor journeys.
// Colours resolve through the `--j-*` design tokens declared in `index.css`.

export const fieldLabel = "block text-[13px] font-semibold text-j-ink-soft";

export const filledField =
  "h-12 w-full rounded-xl border border-j-field-border bg-j-surface-sunken px-3.5 text-sm text-j-ink outline-none transition placeholder:text-[#9aabbb] focus:border-j-accent focus:bg-white focus:ring-4 focus:ring-j-accent/12";

export const filledArea =
  "w-full rounded-xl border border-j-field-border bg-j-surface-sunken px-3.5 py-3 text-sm leading-6 text-j-ink outline-none transition placeholder:text-[#9aabbb] focus:border-j-accent focus:bg-white focus:ring-4 focus:ring-j-accent/12";

const journeyButton =
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 py-3 text-sm font-extrabold transition focus:outline-none focus:ring-4 focus:ring-j-accent/25 disabled:cursor-wait disabled:opacity-60";

export const primaryButton = `${journeyButton} bg-j-accent text-white shadow-[0_10px_20px_rgba(22,125,221,.24)] hover:-translate-y-0.5 hover:bg-j-accent-hover`;

export const ghostButton = `${journeyButton} bg-[#eef5f9] text-[#365d7d] hover:bg-[#e1eff7]`;
