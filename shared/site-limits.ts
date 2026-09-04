/**
 * The numbers the Owner can change without a deploy.
 *
 * Every one of these was a literal sitting in a zod schema, and a literal in a
 * schema is invisible: the Guardian request form told people to "choose every
 * subject you need a tutor for" and said nothing about a cap of twelve, so the
 * twelfth subject was fine and the thirteenth was a validation error with no
 * warning beforehand. Naming each limit once is most of the fix; making it
 * editable and showing it on the form is the rest.
 *
 * A Guardian's request and a Tutor's profile both have subjects, levels and
 * languages, and they are **not** the same limit: one is what a family is
 * asking for, the other is what a person teaches. They are listed separately
 * here because merging them would be a decision nobody made.
 *
 * Each limit carries the bounds it may be moved between. They are not
 * decoration: a cap of zero would make a required field unfillable, and a text
 * length above the database column would fail on save rather than in
 * validation, which is a worse error in every way.
 */
export const siteLimitIds = [
  "request.subjects",
  "request.levels",
  "request.languages",
  "tutor.subjects",
  "tutor.levels",
  "tutor.languages",
  "tutor.educationRecords",
  "jobBoard.expiryDays",
  "upload.documentMb",
  "photo.minDimension",
  "photo.maxDimension",
  "tutor.headlineChars",
  "request.addressChars",
  // Pixel sizes for the one dialog shell every panel shares. Not a domain cap
  // like the rest, but the same thing mechanically: a named number an Owner
  // moves between bounds without a deploy.
  "modal.width.sm",
  "modal.width.md",
  "modal.width.lg",
  "modal.maxHeight",
  "modal.fieldHeight.profile",
  "modal.fieldHeight.journey",
  "modal.radius",
  "modal.motionMs",
  "modal.backdropOpacity",
  "modal.shadowBlur",
  "modal.shadowOpacity",
  // The size of the letters typed into a box, kept apart from the box's own
  // height above - one is type, the other is layout, and an Owner moving one
  // should not have to think about the other.
  "inputText.profile",
  "inputText.journey",
] as const;

export type SiteLimitId = (typeof siteLimitIds)[number];

export type SiteLimitGroup = "Selection" | "Job board" | "Uploads" | "Text length" | "Modals" | "Input Field Text";

export type SiteLimitMeta = {
  id: SiteLimitId;
  group: SiteLimitGroup;
  label: string;
  /** What moving it changes, in the Owner's terms. */
  help: string;
  /** Word after the number in the editor: "12 subjects", "14 days". */
  unit: string;
  value: number;
  min: number;
  max: number;
};

/**
 * `max` is a real ceiling, not a guess. Where a limit measures text, it is the
 * width of the column that stores it - raising it further needs a migration,
 * so the editor will not offer what the database would refuse.
 */
