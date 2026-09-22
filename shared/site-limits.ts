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
  // Sizes for the two systematic button vocabularies - the shared Button
  // component and the Guardian journey's own primary/ghost buttons. A fixed
  // width is not offered for either: a button sizes to its label by design,
  // and Cancel is not as long as Send request.
  "button.textSize",
  "button.height",
  "button.paddingX",
  "journeyButton.textSize",
  "journeyButton.height",
  "journeyButton.paddingX",
  // What a Tutor pays Connect Tutors on a confirmed tuition, as a share of its
  // monthly salary. Read by `shared/platform-charge.ts`.
  "charge.home.first",
  "charge.home.second",
  "charge.home.early",
  "charge.online.first",
  "charge.online.second",
  "charge.online.early",
  "charge.package.first",
  "charge.package.second",
  "charge.package.early",
  "charge.group.first",
  "charge.group.second",
  "charge.group.early",
  "charge.home.refund1",
  "charge.home.refund2",
  "charge.online.refund1",
  "charge.online.refund2",
  "charge.package.refund1",
  "charge.package.refund2",
  "charge.group.refund1",
  "charge.group.refund2",
  "charge.windowDays",
  "charge.secondDueDays",
  // Tutor Matching's ranking arithmetic (@shared/tutor-matching). Same shipped
  // values as the hardcoded points that preceded this - moving them here
  // changes nothing until an Owner touches one.
  "matching.weight.subject",
  "matching.weight.level",
  "matching.weight.area",
  "matching.weight.mode",
  "matching.weight.gender",
  "matching.weight.fee",
  "matching.weight.institute",
  "matching.weight.verified",
  "matching.weight.trackRecord",
  "matching.trackRecordCap",
] as const;

export type SiteLimitId = (typeof siteLimitIds)[number];

