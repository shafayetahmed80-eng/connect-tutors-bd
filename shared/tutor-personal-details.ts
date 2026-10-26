/**
 * Fixed option lists for the Tutor Profile's personal-detail fields.
 *
 * Kept in code, not a catalog: these lists change about never, and both the
 * form control and the server validation have to agree on the same set.
 */

export const tutorNationalityOptions = ["Bangladeshi", "Others"] as const;
export type TutorNationality = (typeof tutorNationalityOptions)[number];
export const DEFAULT_TUTOR_NATIONALITY: TutorNationality = "Bangladeshi";

export const tutorReligionOptions = ["Islam", "Hinduism", "Christianity", "Buddhism", "Others"] as const;
export type TutorReligion = (typeof tutorReligionOptions)[number];

/**
 * Calculates a person's age in completed years from their ISO date-of-birth string (YYYY-MM-DD).
 * Returns null if the date format is invalid, not a real calendar date, or in the future.
 */
export function calculateAgeInYears(dateOfBirth: string, now: Date = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return null;
  const birthDate = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (Number.isNaN(birthDate.getTime())) return null;
  if (birthDate.toISOString().slice(0, 10) !== dateOfBirth) return null;
  if (birthDate.getTime() > now.getTime()) return null;

  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const currentDay = now.getUTCDate();

  const birthYear = birthDate.getUTCFullYear();
  const birthMonth = birthDate.getUTCMonth();
  const birthDay = birthDate.getUTCDate();

  let age = currentYear - birthYear;
  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
    age--;
  }
  return age;
}

export const MIN_PERMANENT_ADDRESS_LENGTH = 10;
export const MIN_PRESENT_ADDRESS_LENGTH = 10;
export const MIN_EMERGENCY_CONTACT_NAME_LENGTH = 3;
export const MIN_EMERGENCY_CONTACT_RELATION_LENGTH = 3;

/**
 * Validates permanent address quality and minimum detail length.
 * Permanent address must contain sufficient geographic details (e.g. Village/Road, Thana/Upazila, District).
 * Returns an error message string if invalid, or null if valid.
 */
export function validatePermanentAddress(address: string | null | undefined): string | null {
  if (address === null || address === undefined) return null;
  const trimmed = address.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length < MIN_PERMANENT_ADDRESS_LENGTH) {
    return `Enter detailed permanent address (at least ${MIN_PERMANENT_ADDRESS_LENGTH} characters including Village/Area, Thana, District).`;
  }
  return null;
}

/**
 * Validates present address quality and minimum detail length.
 * Present address must contain sufficient geographic details (e.g. House/Road, Sector/Block, Area).
 * Returns an error message string if invalid, or null if valid.
 */
export function validatePresentAddress(address: string | null | undefined): string | null {
  if (address === null || address === undefined) return null;
  const trimmed = address.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length < MIN_PRESENT_ADDRESS_LENGTH) {
    return `Enter detailed present address (at least ${MIN_PRESENT_ADDRESS_LENGTH} characters including House/Road, Area).`;
  }
  return null;
}

const INVALID_EMERGENCY_SELF_WORDS: ReadonlySet<string> = new Set([
  "self",
  "myself",
  "me",
  "own",
  "ownself",
  "নিজের",
  "নিজে",
  "আমি",
]);

const INVALID_EMERGENCY_DUMMY_WORDS: ReadonlySet<string> = new Set([
  "none",
  "n/a",
  "na",
  "nil",
  "nothing",
  "no",
  "নাই",
  "নেই",
  "না",
  "null",
  "undefined",
  "test",
  "demo",
  "asdf",
]);

/**
 * Validates emergency contact person's name quality and authenticity.
 * Prevents self-reference (tutor's own name or "Self"), placeholders ("None", "N/A"), or abbreviations < 3 chars.
 * Returns an error message string if invalid, or null if valid.
 */
export function validateEmergencyContactName(name: string | null | undefined, tutorName?: string | null): string | null {
  if (name === null || name === undefined) return null;
  const trimmed = name.trim();
  if (trimmed.length === 0) return null;

  const lower = trimmed.toLowerCase();
  if (INVALID_EMERGENCY_SELF_WORDS.has(lower)) {
    return "Emergency contact cannot be yourself. Enter the name of a family member or trusted person.";
  }
  if (INVALID_EMERGENCY_DUMMY_WORDS.has(lower)) {
    return "Enter a valid emergency contact person's name.";
  }
  if (tutorName && tutorName.trim().length > 0 && lower === tutorName.trim().toLowerCase()) {
    return "Emergency contact cannot be yourself. Enter the name of a family member or trusted person.";
  }
  if (trimmed.length < MIN_EMERGENCY_CONTACT_NAME_LENGTH) {
    return `Emergency contact name must be at least ${MIN_EMERGENCY_CONTACT_NAME_LENGTH} characters.`;
  }
  return null;
}

/**
 * Validates emergency contact relation quality and specificity.
 * Prevents self-reference ("Self"), placeholders ("None", "N/A"), or abbreviations < 3 chars.
 * Returns an error message string if invalid, or null if valid.
 */
