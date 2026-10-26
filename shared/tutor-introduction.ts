/**
 * Quality and specificity validators for Tutor Introduction essay fields (Section E):
 * - About Me (`aboutMe`)
 * - Teaching Approach (`teachingApproach`)
 * - Why Choose Me (`whyChooseMe`)
 *
 * Ensures tutors do not submit repetitive characters (e.g. "aaaaaaaaaa"),
 * word loops (e.g. "good tutor good tutor good tutor"), or dummy placeholder text
 * (e.g. "test test test test test"), while respecting dynamic min/max character limits.
 */

export type IntroductionFieldType = "aboutMe" | "teachingApproach" | "whyChooseMe";

export const INTRODUCTION_FIELD_LABELS: Record<IntroductionFieldType, string> = {
  aboutMe: "About Me",
  teachingApproach: "Teaching Approach",
  whyChooseMe: "Why Choose Me",
};

export const INTRODUCTION_QUALITY_GUIDANCE: Record<IntroductionFieldType, string> = {
  aboutMe: "Write a meaningful introduction about your educational background and teaching passion.",
  teachingApproach: "Explain your teaching methodology, how you plan lessons and help students understand concepts.",
  whyChooseMe: "Highlight your key strengths, dedication, and why guardians/students should choose you.",
};

export const DUMMY_ESSAY_TOKENS = new Set([
  "test",
  "demo",
  "asdf",
  "qwerty",
  "testing",
  "sample",
  "blah",
  "na",
  "nil",
  "none",
  "nothing",
  "null",
  "undefined",
  "lorem",
  "ipsum",
  "fake",
  "xxx",
  "xyz",
]);

/**
 * Validates text quality and substance for an introduction field.
 * Returns an actionable warning string if invalid, or null if valid.
 */
export function validateIntroductionQuality(
  text: string | null | undefined,
  fieldType: IntroductionFieldType = "aboutMe",
): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  const guidance = INTRODUCTION_QUALITY_GUIDANCE[fieldType] ?? "Provide meaningful details rather than repetitive or placeholder words.";

  // Normalize "n/a" to "na"
  const normalized = trimmed.toLowerCase().replace(/n\/a/g, "na");

  // Check for repeated single characters (e.g. "aaaaaaaaaa" or "............")
  const strippedNonSpace = normalized.replace(/\s+/g, "");
  if (strippedNonSpace.length > 5 && /^(.)\1+$/.test(strippedNonSpace)) {
    return guidance;
  }
  // Check for long consecutive repeated character streaks (e.g. "hello aaaaaaaaaa world")
  if (/(.)\1{7,}/.test(normalized)) {
    return guidance;
  }

  // Tokenize into words
  const tokens = normalized
    .split(/[\s,·\-|/.;:!?()[\]{}"'\n\r\t]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  // If text is non-trivial length (>= 20 chars) but contains fewer than 3 words (e.g. long unbroken gibberish)
  if (trimmed.length >= 20 && tokens.length < 3) {
    return guidance;
  }

  if (tokens.length === 0) return guidance;

  // Check if unique letters count is unnaturally low (e.g. "ab ab ab ab ab ab ab ab ab ab")
  const lettersOnly = strippedNonSpace.replace(/[^a-z0-9]/gi, "");
  const uniqueLetters = new Set(lettersOnly);
  if (lettersOnly.length >= 20 && uniqueLetters.size <= 3) {
    return guidance;
  }

  // Check for repetitive word loops (e.g. "tutor tutor tutor" or "good tutor good tutor good tutor")
  const uniqueTokens = new Set(tokens);
  if (tokens.length >= 3 && uniqueTokens.size === 1) {
    return guidance;
  }
  if (tokens.length >= 4 && uniqueTokens.size <= 2) {
    return guidance;
  }
  if (tokens.length >= 6 && (uniqueTokens.size / tokens.length) < 0.35) {
    return guidance;
  }

  // Check if tokens are dummy / placeholder words
  const nonDummyTokens = tokens.filter(t => !DUMMY_ESSAY_TOKENS.has(t));
  if (nonDummyTokens.length === 0) {
    return guidance;
  }
  if (tokens.length >= 4 && (nonDummyTokens.length / tokens.length) <= 0.25) {
    return guidance;
  }

  return null;
}

/**
 * Validates an introduction essay field taking dynamic character limits into account.
 */
export function validateIntroductionField(
  text: string | null | undefined,
  fieldType: IntroductionFieldType,
  limits?: { minChars?: number; maxChars?: number },
): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  const label = INTRODUCTION_FIELD_LABELS[fieldType];
  const minChars = limits?.minChars ?? 0;
  const maxChars = limits?.maxChars;

  if (minChars > 0 && trimmed.length < minChars) {
    return `Write at least ${minChars} characters in ${label}.`;
  }
  if (maxChars !== undefined && maxChars > 0 && trimmed.length > maxChars) {
    return `${label} must be ${maxChars} characters or fewer.`;
  }

  return validateIntroductionQuality(trimmed, fieldType);
}
