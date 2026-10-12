import { describe, expect, it } from "vitest";
import { buildTutorApplyJobBoardPath, buildTutorApplyReturnPath } from "../client/src/lib/tutorApplyReturn";
import { ADMIN_CHAT_PUSH_TITLE, ADMIN_CHAT_PUSH_URL, adminChatPushBody, NEW_TUITION_PUSH, newTuitionNotice, newTuitionPushUrl, withPushGrouping } from "./push-messages";

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

describe("the new tuition bell notice", () => {
  const job = { publicJobId: "6858", category: "Bangla Medium", classCourse: "Class 5", tuitionType: "home" as const, locationLabel: "Mirpur 10, Dhaka", budgetAmount: 9000 };

  it("carries the phone alert's heading with the Job ID, and the Job Board card's line: class, curriculum, place, salary", () => {
    expect(newTuitionNotice(job)).toEqual({
      title: `${NEW_TUITION_PUSH.title} — 6858`,
      message: "Class 5 · Bangla Medium · Mirpur 10, Dhaka · 9,000 Taka",
    });
  });

  it("reads Online for an online tuition, whatever place the Guardian's own profile holds", () => {
    expect(newTuitionNotice({ ...job, tuitionType: "online", locationLabel: "Mirpur 10, Dhaka" }).message).toBe("Class 5 · Bangla Medium · Online · 9,000 Taka");
  });

  it("leaves out what is not known rather than printing a gap - no salary, no place", () => {
    expect(newTuitionNotice({ ...job, budgetAmount: null }).message).toBe("Class 5 · Bangla Medium · Mirpur 10, Dhaka");
    expect(newTuitionNotice({ ...job, budgetAmount: 0, locationLabel: null }).message).toBe("Class 5 · Bangla Medium");
  });

  it("names every curriculum and class of a request that has several, from its one-line summary when it has no list", () => {
    expect(newTuitionNotice({ ...job, category: "Bangla Medium, English Medium", classCourse: "Class 5, Class 6, Standard 3" }).message)
      .toBe("Class 5, Class 6, Standard 3 · Bangla Medium, English Medium · Mirpur 10, Dhaka · 9,000 Taka");
  });

  describe("with each class's own subjects", () => {
    const bangla = { category: "Bangla Medium", curriculumType: null, classes: [{ classCourse: "Class 5", subjects: ["Bangla", "English"] }, { classCourse: "Class 6", subjects: ["Math"] }] };
    const english = { category: "English Medium", curriculumType: "Cambridge", classes: [{ classCourse: "Standard 3", subjects: ["Maths"] }] };

    it("names the subjects of each class under its curriculum, then the place and the salary", () => {
      expect(newTuitionNotice({ ...job, learningNeeds: [bangla] }).message)
        .toBe("Bangla Medium: Class 5 (Bangla, English), Class 6 (Math) · Mirpur 10, Dhaka · 9,000 Taka");
    });

    it("sets curricula apart, and names the English Medium type beside its curriculum", () => {
      expect(newTuitionNotice({ ...job, learningNeeds: [bangla, english] }).message)
        .toBe("Bangla Medium: Class 5 (Bangla, English), Class 6 (Math); English Medium (Cambridge): Standard 3 (Maths) · Mirpur 10, Dhaka · 9,000 Taka");
    });

    it("leaves out the brackets for a class with no subjects, and falls back to the summary for an empty list", () => {
      expect(newTuitionNotice({ ...job, learningNeeds: [{ category: "Bangla Medium", curriculumType: null, classes: [{ classCourse: "Class 5", subjects: [] }] }] }).message)
        .toBe("Bangla Medium: Class 5 · Mirpur 10, Dhaka · 9,000 Taka");
      expect(newTuitionNotice({ ...job, learningNeeds: [] }).message).toBe("Class 5 · Bangla Medium · Mirpur 10, Dhaka · 9,000 Taka");
    });

    it("cuts what is wanted, never the place or the salary, when the line would not fit", () => {
      const many = { category: "Bangla Medium", curriculumType: null, classes: Array.from({ length: 6 }, (_, index) => ({ classCourse: `Class ${index + 1}`, subjects: Array.from({ length: 12 }, (_, n) => `Subject number ${n + 1}`) })) };
      const message = newTuitionNotice({ ...job, learningNeeds: [many] }).message;

      expect(Array.from(message).length).toBeLessThanOrEqual(340);
      expect(message.endsWith("… · Mirpur 10, Dhaka · 9,000 Taka")).toBe(true);
      expect(message.startsWith("Bangla Medium: Class 1 (Subject number 1")).toBe(true);
    });
  });

  it("cuts a summary line that would not fit, and still keeps the place and the salary", () => {
    const long = newTuitionNotice({ ...job, classCourse: "Class 5, ".repeat(80) }).message;
    expect(Array.from(long).length).toBeLessThanOrEqual(340);
    expect(long.endsWith("… · Mirpur 10, Dhaka · 9,000 Taka")).toBe(true);
  });

  it("is never longer than the notice column holds", () => {
    expect(Array.from(newTuitionNotice({ ...job, category: "ক".repeat(900) }).message).length).toBeLessThanOrEqual(360);
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
