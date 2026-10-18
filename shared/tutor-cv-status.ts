/**
 * Whether a Tutor's CV is a draft's. A draft CV can be looked at - by the Tutor
 * and by an Admin - but not downloaded or printed. Every profile that is
 * verified, approved or waiting for review is not a draft; any other (draft,
 * changes requested, suspended) is.
 *
 * Kept here, not in the PDF code, so the page and the server read one rule.
 */
export function isTutorCvDraft(profileStatus?: string | null, verified?: boolean | null): boolean {
  if (verified) return false;
  const status = (profileStatus ?? "").toLowerCase().trim();
  return !["verified", "approved", "pending", "submitted"].includes(status);
}
