/**
 * Admin-editable site content.
 *
 * Every editable piece of copy is declared here as a "slot" with the text and
 * size the code ships with. The database only ever stores *overrides*, so an
 * empty table means the site renders exactly as written in code, and clearing
 * an override always restores the original. Nothing here can add or remove a
 * page section: the page structure stays in code, because those sections carry
 * validation and database writes.
 */

export const siteContentPageIds = ["tutor-profile", "guardian-profile"] as const;
export type SiteContentPageId = (typeof siteContentPageIds)[number];

/**
 * Size is stored as a step relative to the slot's own default rather than an
 * absolute class, so "one size larger" means the same thing on a page heading
 * and on a help line, and the design scale stays intact on small screens.
 */
export const siteContentTextSizes = ["smaller", "default", "larger", "largest"] as const;
export type SiteContentTextSize = (typeof siteContentTextSizes)[number];

const textSizeOffsets: Record<SiteContentTextSize, number> = {
  smaller: -1,
  default: 0,
  larger: 1,
  largest: 2,
};

/** The Tailwind type ramp the offsets walk along. */
const textScale = ["text-xs", "text-sm", "text-base", "text-lg", "text-xl", "text-2xl", "text-3xl"] as const;

export const siteContentSpacings = ["compact", "default", "roomy"] as const;
export type SiteContentSpacing = (typeof siteContentSpacings)[number];

const spacingClasses: Record<SiteContentSpacing, string> = {
  compact: "p-3 sm:p-3",
  default: "p-4 sm:p-5",
  roomy: "p-6 sm:p-8",
};

export type SiteContentSlot = {
  id: string;
  page: SiteContentPageId;
  /** Heading the admin editor groups this slot under. */
  group: string;
  /** What the admin sees as this slot's name. */
  label: string;
  defaultText: string;
  /**
   * The rung on the type ramp a size step counts from. Only used to compute an
   * override; when the admin leaves the size alone the call site's own class is
   * kept, so this need not match that class exactly.
   */
  defaultTextClass: (typeof textScale)[number];
};

export type SiteContentOverride = {
  slotId: string;
  text?: string | null;
  textSize?: SiteContentTextSize | null;
};

export type SiteContentSpacingSlot = {
  id: string;
  page: SiteContentPageId;
  group: string;
  label: string;
};

/** Tutor Profile workspace - the page a Tutor fills in at /tutor/dashboard/profile. */
const tutorProfileSlots: SiteContentSlot[] = [
  { id: "tutor-profile.tab.a", page: "tutor-profile", group: "Section tabs", label: "Personal tab", defaultText: "Personal", defaultTextClass: "text-sm" },
  { id: "tutor-profile.tab.c", page: "tutor-profile", group: "Section tabs", label: "Education tab", defaultText: "Education", defaultTextClass: "text-sm" },
  { id: "tutor-profile.tab.d", page: "tutor-profile", group: "Section tabs", label: "Tuition tab", defaultText: "Tuition & location", defaultTextClass: "text-sm" },
  { id: "tutor-profile.tab.e", page: "tutor-profile", group: "Section tabs", label: "Introduction tab", defaultText: "Introduction", defaultTextClass: "text-sm" },

  { id: "tutor-profile.group.a-identity", page: "tutor-profile", group: "Card headings", label: "Identity and contact", defaultText: "Identity and contact", defaultTextClass: "text-sm" },
  { id: "tutor-profile.group.a-family", page: "tutor-profile", group: "Card headings", label: "Family and emergency contact", defaultText: "Family and emergency contact", defaultTextClass: "text-sm" },
  { id: "tutor-profile.group.c-education", page: "tutor-profile", group: "Card headings", label: "Education", defaultText: "Education", defaultTextClass: "text-sm" },
  { id: "tutor-profile.group.c-teaching", page: "tutor-profile", group: "Card headings", label: "Teaching expertise", defaultText: "Teaching expertise", defaultTextClass: "text-sm" },
  { id: "tutor-profile.group.d-availability", page: "tutor-profile", group: "Card headings", label: "Availability", defaultText: "Availability", defaultTextClass: "text-sm" },
  { id: "tutor-profile.group.d-location", page: "tutor-profile", group: "Card headings", label: "Location and fee", defaultText: "Location and fee", defaultTextClass: "text-sm" },
  { id: "tutor-profile.group.d-communication", page: "tutor-profile", group: "Card headings", label: "Communication", defaultText: "Communication", defaultTextClass: "text-sm" },

  { id: "tutor-profile.form.qualification-history", page: "tutor-profile", group: "In-form headings", label: "Qualification history heading", defaultText: "Qualification history", defaultTextClass: "text-sm" },
  { id: "tutor-profile.form.location-fee-travel", page: "tutor-profile", group: "In-form headings", label: "Location, fee and travel heading", defaultText: "Location, fee and travel", defaultTextClass: "text-sm" },
  { id: "tutor-profile.form.language-communication", page: "tutor-profile", group: "In-form headings", label: "Teaching language and communication heading", defaultText: "Teaching language and communication", defaultTextClass: "text-sm" },
];

const siteContentSlots: SiteContentSlot[] = [...tutorProfileSlots];

const siteContentSpacingSlots: SiteContentSpacingSlot[] = [
  { id: "tutor-profile.spacing.section-card", page: "tutor-profile", group: "Spacing", label: "Section card padding" },
];

export function getSiteContentSlots(page: SiteContentPageId): SiteContentSlot[] {
  return siteContentSlots.filter(slot => slot.page === page);
}

export function getSiteContentSpacingSlots(page: SiteContentPageId): SiteContentSpacingSlot[] {
  return siteContentSpacingSlots.filter(slot => slot.page === page);
}

export function findSiteContentSlot(slotId: string): SiteContentSlot | undefined {
  return siteContentSlots.find(slot => slot.id === slotId);
}

export function findSiteContentSpacingSlot(slotId: string): SiteContentSpacingSlot | undefined {
  return siteContentSpacingSlots.find(slot => slot.id === slotId);
}

/** Longest text an override may carry; headings are short by design. */
export const MAX_SITE_CONTENT_TEXT_LENGTH = 240;

/**
 * Walks the type ramp from the slot's anchor by the chosen step, clamped so an
 * override can never fall off either end of the scale.
 *
 * Returns an empty string for the default, so a slot the admin has not touched
 * keeps whatever size class the call site already used - including one-off
 * values like `text-[13px]` that are not on the ramp.
 */
export function resolveSiteContentTextClass(slot: SiteContentSlot, size: SiteContentTextSize | null | undefined): string {
  if (!size || size === "default") return "";
  const base = textScale.indexOf(slot.defaultTextClass);
  if (base < 0) return "";
  const next = Math.min(textScale.length - 1, Math.max(0, base + textSizeOffsets[size]));
  return textScale[next];
}

export function resolveSiteContentSpacingClass(spacing: SiteContentSpacing | null | undefined): string {
  return spacingClasses[spacing ?? "default"];
}