export function validateEmergencyContactRelation(relation: string | null | undefined): string | null {
  if (relation === null || relation === undefined) return null;
  const trimmed = relation.trim();
  if (trimmed.length === 0) return null;

  const lower = trimmed.toLowerCase();
  if (INVALID_EMERGENCY_SELF_WORDS.has(lower)) {
    return "Emergency contact relation cannot be self. Specify relationship (e.g. Father, Mother, Brother, Guardian).";
  }
  if (INVALID_EMERGENCY_DUMMY_WORDS.has(lower)) {
    return "Enter a valid relation (at least 3 characters, e.g. Father, Mother, Brother, Guardian).";
  }
  if (trimmed.length < MIN_EMERGENCY_CONTACT_RELATION_LENGTH) {
    return `Enter a valid relation (at least ${MIN_EMERGENCY_CONTACT_RELATION_LENGTH} characters, e.g. Father, Mother, Brother, Guardian).`;
  }
  return null;
}

export const MIN_HEADLINE_LENGTH = 10;

const REPETITIVE_CHAR_REGEX = /^(.)\1+$/;
const DUMMY_HEADLINE_TOKENS: ReadonlySet<string> = new Set([
  "test", "demo", "asdf", "qwerty", "na", "n/a", "nil", "none", "nothing", "null", "undefined"
]);

/**
 * Validates tutor professional headline quality and specificity.
 * Prevents repetitive words (e.g. "tutor tutor"), repeated characters, dummy keywords,
 * or headlines lacking substantive detail.
 * Returns an error message string if invalid, or null if valid.
 */
export function validateHeadline(headline: string | null | undefined): string | null {
  if (headline === null || headline === undefined) return null;
  const trimmed = headline.trim();
  if (trimmed.length === 0) return null;

  if (trimmed.length < MIN_HEADLINE_LENGTH) {
    return `Enter a headline with at least ${MIN_HEADLINE_LENGTH} characters.`;
  }

  // Check if string is composed of a single repeated character (e.g. "aaaaaaaaaa", "----------")
  if (REPETITIVE_CHAR_REGEX.test(trimmed.replace(/\s+/g, ""))) {
    return "Provide a meaningful professional headline (mention your subject, target classes, or background, e.g. 'Experienced Mathematics Tutor for SSC & HSC').";
  }

  // Normalize "n/a" to "na" before splitting
  const normalized = trimmed.toLowerCase().replace(/n\/a/g, "na");
  // Tokenize into words (letters, numbers, Bengali words)
  const tokens = normalized.split(/[\s,·\-|/]+/).filter(t => t.length > 0);

  // Check if all tokens are single characters (e.g. "a b c d e f g h i j")
  const substantialTokens = tokens.filter(t => t.length > 1);
  if (substantialTokens.length === 0) {
    return "Provide a meaningful professional headline (mention your subject, target classes, or background, e.g. 'Experienced Mathematics Tutor for SSC & HSC').";
  }

  // Check if all tokens are identical (e.g. "tutor tutor tutor", "teacher teacher")
  const uniqueTokens = new Set(tokens);
  if (uniqueTokens.size === 1 && tokens.length > 1) {
    return "Provide a meaningful professional headline (mention your subject, target classes, or background, e.g. 'Experienced Mathematics Tutor for SSC & HSC').";
  }

  // Check if all tokens are dummy words (e.g. "test test test", "n/a n/a n/a")
  const nonDummyTokens = tokens.filter(t => !DUMMY_HEADLINE_TOKENS.has(t));
  if (nonDummyTokens.length === 0) {
    return "Provide a meaningful professional headline (mention your subject, target classes, or background, e.g. 'Experienced Mathematics Tutor for SSC & HSC').";
  }

  return null;
}

export const MIN_PARENT_NAME_LENGTH = 3;

const DUMMY_PARENT_TOKENS: ReadonlySet<string> = new Set([
  "test", "demo", "asdf", "qwerty", "na", "n/a", "nil", "none", "nothing", "null", "undefined",
  "father", "mother", "baba", "ma", "বাবা", "মা", "পিতা", "মাতা", "নাই", "নেই", "না", "unknown", "abc"
]);

/**
 * Validates father's or mother's name quality and authenticity.
 * Prevents dummy placeholders ("None", "N/A"), role names ("Father", "Mother"), single characters, or repetitive words.
 */
