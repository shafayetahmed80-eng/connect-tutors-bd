import { describe, expect, it } from "vitest";
import { buildTutorApplyJobBoardPath, buildTutorApplyReturnPath } from "../client/src/lib/tutorApplyReturn";
import { ADMIN_CHAT_PUSH_TITLE, ADMIN_CHAT_PUSH_URL, adminChatPushBody, NEW_TUITION_PUSH, newTuitionPushUrl, withPushGrouping } from "./push-messages";

describe("the new tuition phone alert", () => {
  it("says what the Owner asked for, in Bangla: a heading and one line", () => {
    expect(NEW_TUITION_PUSH).toEqual({ title: "নতুন টিউশন জব", body: "আপনার প্রেফারেন্স অনুযায়ী নতুন টিউশন পোস্ট হয়েছে।" });
  });

  it("opens that tuition in the Tutor panel Job Board, by the link the panel itself understands", () => {
    const returnPath = buildTutorApplyReturnPath("6800");
    expect(newTuitionPushUrl("6800")).toBe(buildTutorApplyJobBoardPath(returnPath));
    expect(newTuitionPushUrl("6800")).toBe("/tutor/dashboard/jobs?returnTo=%2Fjob-board%3Fjob%3D6800");
  });
});

describe("the Admin chat reply phone alert", () => {
  it("shows the message itself on the lock screen", () => {
    expect(ADMIN_CHAT_PUSH_TITLE).toBe("অ্যাডমিনের মেসেজ");
    expect(ADMIN_CHAT_PUSH_URL).toBe("/tutor/dashboard/chat");
    expect(adminChatPushBody("আপনার ডকুমেন্টটা পাঠান", false)).toBe("আপনার ডকুমেন্টটা পাঠান");
  });

  it("folds line breaks into one line", () => {
    expect(adminChatPushBody("প্রথম লাইন\n\n  দ্বিতীয়   লাইন ", false)).toBe("প্রথম লাইন দ্বিতীয় লাইন");
  });

  it("cuts a long message at 140 characters with an ellipsis, counting Bangla letters as letters", () => {
    const long = "ক".repeat(300);
    const result = adminChatPushBody(long, false);
    expect(Array.from(result)).toHaveLength(140);
    expect(result.endsWith("…")).toBe(true);
    expect(adminChatPushBody("খ".repeat(140), false)).toBe("খ".repeat(140));
  });

  it("names an attachment when that is all there is, and shows the text when there is both", () => {
    expect(adminChatPushBody("", true)).toBe("📎 একটি ফাইল পাঠানো হয়েছে");
    expect(adminChatPushBody("   ", true)).toBe("📎 একটি ফাইল পাঠানো হয়েছে");
    expect(adminChatPushBody("এই ফাইলটা দেখুন", true)).toBe("এই ফাইলটা দেখুন");
    expect(adminChatPushBody("", false)).toBe("");
  });
});

describe("which phone alerts stack into one notification", () => {
  it("stacks an Admin's chat messages to a Tutor under one tag, listing the messages", () => {
    const grouped = withPushGrouping({ title: ADMIN_CHAT_PUSH_TITLE, body: "hello", url: ADMIN_CHAT_PUSH_URL });
    expect(grouped).toMatchObject({ tag: "admin-chat", groupTitle: "অ্যাডমিনের {n}টি মেসেজ", groupUrl: "/tutor/dashboard/chat", line: "hello" });
  });

  it("stacks new tuitions, and opens the Job Board list when there is more than one", () => {
    const grouped = withPushGrouping({ ...NEW_TUITION_PUSH, url: newTuitionPushUrl("6800") });
    expect(grouped).toMatchObject({ tag: "new-tuition", groupTitle: "{n}টি নতুন টিউশন জব", groupUrl: "/tutor/dashboard/jobs", line: NEW_TUITION_PUSH.body });
    expect(grouped.url).toBe(newTuitionPushUrl("6800"));
  });

  it("stacks every other Tutor or Guardian notice by its heading, each panel on its own", () => {
    expect(withPushGrouping({ title: "আপনার কনফার্মেশন লেটার প্রস্তুত", body: "…", url: "/tutor/dashboard/confirmation-letter" }))
      .toMatchObject({ tag: "tutor-notice", groupUrl: "/tutor/dashboard/notifications", line: "আপনার কনফার্মেশন লেটার প্রস্তুত" });
    expect(withPushGrouping({ title: "আপনার টিউটর রিকোয়েস্ট এখন লাইভ", body: "…", url: "/guardian/dashboard/posted-jobs/12" }))
      .toMatchObject({ tag: "guardian-notice", groupUrl: "/guardian/dashboard/notifications", line: "আপনার টিউটর রিকোয়েস্ট এখন লাইভ" });
  });

  it("stacks the Tutor messages the Admins are told about, naming the Tutor on each line, and the Owner's sign-in alerts", () => {
    expect(withPushGrouping({ title: "Amina sent a message", body: "Please check", url: "/admin/tutor-chats?tutorId=t1" }))
      .toMatchObject({ tag: "admin-tutor-chat", groupUrl: "/admin/tutor-chats", line: "Amina sent a message: Please check" });
    expect(withPushGrouping({ title: "New Admin sign-in", body: "owner signed in", url: "/admin/security" }))
      .toMatchObject({ tag: "admin-security", groupUrl: "/admin/security", line: "owner signed in" });
  });

  it("leaves alone a push that has its own tag, and one that opens somewhere unknown", () => {
    const own = { title: "a", body: "b", url: "/tutor/dashboard/chat", tag: "mine" };
    expect(withPushGrouping(own)).toBe(own);
    const unknown = { title: "a", body: "b", url: "/somewhere" };
    expect(withPushGrouping(unknown)).toBe(unknown);
    const noUrl = { title: "a", body: "b" };
    expect(withPushGrouping(noUrl)).toBe(noUrl);
  });
});
