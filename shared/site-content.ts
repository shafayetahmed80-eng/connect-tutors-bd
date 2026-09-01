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
  /**
   * Which page the copy appears on. One admin page covers more than one
   * surface, so the editor groups by this first and by `group` within it.
   */
  surface: string;
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
  surface: string;
  group: string;
  label: string;
};

/** Tutor Profile workspace - the page a Tutor fills in at /tutor/dashboard/profile. */
const tutorProfileSlots: SiteContentSlot[] = [
  { id: "tutor-profile.tab.a", page: "tutor-profile", surface: "Tutor dashboard", group: "Section tabs", label: "Personal tab", defaultText: "Personal", defaultTextClass: "text-sm" },
  { id: "tutor-profile.tab.c", page: "tutor-profile", surface: "Tutor dashboard", group: "Section tabs", label: "Education tab", defaultText: "Education", defaultTextClass: "text-sm" },
  { id: "tutor-profile.tab.d", page: "tutor-profile", surface: "Tutor dashboard", group: "Section tabs", label: "Tuition tab", defaultText: "Tuition & location", defaultTextClass: "text-sm" },
  { id: "tutor-profile.tab.e", page: "tutor-profile", surface: "Tutor dashboard", group: "Section tabs", label: "Introduction tab", defaultText: "Introduction", defaultTextClass: "text-sm" },

  { id: "tutor-profile.group.a-identity", page: "tutor-profile", surface: "Tutor dashboard", group: "Card headings", label: "Identity and contact", defaultText: "Identity and contact", defaultTextClass: "text-sm" },
  { id: "tutor-profile.group.a-family", page: "tutor-profile", surface: "Tutor dashboard", group: "Card headings", label: "Family and emergency contact", defaultText: "Family and emergency contact", defaultTextClass: "text-sm" },
  { id: "tutor-profile.group.c-education", page: "tutor-profile", surface: "Tutor dashboard", group: "Card headings", label: "Education", defaultText: "Education", defaultTextClass: "text-sm" },
  { id: "tutor-profile.group.c-teaching", page: "tutor-profile", surface: "Tutor dashboard", group: "Card headings", label: "Teaching expertise", defaultText: "Teaching expertise", defaultTextClass: "text-sm" },
  { id: "tutor-profile.group.d-availability", page: "tutor-profile", surface: "Tutor dashboard", group: "Card headings", label: "Availability", defaultText: "Availability", defaultTextClass: "text-sm" },
  { id: "tutor-profile.group.d-location", page: "tutor-profile", surface: "Tutor dashboard", group: "Card headings", label: "Location and fee", defaultText: "Location and fee", defaultTextClass: "text-sm" },
  { id: "tutor-profile.group.d-communication", page: "tutor-profile", surface: "Tutor dashboard", group: "Card headings", label: "Communication", defaultText: "Communication", defaultTextClass: "text-sm" },

  { id: "tutor-profile.form.qualification-history", page: "tutor-profile", surface: "Tutor dashboard", group: "In-form headings", label: "Qualification history heading", defaultText: "Qualification history", defaultTextClass: "text-sm" },
  { id: "tutor-profile.form.location-fee-travel", page: "tutor-profile", surface: "Tutor dashboard", group: "In-form headings", label: "Location, fee and travel heading", defaultText: "Location, fee and travel", defaultTextClass: "text-sm" },
  { id: "tutor-profile.form.language-communication", page: "tutor-profile", surface: "Tutor dashboard", group: "In-form headings", label: "Teaching language and communication heading", defaultText: "Teaching language and communication", defaultTextClass: "text-sm" },
];