export function validateParentName(name: string | null | undefined, relation: "father" | "mother"): string | null {
  if (name === null || name === undefined) return null;
  const trimmed = name.trim();
  if (trimmed.length === 0) return null;

  const label = relation === "father" ? "father's name" : "mother's name";

  if (trimmed.length < MIN_PARENT_NAME_LENGTH) {
    return `Enter a valid ${label} (at least ${MIN_PARENT_NAME_LENGTH} characters).`;
  }

  // Check if string is composed of a single repeated character (e.g. "aaaaaa", "------")
  if (REPETITIVE_CHAR_REGEX.test(trimmed.replace(/\s+/g, ""))) {
    return `Enter a genuine ${label} rather than placeholder text.`;
  }

  const normalized = trimmed.toLowerCase().replace(/n\/a/g, "na");
  const tokens = normalized.split(/[\s,·\-|/.]+/).filter(t => t.length > 0);

  if (tokens.length === 0) {
    return `Enter a genuine ${label} rather than placeholder text.`;
  }

  // Check if all tokens are single characters (e.g. "a b c")
  const substantialTokens = tokens.filter(t => t.length > 1);
  if (substantialTokens.length === 0) {
    return `Enter a genuine ${label}.`;
  }

  // Check if all tokens are identical (e.g. "karim karim")
  const uniqueTokens = new Set(tokens);
  if (uniqueTokens.size === 1 && tokens.length > 1) {
    return `Enter a genuine ${label} rather than repetitive words.`;
  }

  // Check if all tokens are dummy words
  const nonDummyTokens = tokens.filter(t => !DUMMY_PARENT_TOKENS.has(t));
  if (nonDummyTokens.length === 0) {
    return `Enter a genuine ${label} rather than placeholder text.`;
  }

  return null;
}

const DUMMY_SOCIAL_TOKENS: ReadonlySet<string> = new Set([
  "none", "na", "n/a", "nil", "no", "nothing", "null", "undefined", "test", "demo", "asdf", "qwerty", "নাই", "নেই"
]);

const SOCIAL_DOMAINS: ReadonlySet<string> = new Set([
  "facebook.com", "fb.com", "fb.me", "linkedin.com", "github.com",
  "twitter.com", "x.com", "instagram.com", "instagr.am", "youtube.com", "youtu.be", "t.me"
]);

/**
 * Validates social profile links for genuine URL format and prevents placeholder text.
 */
export function validateSocialProfileLinks(links: string | null | undefined): string | null {
  if (links === null || links === undefined) return null;
  const trimmed = links.trim();
  if (trimmed.length === 0) return null;

  const lower = trimmed.toLowerCase();
  if (DUMMY_SOCIAL_TOKENS.has(lower)) {
    return "Enter a valid social profile link (e.g. https://facebook.com/username or https://linkedin.com/in/username).";
  }

  const entries = trimmed.split(/[\s,\n\r;]+/).filter(e => e.length > 0);
  if (entries.length === 0) {
    return "Enter a valid social profile link (e.g. https://facebook.com/username or https://linkedin.com/in/username).";
  }

  const genericUrlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/i;

  for (const entry of entries) {
    const entryLower = entry.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
    const domainPart = entryLower.split("/")[0];

    const hasKnownDomain = Array.from(SOCIAL_DOMAINS).some(domain => domainPart === domain || domainPart.endsWith("." + domain));
    const isValidUrl = genericUrlPattern.test(entry);

    if (!hasKnownDomain && !isValidUrl) {
      return "Enter a valid social profile link (e.g. https://facebook.com/username or https://linkedin.com/in/username).";
    }
  }

  return null;
}

export const MIN_EMERGENCY_CONTACT_ADDRESS_LENGTH = 10;

const DUMMY_EMERGENCY_ADDRESS_WORDS: ReadonlySet<string> = new Set([
  "same", "as", "above", "none", "na", "n/a", "nil", "nothing", "null", "undefined", "test", "demo", "asdf", "একই", "নাই", "নেই"
]);

/**
 * Validates emergency contact address quality and specificity.
 * Prevents shortcuts ("same as above", "none", "na") or short vague addresses < 10 chars.
 */
export function validateEmergencyContactAddress(address: string | null | undefined): string | null {
  if (address === null || address === undefined) return null;
  const trimmed = address.trim();
  if (trimmed.length === 0) return null;

  if (trimmed.length < MIN_EMERGENCY_CONTACT_ADDRESS_LENGTH) {
    return `Enter detailed emergency contact address (at least ${MIN_EMERGENCY_CONTACT_ADDRESS_LENGTH} characters including House/Village, Road/Thana, Area).`;
  }

  // Check repetitive single character
  if (REPETITIVE_CHAR_REGEX.test(trimmed.replace(/\s+/g, ""))) {
    return "Enter a detailed emergency contact address rather than placeholder text.";
  }

  const normalized = trimmed.toLowerCase().replace(/n\/a/g, "na");
  const tokens = normalized.split(/[\s,·\-|/.]+/).filter(t => t.length > 0);

  if (tokens.length === 0) {
    return "Enter a detailed emergency contact address rather than placeholder text.";
  }

  // Check if all tokens are single characters
  const substantialTokens = tokens.filter(t => t.length > 1);
  if (substantialTokens.length === 0) {
    return "Enter a detailed emergency contact address rather than placeholder text.";
  }

  // Check if all tokens are dummy/vague words
  const nonDummyTokens = tokens.filter(t => !DUMMY_EMERGENCY_ADDRESS_WORDS.has(t));
  if (nonDummyTokens.length === 0) {
    return "Enter a detailed emergency contact address rather than placeholder text.";
  }

  return null;
}
