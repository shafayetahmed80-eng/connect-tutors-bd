import { describe, expect, it } from "vitest";
import {
  tuitionSettledTutorNotification,
  paymentRecordedTutorNotification,
  paymentRejectedTutorNotification,
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