export const siteLimits: SiteLimitMeta[] = [
  {
    id: "request.subjects",
    group: "Selection",
    label: "Subjects per request",
    help: "How many subjects a Guardian may choose when asking for a tutor.",
    unit: "subjects",
    value: 12,
    min: 1,
    max: 20,
  },
  {
    id: "request.levels",
    group: "Selection",
    label: "Class levels per request",
    help: "How many class levels one request may cover.",
    unit: "levels",
    value: 12,
    min: 1,
    max: 20,
  },
  {
    id: "request.languages",
    group: "Selection",
    label: "Languages per request",
    help: "How many teaching languages one request may ask for.",
    unit: "languages",
    value: 8,
    min: 1,
    max: 20,
  },
  {
    id: "tutor.subjects",
    group: "Selection",
    label: "Subjects per Tutor",
    help: "How many subjects a Tutor may say they teach. Separate from the request limit above.",
    unit: "subjects",
    value: 8,
    min: 1,
    max: 20,
  },
  {
    id: "tutor.levels",
    group: "Selection",
    label: "Class levels per Tutor",
    help: "How many class levels a Tutor may say they teach.",
    unit: "levels",
    value: 8,
    min: 1,
    max: 20,
  },
  {
    id: "tutor.languages",
    group: "Selection",
    label: "Languages per Tutor",
    help: "How many languages a Tutor may say they teach in.",
    unit: "languages",
    value: 6,
    min: 1,
    max: 20,
  },
  {
    id: "tutor.educationRecords",
    group: "Selection",
    label: "Education records per Tutor",
    help: "How many degrees and certificates a Tutor may list.",
    unit: "records",
    value: 12,
    min: 1,
    max: 20,
  },
  {
    id: "jobBoard.expiryDays",
    group: "Job board",
    label: "Job expires after",
    help: "How long a published job stays on the board. Changing this affects jobs published from now on, not ones already live.",
    unit: "days",
    value: 14,
    min: 1,
    max: 180,
  },
  {
    id: "upload.documentMb",
    group: "Uploads",
    label: "Certificate file size",
    help: "Largest certificate or document a Tutor may upload.",
    unit: "MB",
    value: 5,
    min: 1,
    max: 20,
  },
  {
    id: "photo.minDimension",
    group: "Uploads",
    label: "Smallest photo accepted",
    help: "A profile photo narrower or shorter than this is rejected as too small to show well.",
    unit: "px",
    value: 300,
    min: 100,
    max: 2000,
  },
  {
    id: "photo.maxDimension",
    group: "Uploads",
    label: "Largest photo accepted",
    help: "A guard against a photo so large it exhausts memory while being resized.",
    unit: "px",
    value: 10_000,
    min: 1000,
    max: 20_000,
  },
  {
    id: "tutor.headlineChars",
    group: "Text length",
    label: "Tutor headline",
    help: "Longest headline a Tutor may write. The column holds 240, so it cannot go higher without a migration.",
    unit: "characters",
    value: 140,
    min: 40,
    max: 240,
  },
  {
    id: "request.addressChars",
    group: "Text length",
    label: "Request address details",
    help: "Longest address note on a tutor request. The column holds 160, so it cannot go higher without a migration.",
    unit: "characters",
    value: 160,
    min: 40,
    max: 160,
  },
  {
    id: "modal.width.sm",
    group: "Modals",
    label: "Small dialog width",
    help: "Confirmations and short prompts - the Admin contact and moderation dialogs. Desktop only; every dialog fills the screen on a phone.",
    unit: "px",
    value: 480,
    min: 320,
    max: 720,
  },
  {
    id: "modal.width.md",
    group: "Modals",
    label: "Medium dialog width",
    help: "The default. Tutor profile section editor, job details, photo cropper.",
    unit: "px",
    value: 600,
    min: 360,
    max: 900,
  },
  {
    id: "modal.width.lg",
    group: "Modals",
    label: "Large dialog width",
    help: "The Hire a tutor sheet, which carries a three-step journey.",
    unit: "px",
    value: 760,
    min: 420,
    max: 1100,
  },
  {
    id: "modal.maxHeight",
    group: "Modals",
    label: "Tallest a dialog may grow",
    help: "On a short screen the dialog still stops at 92% of the window, whichever is smaller. Its body scrolls past this; the header and footer stay put.",
    unit: "px",
    value: 736,
    min: 400,
    max: 1200,
  },
  {
    id: "modal.fieldHeight.profile",
    group: "Modals",
    label: "Field height, Tutor profile editor",
    help: "Single-line inputs and dropdowns inside the profile section popup. Text boxes grow with what is typed and are not affected.",
    unit: "px",
    value: 30,
    min: 24,
    max: 64,
  },
  {
    id: "modal.fieldHeight.journey",
    group: "Modals",
    label: "Field height, Hire a tutor sheet",
    help: "Single-line inputs and dropdowns in the Guardian journey. Shipped taller than the profile's, which is why both are listed.",
    unit: "px",
    value: 48,
    min: 32,
    max: 72,
  },
  {
    id: "modal.radius",
    group: "Modals",
    label: "Corner radius",
    help: "How rounded a dialog's corners are. On a phone only the top two corners are rounded, since the sheet sits on the bottom edge.",
    unit: "px",
    value: 24,
    min: 0,
    max: 40,
  },
  {
    id: "modal.motionMs",
    group: "Modals",
    label: "Entrance speed",
    help: "How long a dialog takes to arrive. Set 0 for none. A visitor whose system asks for reduced motion sees no animation whatever this says.",
    unit: "ms",
    value: 200,
    min: 0,
    max: 600,
  },
  {
    id: "modal.backdropOpacity",
    group: "Modals",
    label: "Backdrop darkness",
    help: "How much the page behind a dialog is dimmed. Higher sets the page further aside; too high and it reads as a separate screen.",
    unit: "%",
    value: 45,
    min: 0,
    max: 80,
  },
  {
    id: "modal.shadowBlur",
    group: "Modals",
    label: "Shadow size",
    help: "How far the dialog's shadow spreads. The offset and reach follow this number, so one dial keeps the shadow in proportion.",
    unit: "px",
    value: 48,
    min: 0,
    max: 120,
  },
  {
    id: "modal.shadowOpacity",
    group: "Modals",
    label: "Shadow strength",
    help: "How dark that shadow is. Keep it low: a heavy shadow reads as a sticker rather than a lifted sheet of the same paper.",
    unit: "%",
    value: 28,
    min: 0,
    max: 60,
  },
  {
    id: "inputText.profile",
    group: "Input Field Text",
    label: "Tutor profile editor",
    help: "The letters a Tutor sees inside every box in the profile section popup - inputs, dropdowns, and its own text areas. A value icon inside a box scales with it.",
    unit: "px",
    value: 12,
    min: 10,
    max: 20,
  },
  {
    id: "inputText.journey",
    group: "Input Field Text",
    label: "Guardian journey and registration",
    help: "The Hire a tutor sheet and the Tutor/Guardian sign-up forms, which share the same boxes. A value icon inside a box scales with it.",
    unit: "px",
    value: 14,
    min: 10,
    max: 20,
  },
];

