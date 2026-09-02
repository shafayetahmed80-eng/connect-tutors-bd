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

export const siteContentPageIds = ["site", "tutor-profile", "guardian-profile"] as const;
export type SiteContentPageId = (typeof siteContentPageIds)[number];

/**
 * Size is stored as an absolute pixel value, so what an Admin types is exactly
 * what renders.
 *
 * The trade this makes: a step scale could never fall off the design ramp,
 * while a free number can be set large enough to break a layout on a narrow
 * screen. The bounds below are the only guard, deliberately wide.
 */
export const MIN_SITE_CONTENT_TEXT_PX = 10;
export const MAX_SITE_CONTENT_TEXT_PX = 48;

/**
 * Size the profile record rows ship at - label, value, "—" and "Not given" all
 * share it. Declared here rather than in the theme file because both the
 * rendering tokens and the Admin control have to agree on one number.
 */
export const TUTOR_PROFILE_RECORD_ROW_PX = 12;

/** The Tailwind type ramp slots anchor to, and what each rung measures. */
const textScale = ["text-xs", "text-sm", "text-base", "text-lg", "text-xl", "text-2xl", "text-3xl"] as const;

/**
 * Pixel value of each rung, used to show an Admin the size a slot ships at
 * before they change it. Tailwind's default scale against a 16px root, which
 * this project does not override.
 */
const textScalePx: Record<(typeof textScale)[number], number> = {
  "text-xs": 12,
  "text-sm": 14,
  "text-base": 16,
  "text-lg": 18,
  "text-xl": 20,
  "text-2xl": 24,
  "text-3xl": 30,
};

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
   * "text" is display copy, which the size step applies to. "phone" is a value
   * other code builds links from, so the editor hides the size control and the
   * server checks the format - a malformed number breaks every wa.me link.
   */
  kind?: "text" | "phone";
  /**
   * The rung on the type ramp this slot ships at. Only used to show the Admin
   * the starting size; when they leave the size alone the call site's own class
   * is kept, so this need not match that class exactly.
   */
  defaultTextClass: (typeof textScale)[number];
};

export type SiteContentOverride = {
  slotId: string;
  text?: string | null;
  textSizePx?: number | null;
};

export type SiteContentSpacingSlot = {
  id: string;
  page: SiteContentPageId;
  surface: string;
  group: string;
  label: string;
};

/**
 * A slot that carries only a size, with no copy of its own.
 *
 * Record rows are built from tutor data rather than from fixed copy, so there
 * is no text to edit - but their size still needs to be adjustable without a
 * deploy. Parallel to the spacing-only slots above.
 */
export type SiteContentSizeSlot = {
  id: string;
  page: SiteContentPageId;
  surface: string;
  group: string;
  label: string;
  /** What the size is in code, and what Reset returns to. */
  defaultPx: number;
  /** Shown under the control so the Admin knows what it moves. */
  help: string;
};

/** Site-wide values, shown on public pages as well as the dashboards. */
const siteSlots: SiteContentSlot[] = [
  { id: "site.contact.whatsapp", page: "site", surface: "Contact", group: "Support", label: "WhatsApp / call number", kind: "phone", defaultText: "8801516131411", defaultTextClass: "text-sm" },
];

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
  ...siteSlots,
  ...tutorProfileSlots,
  ...publicTutorProfileSlots,
  ...guardianProfileSlots,
  ...requestTutorSlots,
];

const siteContentSpacingSlots: SiteContentSpacingSlot[] = [
  { id: "tutor-profile.spacing.section-card", page: "tutor-profile", surface: "Tutor dashboard", group: "Spacing", label: "Section card padding" },
];

const siteContentSizeSlots: SiteContentSizeSlot[] = [
  {
    id: "tutor-profile.size.record-row",
    page: "tutor-profile",
    surface: "Tutor dashboard",
    group: "Text size",
    label: "Profile record rows",
    defaultPx: TUTOR_PROFILE_RECORD_ROW_PX,
    help: "Field names and their values on every profile tab, including “Not given”.",
  },
];

export function getSiteContentSlots(page: SiteContentPageId): SiteContentSlot[] {
  return siteContentSlots.filter(slot => slot.page === page);
}

export function getSiteContentSpacingSlots(page: SiteContentPageId): SiteContentSpacingSlot[] {
  return siteContentSpacingSlots.filter(slot => slot.page === page);
}

export function getSiteContentSizeSlots(page: SiteContentPageId): SiteContentSizeSlot[] {
  return siteContentSizeSlots.filter(slot => slot.page === page);
}

/** Surfaces in declaration order, so the editor mirrors the registry. */
export function getSiteContentSurfaces(page: SiteContentPageId): string[] {
  const surfaces = [
    ...getSiteContentSlots(page).map(slot => slot.surface),
    ...getSiteContentSpacingSlots(page).map(slot => slot.surface),
    ...getSiteContentSizeSlots(page).map(slot => slot.surface),
  ];
  return surfaces.filter((surface, index) => surfaces.indexOf(surface) === index);
}