/** The public Tutor profile at /tutors/:id, shared under the same admin page. */
const publicTutorProfileSlots: SiteContentSlot[] = [
  { id: "public-tutor.hero.eyebrow", page: "tutor-profile", surface: "Public tutor profile", group: "Header", label: "Header eyebrow", defaultText: "Verified tutor profile", defaultTextClass: "text-xs" },
  { id: "public-tutor.hero.cta", page: "tutor-profile", surface: "Public tutor profile", group: "Header", label: "Request button", defaultText: "Request this tutor", defaultTextClass: "text-sm" },
  { id: "public-tutor.hero.cta-note", page: "tutor-profile", surface: "Public tutor profile", group: "Header", label: "Note under the button", defaultText: "Contact details stay private", defaultTextClass: "text-xs" },

  { id: "public-tutor.tab.personal", page: "tutor-profile", surface: "Public tutor profile", group: "Section tabs", label: "Personal tab", defaultText: "Personal", defaultTextClass: "text-sm" },
  { id: "public-tutor.tab.education", page: "tutor-profile", surface: "Public tutor profile", group: "Section tabs", label: "Education tab", defaultText: "Education", defaultTextClass: "text-sm" },
  { id: "public-tutor.tab.preferences", page: "tutor-profile", surface: "Public tutor profile", group: "Section tabs", label: "Preferences tab", defaultText: "Tuition preferences", defaultTextClass: "text-sm" },

  { id: "public-tutor.personal.eyebrow", page: "tutor-profile", surface: "Public tutor profile", group: "Personal section", label: "Eyebrow", defaultText: "A little about the tutor", defaultTextClass: "text-xs" },
  { id: "public-tutor.personal.heading", page: "tutor-profile", surface: "Public tutor profile", group: "Personal section", label: "Heading", defaultText: "Personal overview", defaultTextClass: "text-xl" },

  { id: "public-tutor.education.eyebrow", page: "tutor-profile", surface: "Public tutor profile", group: "Education section", label: "Eyebrow", defaultText: "Academic background", defaultTextClass: "text-xs" },
  { id: "public-tutor.education.heading", page: "tutor-profile", surface: "Public tutor profile", group: "Education section", label: "Heading", defaultText: "Education & expertise", defaultTextClass: "text-xl" },

  { id: "public-tutor.preferences.eyebrow", page: "tutor-profile", surface: "Public tutor profile", group: "Preferences section", label: "Eyebrow", defaultText: "How learning can happen", defaultTextClass: "text-xs" },
  { id: "public-tutor.preferences.heading", page: "tutor-profile", surface: "Public tutor profile", group: "Preferences section", label: "Heading", defaultText: "Tuition preferences", defaultTextClass: "text-xl" },

  { id: "public-tutor.trust.title", page: "tutor-profile", surface: "Public tutor profile", group: "Trust panel", label: "Panel title", defaultText: "Connect Tutors promise", defaultTextClass: "text-sm" },
  { id: "public-tutor.trust.heading", page: "tutor-profile", surface: "Public tutor profile", group: "Trust panel", label: "Panel heading", defaultText: "A considered start for every learner.", defaultTextClass: "text-lg" },
  { id: "public-tutor.trust.body", page: "tutor-profile", surface: "Public tutor profile", group: "Trust panel", label: "Panel body", defaultText: "Begin with a structured request. We share contact details only through the existing matching and consent process.", defaultTextClass: "text-sm" },
  { id: "public-tutor.trust.cta", page: "tutor-profile", surface: "Public tutor profile", group: "Trust panel", label: "Panel button", defaultText: "Start a request", defaultTextClass: "text-sm" },
  { id: "public-tutor.privacy.title", page: "tutor-profile", surface: "Public tutor profile", group: "Trust panel", label: "Privacy note title", defaultText: "Privacy by design", defaultTextClass: "text-sm" },
];

/** Guardian dashboard profile at /guardian/dashboard/profile. */
const guardianProfileSlots: SiteContentSlot[] = [
  { id: "guardian-profile.heading", page: "guardian-profile", surface: "Guardian dashboard", group: "Profile page", label: "Page heading", defaultText: "Profile", defaultTextClass: "text-3xl" },
  { id: "guardian-profile.photo.title", page: "guardian-profile", surface: "Guardian dashboard", group: "Profile page", label: "Photo card title", defaultText: "Profile photo", defaultTextClass: "text-xl" },
  { id: "guardian-profile.photo.help", page: "guardian-profile", surface: "Guardian dashboard", group: "Profile page", label: "Photo help text", defaultText: "JPEG, PNG, or WebP only; up to 5 MB; minimum 300 × 300 pixels. Uploads are private and must be approved before they appear in your Guardian identity header.", defaultTextClass: "text-xs" },
];

/** The public "Request a tutor" journey at /request-tutor. */
const requestTutorSlots: SiteContentSlot[] = [
  { id: "request-tutor.phone.heading", page: "guardian-profile", surface: "Request a tutor", group: "Journey steps", label: "Phone step heading", defaultText: "Start with your phone number", defaultTextClass: "text-2xl" },
  { id: "request-tutor.account.heading", page: "guardian-profile", surface: "Request a tutor", group: "Journey steps", label: "Account step heading", defaultText: "Create your Guardian account", defaultTextClass: "text-2xl" },
  { id: "request-tutor.done.heading", page: "guardian-profile", surface: "Request a tutor", group: "Journey steps", label: "Confirmation heading", defaultText: "Thank you. Your request is now pending review.", defaultTextClass: "text-3xl" },
];

const siteContentSlots: SiteContentSlot[] = [
  ...tutorProfileSlots,
  ...publicTutorProfileSlots,
  ...guardianProfileSlots,
  ...requestTutorSlots,
];

const siteContentSpacingSlots: SiteContentSpacingSlot[] = [
  { id: "tutor-profile.spacing.section-card", page: "tutor-profile", surface: "Tutor dashboard", group: "Spacing", label: "Section card padding" },
];

export function getSiteContentSlots(page: SiteContentPageId): SiteContentSlot[] {
  return siteContentSlots.filter(slot => slot.page === page);
}

export function getSiteContentSpacingSlots(page: SiteContentPageId): SiteContentSpacingSlot[] {
  return siteContentSpacingSlots.filter(slot => slot.page === page);
}

/** Surfaces in declaration order, so the editor mirrors the registry. */
export function getSiteContentSurfaces(page: SiteContentPageId): string[] {
  const surfaces = [
    ...getSiteContentSlots(page).map(slot => slot.surface),
    ...getSiteContentSpacingSlots(page).map(slot => slot.surface),
  ];
  return surfaces.filter((surface, index) => surfaces.indexOf(surface) === index);
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