export type SiteLimitGroup = "Selection" | "Job board" | "Uploads" | "Text length" | "Modals" | "Input Field Text" | "Button Section" | "Platform charge" | "Matching";

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
  {
    id: "button.textSize",
    group: "Button Section",
    label: "Button text - shared button",
    help: "The word on an ordinary Cancel / Submit / Save button, wherever it appears - Admin dialogs, the Tutor profile popup, the photo cropper. Leaves an icon-only button and one explicitly sized sm or lg alone.",
    unit: "px",
    value: 14,
    min: 10,
    max: 20,
  },
  {
    id: "button.height",
    group: "Button Section",
    label: "Button height - shared button",
    help: "How tall that same ordinary button stands.",
    unit: "px",
    value: 36,
    min: 28,
    max: 56,
  },
  {
    id: "button.paddingX",
    group: "Button Section",
    label: "Button side padding - shared button",
    help: "A button widens or narrows with the room on either side of its label - there is no fixed width to set, since Cancel and Send request are not the same length.",
    unit: "px",
    value: 16,
    min: 8,
    max: 32,
  },
  {
    id: "journeyButton.textSize",
    group: "Button Section",
    label: "Button text - Guardian journey",
    help: "Continue, Back, Send request and the rest of the Hire a tutor sheet's own buttons.",
    unit: "px",
    value: 14,
    min: 10,
    max: 20,
  },
  {
    id: "journeyButton.height",
    group: "Button Section",
    label: "Button height - Guardian journey",
    help: "How tall a journey button stands. Ships taller than the shared button above - a public form invites a bigger target than a dialog does.",
    unit: "px",
    value: 48,
    min: 36,
    max: 72,
  },
  {
    id: "journeyButton.paddingX",
    group: "Button Section",
    label: "Button side padding - Guardian journey",
    help: "Same idea as the shared button's padding: it sets the width by way of the label's room to breathe, not a fixed number.",
    unit: "px",
    value: 20,
    min: 8,
    max: 40,
  },

  {
    id: "charge.home.first",
    group: "Platform charge",
    label: "Home Tutoring — first instalment",
    help: "Taken of the monthly salary, due inside the window that follows confirmation. Applies to tuitions confirmed from now on.",
    unit: "% of salary",
    value: 30,
    min: 0,
    max: 100,
  },
  {
    id: "charge.home.second",
    group: "Platform charge",
    label: "Home Tutoring — second instalment",
    help: "Taken of the monthly salary, due once the Tutor has been paid for the first month. Applies to tuitions confirmed from now on.",
    unit: "% of salary",
    value: 30,
    min: 0,
    max: 100,
  },
  {
    id: "charge.home.early",
    group: "Platform charge",
    label: "Home Tutoring — total if paid in full inside the window",
    help: "The reduced total when the whole charge is paid inside the window. Keep it at or below the first and second added together. Applies to tuitions confirmed from now on.",
    unit: "% of salary",
    value: 50,
    min: 0,
    max: 100,
  },
  {
    id: "charge.online.first",
    group: "Platform charge",
    label: "Online Tutoring — first instalment",
    help: "Taken of the monthly salary, due inside the window that follows confirmation. Applies to tuitions confirmed from now on.",
    unit: "% of salary",
    value: 25,
    min: 0,
    max: 100,
  },
  {
    id: "charge.online.second",
    group: "Platform charge",
    label: "Online Tutoring — second instalment",
    help: "Taken of the monthly salary, due once the Tutor has been paid for the first month. Applies to tuitions confirmed from now on.",
    unit: "% of salary",
    value: 25,
    min: 0,
    max: 100,
  },
  {
    id: "charge.online.early",
    group: "Platform charge",
    label: "Online Tutoring — total if paid in full inside the window",
    help: "The reduced total when the whole charge is paid inside the window. Keep it at or below the first and second added together. Applies to tuitions confirmed from now on.",
    unit: "% of salary",
    value: 45,
    min: 0,
    max: 100,
  },
  {
    id: "charge.package.first",
    group: "Platform charge",
    label: "Package Tutoring — first instalment",
    help: "Taken of the monthly salary, due inside the window that follows confirmation. Applies to tuitions confirmed from now on.",
    unit: "% of salary",
    value: 20,
    min: 0,
    max: 100,
  },
  {
    id: "charge.package.second",
    group: "Platform charge",
    label: "Package Tutoring — second instalment",
    help: "Taken of the monthly salary, due once the Tutor has been paid for the first month. Applies to tuitions confirmed from now on.",
    unit: "% of salary",
    value: 15,
    min: 0,
    max: 100,
  },
  {
    id: "charge.package.early",
    group: "Platform charge",
    label: "Package Tutoring — total if paid in full inside the window",
    help: "The reduced total when the whole charge is paid inside the window. Keep it at or below the first and second added together. Applies to tuitions confirmed from now on.",
    unit: "% of salary",
    value: 30,
    min: 0,
    max: 100,
  },
  {
    id: "charge.group.first",
    group: "Platform charge",
    label: "Group Tutoring — first instalment",
    help: "Taken of the monthly salary, due inside the window that follows confirmation. Applies to tuitions confirmed from now on.",
    unit: "% of salary",
    value: 20,
    min: 0,
    max: 100,
  },
  {
    id: "charge.group.second",
    group: "Platform charge",
    label: "Group Tutoring — second instalment",
    help: "Taken of the monthly salary, due once the Tutor has been paid for the first month. Applies to tuitions confirmed from now on.",
    unit: "% of salary",
    value: 20,
    min: 0,
    max: 100,
  },
  {
    id: "charge.group.early",
    group: "Platform charge",
    label: "Group Tutoring — total if paid in full inside the window",
    help: "The reduced total when the whole charge is paid inside the window. Keep it at or below the first and second added together. Applies to tuitions confirmed from now on.",
    unit: "% of salary",
    value: 35,
    min: 0,
    max: 100,
  },
  {
    id: "charge.home.refund1",
    group: "Platform charge",
    label: "Home Tutoring — refund if cancelled in the first month",
    help: "Of the salary, given back when the Guardian closes the tuition in its first month for a valid reason. What is kept is the total charge less this. Zero means no refund.",
    unit: "% of salary",
    value: 30,
    min: 0,
    max: 100,
  },
  {
    id: "charge.home.refund2",
    group: "Platform charge",
    label: "Home Tutoring — refund if cancelled in the second month",
    help: "The same, for a tuition closed in its second month. Zero means no refund.",
    unit: "% of salary",
    value: 15,
    min: 0,
    max: 100,
  },
  {
    id: "charge.online.refund1",
    group: "Platform charge",
    label: "Online Tutoring — refund if cancelled in the first month",
    help: "Of the salary, given back when the Guardian closes the tuition in its first month for a valid reason. What is kept is the total charge less this. Zero means no refund.",
    unit: "% of salary",
    value: 25,
    min: 0,
    max: 100,
  },
  {
    id: "charge.online.refund2",
    group: "Platform charge",
    label: "Online Tutoring — refund if cancelled in the second month",
    help: "The same, for a tuition closed in its second month. Zero means no refund.",
    unit: "% of salary",
    value: 0,
    min: 0,
    max: 100,
  },
  {
    id: "charge.package.refund1",
    group: "Platform charge",
    label: "Package Tutoring — refund if cancelled in the first month",
    help: "Of the salary, given back when the Guardian closes the tuition in its first month for a valid reason. What is kept is the total charge less this. Zero means no refund.",
    unit: "% of salary",
    value: 0,
    min: 0,
    max: 100,
  },
  {
    id: "charge.package.refund2",
    group: "Platform charge",
    label: "Package Tutoring — refund if cancelled in the second month",
    help: "The same, for a tuition closed in its second month. Zero means no refund.",
    unit: "% of salary",
    value: 0,
    min: 0,
    max: 100,
  },
  {
    id: "charge.group.refund1",
    group: "Platform charge",
    label: "Group Tutoring — refund if cancelled in the first month",
    help: "Of the salary, given back when the Guardian closes the tuition in its first month for a valid reason. What is kept is the total charge less this. Zero means no refund.",
    unit: "% of salary",
    value: 20,
    min: 0,
    max: 100,
  },
  {
    id: "charge.group.refund2",
    group: "Platform charge",
    label: "Group Tutoring — refund if cancelled in the second month",
    help: "The same, for a tuition closed in its second month. Zero means no refund.",
    unit: "% of salary",
    value: 0,
    min: 0,
    max: 100,
  },
  {
    id: "charge.windowDays",
    group: "Platform charge",
    label: "First payment window",
    help: "Days after confirmation inside which the first instalment, or the whole charge at the reduced total, must be paid. Applies to tuitions confirmed from now on.",
    unit: "days",
    value: 7,
    min: 1,
    max: 30,
  },
  {
    id: "charge.secondDueDays",
    group: "Platform charge",
    label: "Second instalment falls due",
    help: "Days after confirmation on which the second instalment, and any balance left from the first, falls due. Applies to tuitions confirmed from now on.",
    unit: "days",
    value: 30,
    min: 1,
    max: 90,
  },
  {
    id: "matching.weight.subject",
    group: "Matching",
    label: "Points per matching subject",
    help: "How much a Tutor Matching score gains for each subject the Tutor and the tuition share.",
    unit: "points",
    value: 3,
    min: 0,
    max: 10,
  },
  {
    id: "matching.weight.level",
    group: "Matching",
    label: "Points for a matching class / level",
    help: "How much a Tutor Matching score gains when the Tutor's levels cover the tuition's class.",
    unit: "points",
    value: 2,
    min: 0,
    max: 10,
  },
  {
    id: "matching.weight.area",
    group: "Matching",
    label: "Points for the same area",
    help: "How much a Tutor Matching score gains when the Tutor's own area matches the tuition's, for tuition taught in person.",
    unit: "points",
    value: 2,
    min: 0,
    max: 10,
  },
  {
    id: "matching.weight.mode",
    group: "Matching",
    label: "Points for teaching the right mode",
    help: "How much a Tutor Matching score gains when the Tutor teaches home, online or both, as the tuition needs.",
    unit: "points",
    value: 1,
    min: 0,
    max: 10,
  },
  {
    id: "matching.weight.gender",
    group: "Matching",
    label: "Points for the preferred gender",
    help: "How much a Tutor Matching score gains when the Tutor's gender is the one the Guardian asked for.",
    unit: "points",
    value: 1,
    min: 0,
    max: 10,
  },
  {
    id: "matching.weight.fee",
    group: "Matching",
    label: "Points for fitting the budget",
    help: "How much a Tutor Matching score gains when the Tutor's fee is within the Guardian's budget.",
    unit: "points",
    value: 1,
    min: 0,
    max: 10,
  },
  {
    id: "matching.weight.institute",
    group: "Matching",
    label: "Points for a featured institute",
    help: "How much a Tutor Matching score gains when the Tutor's institute is on the Owner's featured list (Dynamic Section → Institutes & departments).",
    unit: "points",
    value: 3,
    min: 0,
    max: 15,
  },
  {
    id: "matching.weight.verified",
    group: "Matching",
    label: "Points for a Verified badge",
    help: "How much a Tutor Matching score gains when the Tutor carries the site's Verified badge.",
    unit: "points",
    value: 2,
    min: 0,
    max: 15,
  },
  {
    id: "matching.weight.trackRecord",
    group: "Matching",
    label: "Points per Confirmed tuition",
    help: "How much a Tutor Matching score gains for each of the Tutor's past Confirmed tuitions, up to the cap below.",
    unit: "points",
    value: 2,
    min: 0,
    max: 10,
  },
  {
    id: "matching.trackRecordCap",
    group: "Matching",
    label: "Confirmed tuitions counted",
    help: "How many of a Tutor's past Confirmed tuitions earn points - the rest still count toward the Verified badge, but add no further Matching score.",
    unit: "tuitions",
    value: 5,
    min: 1,
    max: 30,
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
