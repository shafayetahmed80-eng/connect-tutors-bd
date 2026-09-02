/**
 * One visual vocabulary for every Tutor Profile surface (read view, tab editor,
 * section popup, workspace chrome). Reuses the app-wide `j-*` design tokens
 * (client/src/index.css) and adds only the few greys the profile screens need.
 * Presentational only — no behaviour lives here.
 */
export const tutorProfileTheme = {
  /** Vertical rhythm between the workspace's top-level blocks. */
  stack: "space-y-4",

  /** Standard elevated card. */
  card: "rounded-2xl border border-j-border bg-white shadow-[0_1px_2px_rgba(23,59,96,0.04),0_10px_28px_rgba(23,59,96,0.06)]",
  /** Quiet inset panel (help text, review strip). */
  cardSunken: "rounded-2xl border border-j-border bg-j-surface-sunken",
  /** Default card padding. */
  cardPad: "p-5",
  /** Hairline divider colour. */
  hairline: "border-j-border",

  /** Section / card heading. */
  heading: "font-bold tracking-[-0.02em] text-j-ink",
  /** Secondary paragraph text. */
  bodySoft: "text-[#5e7a90]",
  /** Small uppercase group label. */
  eyebrow: "text-[11px] font-bold uppercase tracking-[0.14em] text-[#8496a6]",

  /** Read-out row label / value. */
  rowLabel: "text-[12px] text-[#6b8497]",
  rowValue: "text-[12px] font-medium text-[#243b52]",
  /** Value shown for an empty optional field ("—"). */
  rowValueMuted: "text-[12px] text-[#9aabbb]",
  /** Value shown for an empty required field. */
  rowValueMissing: "text-[12px] font-medium text-j-err",
  /**
   * The same "missing" treatment without a size, for call sites that set their
   * own. Combining `rowValueMissing` with another `text-*` class leaves two
   * font sizes on one element and no reliable winner.
   */
  rowValueMissingTone: "font-medium text-j-err",

  /**
   * One label style for every control in the section editor.
   *
   * Inputs, selects, multi-selects and choice groups each used to bring their
   * own size and weight, so two fields side by side in the same grid did not
   * look like they belonged together.
   */
  fieldLabel: "block text-[12px] font-semibold text-[#244a6a]",
  /**
   * The wrapper around a label and its control.
   *
   * `index.css` sets `font: inherit` on form elements as an unlayered rule,
   * which in Tailwind v4 outranks every utility class - so a `text-*` class on
   * an input has never had any effect. The control takes its size and weight
   * from here instead, which is the one thing that does reach it.
   */
  fieldRow: "block text-[12px] font-normal",
  /** The red asterisk that marks a required field. */
  requiredMark: "text-[#d84a4a]",

  /** Pill / chip base (add tone classes per use). */
  pill: "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",

  /** Ghost icon button (e.g. the per-section edit pencil). */
  ghostIconButton:
    "rounded-lg p-1.5 text-[#6b8497] transition hover:bg-j-accent-wash hover:text-j-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent/40 disabled:opacity-50",
  /** Primary action button. */
  primaryButton:
    "rounded-xl bg-j-accent font-bold text-white transition hover:bg-j-accent-hover disabled:cursor-wait disabled:opacity-70",
} as const;
