/**
 * The words and links of the phone notifications that are not tied to a
 * stored in-panel notice: a new tuition that fits a Tutor, and an Admin chat
 * reply. Kept apart from the senders so the exact lock-screen text is one
 * thing to read and test.
 */

/** A new tuition went live somewhere a Tutor teaches. Heading and body only; the app logo sits beside them. */
export const NEW_TUITION_PUSH = {
  title: "নতুন টিউশন জব",
  body: "আপনার প্রেফারেন্স অনুযায়ী নতুন টিউশন পোস্ট হয়েছে।",
} as const;

/** Opens the Tutor panel Job Board with that tuition's details already open - the same link a sign-in return uses. */
export function newTuitionPushUrl(publicJobId: string) {
  return `/tutor/dashboard/jobs?returnTo=${encodeURIComponent(`/job-board?job=${publicJobId}`)}`;
}

export const ADMIN_CHAT_PUSH_TITLE = "অ্যাডমিনের মেসেজ";
export const ADMIN_CHAT_PUSH_URL = "/tutor/dashboard/chat";
const ADMIN_CHAT_PUSH_ATTACHMENT_ONLY = "📎 একটি ফাইল পাঠানো হয়েছে";
const ADMIN_CHAT_PUSH_MAX_CHARS = 140;

/** The lock screen shows the message itself, one line of it: whitespace folded, long text cut with an ellipsis. */
export function adminChatPushBody(body: string, hasAttachment: boolean) {
  const text = body.replace(/\s+/g, " ").trim();
  if (!text) return hasAttachment ? ADMIN_CHAT_PUSH_ATTACHMENT_ONLY : "";
  const characters = Array.from(text);
  return characters.length > ADMIN_CHAT_PUSH_MAX_CHARS ? `${characters.slice(0, ADMIN_CHAT_PUSH_MAX_CHARS - 1).join("").trimEnd()}…` : text;
}
