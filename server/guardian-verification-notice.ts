/**
 * What a Guardian is told when an Admin decides on their profile verification.
 *
 * Verified and rejected are decisions the Guardian needs to hear about; a
 * reset back to unverified is an Admin correcting themselves, so it says
 * nothing. The rejection reason is already shown on the Guardian's own
 * profile, so the message points there rather than repeating it.
 */
export function guardianVerificationNotice(status: "unverified" | "verified" | "rejected") {
  if (status === "verified") {
    return { title: "আপনার প্রোফাইল ভেরিফাই হয়েছে", message: "একজন অ্যাডমিন আপনার প্রোফাইল ভেরিফাই করেছেন।" };
  }
  if (status === "rejected") {
    return { title: "আপনার প্রোফাইল ভেরিফিকেশন অনুমোদিত হয়নি", message: "কী পরিবর্তন করতে হবে দেখতে আপনার প্রোফাইল খুলুন।" };
  }
  return null;
}
