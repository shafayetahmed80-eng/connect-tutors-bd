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
      title: "Payment recorded for 6820",
      message: "3,000 Taka was recorded against your platform charge.",
    });
  });

  it("says a reported payment now counts once it is verified", () => {
    expect(paymentVerifiedTutorNotification("6820", 1500)).toEqual({
      title: "Your payment for 6820 was verified",
      message: "1,500 Taka now counts towards your platform charge.",
    });
  });

  it("says what to do when a reported payment could not be confirmed", () => {
    expect(paymentRejectedTutorNotification("6820", 1500)).toEqual({
      title: "Your payment for 6820 was not accepted",
      message: "We could not confirm 1,500 Taka. Check the transaction ID and report it again.",
    });
  });
});

describe("what a Tutor is told when a cancelled tuition is settled", () => {
  it("says a refund is being returned to them", () => {
    expect(tuitionSettledTutorNotification("6820", { refund: 1000, due: 0, disposition: "refunded" })).toEqual({
      title: "Tuition 6820 has been settled",
      message: "1,000 Taka of what you paid is being returned to you.",
    });
  });

  it("says a refund was added to their credit", () => {
    expect(tuitionSettledTutorNotification("6820", { refund: 1000, due: 0, disposition: "credited" }).message)
      .toBe("1,000 Taka was added to your credit, to use on your other tuitions.");
  });

  it("says what is still due", () => {
    expect(tuitionSettledTutorNotification("6820", { refund: 0, due: 1500, disposition: "none" }).message)
      .toBe("1,500 Taka is still due for this tuition.");
  });

  it("says when nothing more is due either way", () => {
    expect(tuitionSettledTutorNotification("6820", { refund: 0, due: 0, disposition: "none" }).message)
      .toBe("Nothing more is due for this tuition.");
  });
});
