import { describe, expect, it } from "vitest";
import {
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
