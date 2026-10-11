import type { LearningNeed } from "./learning-needs";

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

const TUTOR_JOB_BOARD_PUSH_URL = "/tutor/dashboard/jobs";

/** A notice's message column holds 360 characters; this leaves room for the part that is never cut. */
const NEW_TUITION_NOTICE_MAX_CHARS = 340;

/** What a request asks to have taught, curriculum by curriculum: "Bangla Medium: Class 5 (Bangla, English), Class 6 (Math)". */
function describeLearningNeeds(needs: LearningNeed[]) {
  return needs.map(need => {
    const name = need.curriculumType ? `${need.category.trim()} (${need.curriculumType})` : need.category.trim();
    const classes = need.classes
      .map(item => item.subjects.length > 0 ? `${item.classCourse.trim()} (${item.subjects.join(", ")})` : item.classCourse.trim())
      .join(", ");
    return classes ? `${name}: ${classes}` : name;
  }).join("; ");
}

function clipTo(text: string, maxCharacters: number) {
  const characters = Array.from(text);
  return characters.length > maxCharacters ? `${characters.slice(0, Math.max(0, maxCharacters - 1)).join("").trimEnd()}…` : text;
}

/**
 * The bell notice a Tutor finds when a new tuition goes live where they teach.
 * The heading is the phone alert's, with the Job ID so a Tutor can tell one from
 * the next; the line is what the Job Board card says - what is wanted, place,
 * salary - so the notice is enough to decide whether to open it.
 *
 * What is wanted names each class's own subjects under its curriculum. When the
 * line is too long it is that part that is cut: the place and the salary are
 * what a Tutor cannot do without, so they always stay.
 */
export function newTuitionNotice(input: {
  publicJobId: string;
  category: string;
  classCourse: string;
  tuitionType: "home" | "online" | "both" | "group" | "package";
  locationLabel: string | null;
  budgetAmount: number | null;
  /** Each curriculum with its classes and their subjects. Absent, the request's one-line summary (class, curriculum) stands in. */
  learningNeeds?: LearningNeed[];
}) {
  const place = input.tuitionType === "online" ? "Online" : input.locationLabel?.trim() ?? "";
  const salary = input.budgetAmount && input.budgetAmount > 0 ? `${input.budgetAmount.toLocaleString("en-US")} Taka` : "";
  const tail = [place, salary].filter(Boolean).join(" · ");
  const wanted = input.learningNeeds && input.learningNeeds.length > 0
    ? describeLearningNeeds(input.learningNeeds)
    : [input.classCourse.trim(), input.category.trim()].filter(Boolean).join(" · ");
  const room = NEW_TUITION_NOTICE_MAX_CHARS - (tail ? Array.from(tail).length + 3 : 0);
  return {
    title: `${NEW_TUITION_PUSH.title} — ${input.publicJobId}`,
    message: [clipTo(wanted, room), tail].filter(Boolean).join(" · "),
  };
}

/** Opens the Tutor panel Job Board with that tuition's details already open - the same link a sign-in return uses. */
export function newTuitionPushUrl(publicJobId: string) {
  return `${TUTOR_JOB_BOARD_PUSH_URL}?returnTo=${encodeURIComponent(`/job-board?job=${publicJobId}`)}`;
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

/**
 * What a push carries. `tag`, `groupTitle`, `groupUrl` and `line` are for the
 * phone's service worker (client/public/push-sw.js): notifications that share a
 * `tag` collapse into ONE that counts up, titled by `groupTitle` (`{n}` is the
 * count), listing each one's `line`, and opening `groupUrl`.
 */
export type PushPayload = { title: string; body: string; url?: string; tag?: string; groupTitle?: string; groupUrl?: string; line?: string };

const ADMIN_CHAT_PUSH_GROUP_TITLE = "অ্যাডমিনের {n}টি মেসেজ";
const NEW_TUITION_PUSH_GROUP_TITLE = "{n}টি নতুন টিউশন জব";
const NOTICE_PUSH_GROUP_TITLE = "{n}টি নতুন নোটিশ";

/**
 * Says which pushes stack into one notification on the phone, decided by where
 * a push opens - so every sender, old and new, is covered without each having to
 * remember: an Admin's chat messages to a Tutor, new tuitions, every other Tutor
 * or Guardian notice (listed by its heading, since its body is a whole sentence),
 * Tutor messages to the Admins, and the Owner's sign-in alerts. A push that
 * already carries a tag, and anything else, goes out as it is.
 */
export function withPushGrouping(payload: PushPayload): PushPayload {
  if (payload.tag) return payload;
  const url = payload.url ?? "";
  if (url === ADMIN_CHAT_PUSH_URL) return { ...payload, tag: "admin-chat", groupTitle: ADMIN_CHAT_PUSH_GROUP_TITLE, groupUrl: ADMIN_CHAT_PUSH_URL, line: payload.body };
  if (url.startsWith(`${TUTOR_JOB_BOARD_PUSH_URL}?returnTo=`)) return { ...payload, tag: "new-tuition", groupTitle: NEW_TUITION_PUSH_GROUP_TITLE, groupUrl: TUTOR_JOB_BOARD_PUSH_URL, line: payload.body };
  if (url.startsWith("/tutor/")) return { ...payload, tag: "tutor-notice", groupTitle: NOTICE_PUSH_GROUP_TITLE, groupUrl: "/tutor/dashboard/notifications", line: payload.title };
  if (url.startsWith("/guardian/")) return { ...payload, tag: "guardian-notice", groupTitle: NOTICE_PUSH_GROUP_TITLE, groupUrl: "/guardian/dashboard/notifications", line: payload.title };
  if (url.startsWith("/admin/tutor-chats")) return { ...payload, tag: "admin-tutor-chat", groupTitle: "{n} new Tutor messages", groupUrl: "/admin/tutor-chats", line: `${payload.title}: ${payload.body}` };
  if (url === "/admin/security") return { ...payload, tag: "admin-security", groupTitle: "{n} Admin security alerts", groupUrl: "/admin/security", line: payload.body };
  return payload;
}
