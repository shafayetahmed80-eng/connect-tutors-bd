import { describe, expect, it } from "vitest";
import {
  buildClosedReceiptContent,
  buildPaymentReceiptContent,
  closedReceiptNumber,
  paymentReceiptNumber,
  receiptFileName,
  renderClosedTuitionReceiptPdf,
  renderPaymentReceiptPdf,
  type ClosedTuitionReceiptDocument,
  type PaymentReceiptDocument,
} from "./payment-receipt-pdf";

const paidOn = new Date("2026-10-05T06:00:00.000Z");
const verifiedOn = new Date("2026-10-06T04:30:00.000Z");

const receipt: PaymentReceiptDocument = {
  receiptNumber: "RCT-2026-000123",
  requestId: 21,
  tutorName: "Tania Sultana",
  tutorNumber: 777,
  payment: { amount: 2400, method: "bkash", reference: "9K4P2LQ7", paidAt: paidOn, verifiedAt: verifiedOn },
  charge: { owed: 4800, paidThrough: 2400, balance: 2400 },
  issuedAt: new Date("2026-10-08T05:00:00.000Z"),
};

const final: ClosedTuitionReceiptDocument = {
  receiptNumber: "RCT-2026-J6820",
  requestId: 21,
  tutorName: "Tania Sultana",
  tutorNumber: 777,
  closedAt: new Date("2026-10-07T06:00:00.000Z"),
  payments: [
    { amount: 2400, method: "bkash", reference: "9K4P2LQ7", paidAt: paidOn },
    { amount: 2400, method: "cash", reference: null, paidAt: new Date("2026-10-07T06:00:00.000Z") },
  ],
  charge: { owed: 4800, paid: 4800 },
  issuedAt: new Date("2026-10-08T05:00:00.000Z"),
};

describe("receipt numbers", () => {
  it("number a payment by its own id, so the same payment always has the same receipt", () => {
    expect(paymentReceiptNumber(123, verifiedOn)).toBe("RCT-2026-000123");
    expect(paymentReceiptNumber(123, verifiedOn)).toBe(paymentReceiptNumber(123, verifiedOn));
  });

  it("number a final receipt by the tuition's Job ID", () => {
    expect(closedReceiptNumber(21, paidOn)).toBe("RCT-2026-J6820");
  });

  it("use the Dhaka year, so a payment just after midnight on 1 January is in the new year", () => {
    // 19:00 UTC on 31 December is 01:00 on 1 January in Dhaka.
    expect(paymentReceiptNumber(7, new Date("2026-12-31T19:00:00.000Z"))).toBe("RCT-2027-000007");
    expect(paymentReceiptNumber(7, new Date("2026-12-31T17:59:00.000Z"))).toBe("RCT-2026-000007");
  });

  it("name the file after the receipt", () => {
    expect(receiptFileName("RCT-2026-000123")).toBe("Connect-Tutors-Receipt-RCT-2026-000123.pdf");
  });
});

describe("what a payment receipt says", () => {
  it("names the Tutor, the Job ID and the money, in the site's own words", () => {
    const content = buildPaymentReceiptContent(receipt);

    expect(content.jobId).toBe("6820");
    expect(content.tutorRows).toEqual([["Name", "Tania Sultana"], ["Tutor ID", "777"]]);
    expect(content.paymentRows).toEqual([
      ["Amount received", "2,400 Taka"],
      ["Method", "bKash"],
      ["Reference", "9K4P2LQ7"],
      ["Paid on", "05 Oct 2026"],
      ["Verified on", "06 Oct 2026"],
    ]);
    expect(content.chargeRows).toEqual([
      ["Platform charge", "4,800 Taka"],
      ["Paid up to this payment", "2,400 Taka"],
      ["Balance after this payment", "2,400 Taka"],
    ]);
  });

  it("leaves out a reference nobody gave, a Tutor ID not yet issued, and a charge the tuition no longer has", () => {
    const content = buildPaymentReceiptContent({ ...receipt, tutorNumber: null, charge: null, payment: { ...receipt.payment, reference: null, verifiedAt: null } });

    expect(content.tutorRows).toEqual([["Name", "Tania Sultana"]]);
    expect(content.paymentRows.map(([label]) => label)).toEqual(["Amount received", "Method", "Paid on"]);
    expect(content.chargeRows).toEqual([]);
  });

  it("never carries a Guardian's or a student's detail", () => {
    const text = JSON.stringify(buildPaymentReceiptContent(receipt));
    expect(text).not.toMatch(/guardian|student|phone|address/i);
  });
});

describe("what a final receipt says", () => {
  it("lists every payment, the totals, and that the charge is paid in full", () => {
    const content = buildClosedReceiptContent(final);

    expect(content.closedOn).toBe("07 Oct 2026");
    expect(content.paymentLines).toEqual([
      ["05 Oct 2026", "bKash", "9K4P2LQ7", "2,400 Taka"],
      ["07 Oct 2026", "Cash", "", "2,400 Taka"],
    ]);
    expect(content.chargeRows).toEqual([["Platform charge", "4,800 Taka"], ["Total paid", "4,800 Taka"], ["Balance", "0 Taka"]]);
    expect(content.highlight).toEqual(["Paid in full", "4,800 Taka"]);
  });
});

describe("the PDF", () => {
  const isPdf = (bytes: Buffer) => bytes.subarray(0, 5).toString("latin1") === "%PDF-";

  it("is drawn for a payment receipt, one page", async () => {
    const bytes = await renderPaymentReceiptPdf(receipt, { contactNumber: "8801516131411" });
    expect(isPdf(bytes)).toBe(true);
    expect((bytes.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(1);
  });

  it("is drawn for a final receipt, one page", async () => {
    const bytes = await renderClosedTuitionReceiptPdf(final, { contactNumber: "8801516131411" });
    expect(isPdf(bytes)).toBe(true);
    expect((bytes.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(1);
  });

  it("still fits one page with a Bengali name and a long list of payments", async () => {
    const many = Array.from({ length: 20 }, (_, index) => ({ amount: 100, method: "cash" as const, reference: null, paidAt: new Date(paidOn.getTime() + index * 86_400_000) }));
    const bytes = await renderClosedTuitionReceiptPdf({ ...final, tutorName: "তানিয়া সুলতানা", payments: many, charge: { owed: 2000, paid: 2000 } }, { contactNumber: "8801516131411" });
    expect(isPdf(bytes)).toBe(true);
    expect((bytes.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(1);
  });
});