export function findSiteLimit(id: string): SiteLimitMeta | undefined {
  return siteLimits.find(limit => limit.id === id);
}

export type SiteLimitValues = Record<SiteLimitId, number>;

/** The numbers as shipped, before anything the Owner has stored. */
export function defaultSiteLimits(): SiteLimitValues {
  return Object.fromEntries(siteLimits.map(limit => [limit.id, limit.value])) as SiteLimitValues;
}

/**
 * Folds stored overrides onto the shipped numbers.
 *
 * A stored value outside its bounds is ignored rather than clamped. Clamping
 * would silently enforce a number nobody chose; falling back to the shipped one
 * at least matches what the code and the tests were written against. This
 * matters because bounds can tighten in a later deploy while an old row sits in
 * the table.
 */
export function resolveSiteLimits(stored: Array<{ limitId: string; value: number }>): SiteLimitValues {
  const resolved = defaultSiteLimits();
  for (const row of stored) {
    const meta = findSiteLimit(row.limitId);
    if (!meta) continue;
    if (!Number.isInteger(row.value)) continue;
    if (row.value < meta.min || row.value > meta.max) continue;
    resolved[meta.id] = row.value;
  }
  return resolved;
}

/** Bytes for the upload limit, which is stored and shown in megabytes. */
export function documentByteLimit(limits: SiteLimitValues): number {
  return limits["upload.documentMb"] * 1024 * 1024;
}

/**
 * The absolute ceiling for a limit, used where validation has to be built
 * before the stored numbers can be read - a zod schema at module load, say.
 * The Owner's own number is then checked separately against the resolved
 * value, so the schema guards the database and the check guards the policy.
 */
export function siteLimitCeiling(id: SiteLimitId): number {
  return findSiteLimit(id)!.max;
}
