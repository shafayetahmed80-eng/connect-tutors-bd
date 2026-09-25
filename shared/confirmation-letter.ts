/**
 * The name a downloaded Confirmation Letter is saved under: it says what the
 * file is and which letter, so it can be found again in a Downloads folder.
 */
export function confirmationLetterFileName(letterNumber: string) {
  return `Connect-Tutors-Confirmation-Letter-${letterNumber.replace(/[^A-Za-z0-9-]/g, "")}.pdf`;
}
