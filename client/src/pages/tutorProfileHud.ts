/**
 * The section editor's dark "HUD" surface.
 *
 * Modelled on a glass heads-up panel: a dark base, a translucent surface with
 * the page blurred behind it, a thin lit edge, and cyan as the single accent.
 * Deliberately the restrained version of that language - this dialog is where a
 * tutor types their address and their family's phone numbers, so contrast and
 * legibility win over glow wherever the two disagree.
 *
 * Everything here is scoped to the dialog. The controls it styles
 * (`SearchableMultiSelect`, `CatalogSearchField`, the `Form*` fields) render
 * nowhere else, so no other screen changes.
 */

/** Base ink, surfaces and lines. */
export const hud = {
  /** The dialog panel itself: glass over the blurred page. */
  panel: "bg-[#0e2233]/95 supports-[backdrop-filter]:bg-[#0e2233]/85 backdrop-blur-xl",
  /** Header and footer bands, a shade deeper than the body. */
  band: "bg-[#0a1a29]/80",
  /** Hairline between bands and between rows. */
  line: "border-[#2c4a63]",
  lineSoft: "border-[#24405a]",

  /** The lit edge and the bloom around the panel. */
  edge: "ring-1 ring-[#4fd1ff]/20",
  bloom: "shadow-[0_30px_90px_-20px_rgba(0,0,0,0.75),0_0_70px_-25px_rgba(56,189,248,0.45)]",

  /** Text, brightest first. */
  textStrong: "text-[#eaf6ff]",
  text: "text-[#cfe6f5]",
  textMuted: "text-[#8fb0c7]",
  textFaint: "text-[#6d8ba3]",
  accentText: "text-[#5cd1ff]",
} as const;

/**
 * One input, select or textarea. Kept as a single string because every control
 * in the dialog has to match exactly - a field that differs by one shade is
 * what made the light version look assembled from parts.
 */
export const hudFieldClassName =
  "mt-1 w-full min-w-0 rounded-lg border border-[#2f5675] bg-[#0a1a29]/70 px-2.5 py-1.5 text-[12px] text-[#eaf6ff] outline-none transition placeholder:text-[#6d8ba3] hover:border-[#3d6b8f] focus:border-[#4fd1ff] focus:bg-[#0a1a29] focus:ring-2 focus:ring-[#4fd1ff]/25 disabled:cursor-not-allowed disabled:bg-[#0a1a29]/40 disabled:text-[#6d8ba3]";

/** The same treatment for a control that is a button rather than an input. */
export const hudTriggerClassName =
  "mt-1 flex min-h-9 items-center justify-between gap-3 rounded-lg border border-[#2f5675] bg-[#0a1a29]/70 px-2.5 py-1.5 text-left text-[12px] outline-none transition hover:border-[#3d6b8f] focus:border-[#4fd1ff] focus:ring-2 focus:ring-[#4fd1ff]/25 disabled:cursor-not-allowed disabled:bg-[#0a1a29]/40";

/** Field label, and the marker on a required one. */
export const hudLabelClassName = "block text-[12px] font-semibold text-[#a9cfe6]";
export const hudRowClassName = "block text-[12px] font-normal";
export const hudRequiredMark = "text-[#ff9a9a]";

/** Help text under a field, and the message when it is wrong. */
export const hudHintClassName = "mt-1 block text-[11px] font-normal leading-4 text-[#7f9db4]";
export const hudErrorClassName = "mt-1 block text-[11px] font-medium leading-4 text-[#ff9a9a]";
export const hudErrorBorder = "border-[#e06b6b]";

/** A named group of fields inside the dialog. */
export const hudSectionTitleClassName = "text-[13px] font-bold text-[#eaf6ff]";

/** The floating list a multi-select opens. */
export const hudPopoverClassName =
  "rounded-xl border border-[#2f5675] bg-[#0e2233]/95 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl";
export const hudOptionRowClassName =
  "flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-[#cfe6f5] transition hover:bg-[#4fd1ff]/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#4fd1ff]";
export const hudChipClassName =
  "inline-flex items-center gap-1 rounded-full border border-[#4fd1ff]/30 bg-[#4fd1ff]/12 py-0.5 pl-2 pr-1 text-[11px] font-semibold text-[#8fdcff]";

/** A checkbox or radio, tinted so it reads as lit rather than painted. */
export const hudControlAccent = "accent-[#4fd1ff]";
