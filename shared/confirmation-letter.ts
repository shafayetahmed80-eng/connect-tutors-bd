/**
 * The name a downloaded Confirmation Letter is saved under: it says what the
 * file is and which letter, so it can be found again in a Downloads folder.
 */
export function confirmationLetterFileName(letterNumber: string) {
  return `Connect-Tutors-Confirmation-Letter-${letterNumber.replace(/[^A-Za-z0-9-]/g, "")}.pdf`;
}

/** A typed or scanned verification code in its stored form: capitals, no dashes or spaces. */
export function normalizeLetterVerificationCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** "ABCDE-FGHJK": the way a code is printed, so it can be read out and typed in halves. */
export function formatLetterVerificationCode(code: string) {
  const normalized = normalizeLetterVerificationCode(code);
  return normalized.length > 5 ? `${normalized.slice(0, 5)}-${normalized.slice(5)}` : normalized;
}

/** The public page that says whether a letter is genuine. */
export function confirmationLetterVerifyPath(letterNumber: string, code: string) {
  return `/verify/${encodeURIComponent(letterNumber.trim().toUpperCase())}/${normalizeLetterVerificationCode(code)}`;
}
