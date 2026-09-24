/**
 * One visual vocabulary for every Tutor Profile surface (read view, tab editor,
 * section popup, workspace chrome). Painted from the `tp-*` tokens in
 * client/src/index.css - the colours an Owner may change for the profile -
 * and the app-wide `j-*` tokens for success, warning and quiet surfaces.
 * Presentational only — no behaviour lives here.
 */
export const tutorProfileTheme = {
  /** Vertical rhythm between the workspace's top-level blocks. */
  stack: "space-y-4",

  /** Standard elevated card. */
  card: "nav-section-card rounded-2xl border border-tp-border bg-tp-card shadow-[0_1px_2px_rgba(23,59,96,0.04),0_10px_28px_rgba(23,59,96,0.06)]",
  /** Quiet inset panel (help text, review strip). */
  cardSunken: "nav-section-card rounded-2xl border border-tp-border bg-j-surface-sunken",
  /** Default card padding. */
  cardPad: "p-5",
  /** Hairline divider colour. */
  hairline: "border-tp-border",

  /** Section / card heading. */
  heading: "font-bold tracking-[-0.02em] text-tp-heading",
  /** Secondary paragraph text. */
  bodySoft: "text-tp-label",
  /** Small uppercase group label. */
  eyebrow: "text-[11px] font-bold uppercase tracking-[0.14em] text-tp-label",

  /** Read-out row label / value. */
  rowLabel: "text-[12px] text-tp-label",
  rowValue: "text-[12px] font-medium text-tp-value",
  /** Value shown for an empty optional field ("—"). */
  rowValueMuted: "text-[12px] text-tp-label",
  /** Value shown for an empty required field. */
  rowValueMissing: "text-[12px] font-medium text-tp-danger-ink",
  /**
   * The same treatments without a size, for call sites that set their own.
   * Combining one of the sized tokens above with another `text-*` class
   * leaves two font sizes on one element and no reliable winner - the Tutor
   * read-out needs that, because on a phone its label and value are
   * deliberately two different sizes.
   */
  rowLabelTone: "text-tp-label",
  rowValueTone: "font-medium text-tp-value",
  rowValueMutedTone: "text-tp-label",
  rowValueMissingTone: "font-medium text-tp-danger-ink",

  /**
   * One label style for every control in the section editor.
   *
   * Inputs, selects, multi-selects and choice groups each used to bring their
   * own size and weight, so two fields side by side in the same grid did not
   * look like they belonged together.
   */
  fieldLabel: "block text-[12px] font-semibold text-tp-value",
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
  requiredMark: "text-tp-danger",

  /** Pill / chip base (add tone classes per use). */
  pill: "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",

  /**
   * Ghost icon button (e.g. the per-section edit pencil). A phone gives it
   * 40px to be tapped in; the icon inside keeps its size.
   */
  ghostIconButton:
    "inline-grid place-items-center rounded-lg p-1.5 text-tp-label transition hover:bg-tp-accent-wash hover:text-tp-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tp-accent/40 disabled:opacity-50 max-md:size-10",
  /** Primary action button. */
  primaryButton:
    "rounded-xl bg-tp-accent font-bold text-white transition hover:bg-tp-accent-hover disabled:cursor-wait disabled:opacity-70",
} as const;
