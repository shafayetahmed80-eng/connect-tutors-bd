import { describe, expect, it } from "vitest";
import { buildTutorApplyJobBoardPath, buildTutorApplyReturnPath } from "../client/src/lib/tutorApplyReturn";
import { ADMIN_CHAT_PUSH_TITLE, ADMIN_CHAT_PUSH_URL, adminChatPushBody, NEW_TUITION_PUSH, newTuitionPushUrl } from "./push-messages";

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