export function findSiteContentSlot(slotId: string): SiteContentSlot | undefined {
  return siteContentSlots.find(slot => slot.id === slotId);
}

export function findSiteContentSpacingSlot(slotId: string): SiteContentSpacingSlot | undefined {
  return siteContentSpacingSlots.find(slot => slot.id === slotId);
}

export function findSiteContentSizeSlot(slotId: string): SiteContentSizeSlot | undefined {
  return siteContentSizeSlots.find(slot => slot.id === slotId);
}

/** Longest text an override may carry; headings are short by design. */
export const MAX_SITE_CONTENT_TEXT_LENGTH = 240;

/** The size a slot ships at, shown as the starting point in the admin editor. */
export function siteContentSlotDefaultPx(slot: SiteContentSlot): number {
  return textScalePx[slot.defaultTextClass];
}

/** Keeps a stored or typed size inside the supported range. */
export function clampSiteContentTextPx(px: number): number {
  return Math.min(MAX_SITE_CONTENT_TEXT_PX, Math.max(MIN_SITE_CONTENT_TEXT_PX, Math.round(px)));
}

/**
 * The inline style that applies an overridden size, or `undefined` when there
 * is no override.
 *
 * Returning nothing for the untouched case is what keeps the site byte-identical
 * to what ships: no inline style means the call site's own class still decides,
 * including one-off values like `text-[13px]` that are not on the ramp. A
 * Tailwind class cannot be used here because arbitrary values are generated at
 * build time, and this number only exists at runtime.
 */
export function resolveSiteContentTextStyle(px: number | null | undefined): { fontSize: string } | undefined {
  if (px == null) return undefined;
  return { fontSize: `${clampSiteContentTextPx(px)}px` };
}

export function resolveSiteContentSpacingClass(spacing: SiteContentSpacing | null | undefined): string {
  return spacingClasses[spacing ?? "default"];
}

/**
 * Notice blocks: extra content an Admin can add, remove and reorder at a fixed
 * set of anchor points.
 *
 * Anchors are declared in code, so a block can only ever appear where a page
 * has made room for it. This is the deliberate limit on the CMS side of the
 * Dynamic Section: an Admin can add content around the page's own sections but
 * cannot delete or reorder those, because they carry validation and database
 * writes that a page cannot function without.
 */
export const siteContentBlockTones = ["info", "warning", "success"] as const;
export type SiteContentBlockTone = (typeof siteContentBlockTones)[number];

export type SiteContentAnchor = {
  id: string;
  page: SiteContentPageId;
  surface: string;
  label: string;
};

const siteContentAnchors: SiteContentAnchor[] = [
  { id: "tutor-profile.top", page: "tutor-profile", surface: "Tutor dashboard", label: "Above the profile tabs" },
  { id: "tutor-profile.bottom", page: "tutor-profile", surface: "Tutor dashboard", label: "Below the profile sections" },
  { id: "public-tutor.top", page: "tutor-profile", surface: "Public tutor profile", label: "Above the profile body" },
  { id: "guardian-profile.top", page: "guardian-profile", surface: "Guardian dashboard", label: "Above the profile form" },
  { id: "request-tutor.top", page: "guardian-profile", surface: "Request a tutor", label: "Above the journey" },
];

export function getSiteContentAnchors(page: SiteContentPageId): SiteContentAnchor[] {
  return siteContentAnchors.filter(anchor => anchor.page === page);
}

export function findSiteContentAnchor(anchorId: string): SiteContentAnchor | undefined {
  return siteContentAnchors.find(anchor => anchor.id === anchorId);
}

export const MAX_SITE_CONTENT_BLOCK_HEADING = 120;
export const MAX_SITE_CONTENT_BLOCK_BODY = 1000;

/**
 * Bangladesh mobile number in the form links are built from: 880 followed by
 * the 10-digit national number, no plus, no spaces. The same shape the tutor
 * and guardian forms already accept, minus the leading "+".
 */
const contactNumberPattern = /^8801[3-9]\d{8}$/;

export function isSiteContactNumber(value: string) {
  return contactNumberPattern.test(value.trim());
}

/**
 * Strips anything a person might type around the digits - "+", spaces, dashes,
 * a leading 0 or a bare 1XXXXXXXXX - so a reasonable entry still produces a
 * working link instead of a silent 404 on wa.me.
 */
export function normalizeSiteContactNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `88${digits}`;
  if (digits.startsWith("1")) return `880${digits}`;
  return digits;
}

/** wa.me link, optionally pre-filling the message box. */
export function whatsappHref(number: string, message?: string) {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function telHref(number: string) {
  return `tel:+${number}`;
}
