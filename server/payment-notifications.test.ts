import { describe, expect, it } from "vitest";
import {
  tuitionClosedTutorNotification,
  tuitionSettledTutorNotification,
  paymentRecordedTutorNotification,
  paymentRejectedTutorNotification,
  paymentReminderAdminSummary,
  paymentReminderTutorNotification,
  paymentVerifiedTutorNotification,
} from "./payment-notifications";

describe("what a Tutor is told about a payment", () => {
  it("names the tuition and the amount when an Admin records one", () => {
    expect(paymentRecordedTutorNotification("6820", 3000)).toEqual({
      title: "6820-এর জন্য পেমেন্ট রেকর্ড হয়েছে",
      message: "আপনার প্ল্যাটফর্ম চার্জের বিপরীতে 3,000 টাকা রেকর্ড করা হয়েছে।",
    });
  });

  it("says a reported payment now counts once it is verified", () => {
    expect(paymentVerifiedTutorNotification("6820", 1500)).toEqual({
      title: "6820-এর জন্য আপনার পেমেন্ট যাচাই হয়েছে",
      message: "1,500 টাকা এখন আপনার প্ল্যাটফর্ম চার্জে যোগ হয়েছে।",
    });
  });

  it("says what to do when a reported payment could not be confirmed", () => {
    expect(paymentRejectedTutorNotification("6820", 1500)).toEqual({
      title: "6820-এর জন্য আপনার পেমেন্ট গ্রহণ করা হয়নি",
      message: "1,500 টাকা নিশ্চিত করা যায়নি। ট্রানজেকশন আইডি যাচাই করে আবার জানান।",
    });
  });
});

describe("what a Tutor is told when the last of the fee is in", () => {
  it("says the payment is complete and the tuition is Closed", () => {
    expect(tuitionClosedTutorNotification("6820")).toEqual({
      title: "পেমেন্ট সম্পূর্ণ",
      message: "Job ID 6820-এর পেমেন্ট সম্পূর্ণ হয়েছে। টিউশনটি এখন Closed।",
    });
  });
});

describe("what a Tutor is told when a cancelled tuition is settled", () => {
  it("says a refund is being returned to them", () => {
    expect(tuitionSettledTutorNotification("6820", { refund: 1000, due: 0, disposition: "refunded" })).toEqual({
      title: "6820 টিউশনের হিসাব মিটমাট হয়েছে",
      message: "আপনার দেওয়া 1,000 টাকা ফেরত দেওয়া হচ্ছে।",
    });
  });

  it("says a refund was added to their credit", () => {
    expect(tuitionSettledTutorNotification("6820", { refund: 1000, due: 0, disposition: "credited" }).message)
      .toBe("1,000 টাকা আপনার ক্রেডিটে যোগ করা হয়েছে, অন্য টিউশনে ব্যবহার করতে পারবেন।");
  });

  it("says what is still due", () => {
    expect(tuitionSettledTutorNotification("6820", { refund: 0, due: 1500, disposition: "none" }).message)
      .toBe("এই টিউশনের জন্য এখনো 1,500 টাকা বাকি আছে।");
  });

  it("says when nothing more is due either way", () => {
    expect(tuitionSettledTutorNotification("6820", { refund: 0, due: 0, disposition: "none" }).message)
      .toBe("এই টিউশনের জন্য আর কিছু বাকি নেই।");
  });
});

describe("what a Tutor is told when money is still owed", () => {
  const lastDayOfWindow = new Date("2026-10-08T17:59:59Z"); // the last second of 8 October in Dhaka

  it("says how long the reduced rate lasts and how much more it takes", () => {
    expect(paymentReminderTutorNotification("window", "6820", 2500, lastDayOfWindow)).toEqual({
      title: "6820: কম রেটে চার্জ দেওয়ার সময় শেষ হচ্ছে",
      message: "কম রেটের শেষ দিন ৮ অক্টোবর। ওই দিনের মধ্যে আরও 2,500 টাকা দিলে প্ল্যাটফর্ম চার্জ কম রেটে মিটবে।",
    });
  });

  it("names the date the rest is due and the amount", () => {
    expect(paymentReminderTutorNotification("second", "6820", 5000, lastDayOfWindow)).toEqual({
      title: "6820: চার্জের শেষ তারিখ কাছে",
      message: "শেষ তারিখ ৮ অক্টোবর। 5,000 টাকা মিটিয়ে দিন।",
    });
  });

  it("says the date has passed without repeating it", () => {
    expect(paymentReminderTutorNotification("overdue", "6820", 5000, null)).toEqual({
      title: "6820: প্ল্যাটফর্ম চার্জ বাকি আছে",
      message: "নির্ধারিত তারিখ পেরিয়ে গেছে, এখনো 5,000 টাকা বাকি। দয়া করে মিটিয়ে দিন।",
    });
  });

  it("gives the Admins one line, counting only the kinds that went out", () => {
    expect(paymentReminderAdminSummary({ window: 1, second: 0, overdue: 2 })).toEqual({
      title: "Payment reminders sent",
      body: "3 reminders went to Tutors: 1 reduced-rate window closing, 2 overdue.",
    });
    expect(paymentReminderAdminSummary({ window: 0, second: 1, overdue: 0 }).body).toBe("1 reminder went to Tutors: 1 due date near.");
  });
});
