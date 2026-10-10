import { readFileSync } from "node:fs";
import PDFDocument from "pdfkit";
import { formatPostedDate } from "@shared/job-card";
import { jobIdForRequest } from "@shared/job-id";
import { tuitionPaymentMethodLabels, type TuitionPaymentMethod } from "@shared/platform-charge";
import {
  SITE_ADDRESS,
  colour,
  drawLogo,
  drawRows,
  fontFiles,
  formatLetterPhone,
  sectionLabel,
  type LetterRow,
} from "./confirmation-letter-pdf";

/**
 * What a Tutor is given as proof of paying Connect Tutors' charge on a
 * Confirmed tuition: a receipt for one verified payment, and a final receipt for
 * the whole of it once the fee is paid in full (the tuition is Closed).
 *
 * Plain on purpose, in the letter's typeface and logo but none of its ornament:
 * it is printed, filed and shown to an accountant. English only, like the
 * letter. It names the Tutor, the Job ID and the money, and nothing about the
 * Guardian or the student.
 */

const taka = (amount: number) => `${amount.toLocaleString("en-US")} Taka`;

/** The Dhaka calendar year of a moment, so a payment verified just after midnight on 1 January is numbered in the new year. */
function dhakaYear(at: Date) {
  return new Date(at.getTime() + 6 * 60 * 60 * 1000).getUTCFullYear();
}

/** "RCT-2026-000123": the payment's own number, so the same payment always has the same receipt. */
export function paymentReceiptNumber(paymentId: number, at: Date) {
  return `RCT-${dhakaYear(at)}-${String(paymentId).padStart(6, "0")}`;
}

/** "RCT-2026-J6820": one final receipt per tuition, numbered by its Job ID. */
export function closedReceiptNumber(requestId: number, at: Date) {
  return `RCT-${dhakaYear(at)}-J${jobIdForRequest(requestId)}`;
}

export function receiptFileName(receiptNumber: string) {
  return `Connect-Tutors-Receipt-${receiptNumber}.pdf`;
}

type ReceiptPayment = {
  amount: number;
  method: TuitionPaymentMethod;
  reference: string | null;
  paidAt: Date;
};

export type PaymentReceiptDocument = {
  receiptNumber: string;
  requestId: number;
  tutorName: string;
  tutorNumber: number | string | null;
  payment: ReceiptPayment & { verifiedAt: Date | null };
  /** Where the charge stands after this payment; null when the tuition no longer has one (its Tutor was changed). */
  charge: { owed: number; paidThrough: number; balance: number } | null;
  /** The day the receipt was drawn up: the figures above are as of it. */
  issuedAt: Date;
};

export type ClosedTuitionReceiptDocument = {
  receiptNumber: string;
  requestId: number;
  tutorName: string;
  tutorNumber: number | string | null;
  closedAt: Date;
  payments: ReceiptPayment[];
  charge: { owed: number; paid: number };
  issuedAt: Date;
};

function tutorRows(name: string, number: number | string | null): LetterRow[] {
  const id = number === null || number === "" ? null : String(number);
  return [["Name", name], ...(id ? [["Tutor ID", id] as const] : [])];
}

function methodWords(payment: ReceiptPayment) {
  return tuitionPaymentMethodLabels[payment.method] ?? payment.method;
}

/** Everything the single-payment receipt says, worked out before anything is drawn. */
export function buildPaymentReceiptContent(receipt: PaymentReceiptDocument) {
  const { payment } = receipt;
  const paymentRows: LetterRow[] = [
    ["Amount received", taka(payment.amount)],
    ["Method", methodWords(payment)],
    ...(payment.reference ? [["Reference", payment.reference] as const] : []),
    ["Paid on", formatPostedDate(payment.paidAt)],
    ...(payment.verifiedAt ? [["Verified on", formatPostedDate(payment.verifiedAt)] as const] : []),
  ];
  const chargeRows: LetterRow[] = receipt.charge
    ? [
        ["Platform charge", taka(receipt.charge.owed)],
        ["Paid up to this payment", taka(receipt.charge.paidThrough)],
        ["Balance after this payment", taka(receipt.charge.balance)],
      ]
    : [];
  return {
    receiptNumber: receipt.receiptNumber,
    jobId: jobIdForRequest(receipt.requestId),
    paidOn: formatPostedDate(payment.paidAt),
    tutorRows: tutorRows(receipt.tutorName, receipt.tutorNumber),
    paymentRows,
    chargeRows,
    highlight: ["Amount received", taka(payment.amount)] as const,
  };
}

/** Everything the final receipt says. */
export function buildClosedReceiptContent(receipt: ClosedTuitionReceiptDocument) {
  const paid = receipt.payments.reduce((sum, payment) => sum + payment.amount, 0);
  return {
    receiptNumber: receipt.receiptNumber,
    jobId: jobIdForRequest(receipt.requestId),
    closedOn: formatPostedDate(receipt.closedAt),
    tutorRows: tutorRows(receipt.tutorName, receipt.tutorNumber),
    paymentLines: receipt.payments.map(payment => [
      formatPostedDate(payment.paidAt),
      methodWords(payment),
      payment.reference ?? "",
      taka(payment.amount),
    ] as const),
    chargeRows: [
      ["Platform charge", taka(receipt.charge.owed)],
      ["Total paid", taka(paid)],
      ["Balance", taka(Math.max(0, receipt.charge.owed - paid))],
    ] as LetterRow[],
    highlight: ["Paid in full", taka(paid)] as const,
  };
}

export const receiptCopy = {
  paymentKicker: "PAYMENT RECEIPT",
  paymentTitle: "Receipt",
  paymentIntro: "Connect Tutors confirms that it has received the payment below towards the platform charge on this tuition.",
  finalKicker: "PAID IN FULL",
  finalTitle: "Final Receipt",
  finalIntro: "Connect Tutors confirms that the platform charge on this tuition has been paid in full. The payments received are listed below.",
  note: "Issued electronically. No signature is needed. This receipt leaves out the Guardian's and the student's details.",
  issuedBy: "Issued by",
  issuer: "Connect Tutors Admin Team",
} as const;

type TableSpec = { label: string; head: readonly string[]; weights: readonly number[]; rightAligned: number; rows: ReadonlyArray<readonly string[]> };

type ReceiptSpec = {
  kicker: string;
  heading: string;
  intro: string;
  meta: ReadonlyArray<readonly [label: string, value: string, weight: number]>;
  sections: ReadonlyArray<{ label: string; rows: LetterRow[] }>;
  table?: TableSpec;
  afterTable?: { label: string; rows: LetterRow[] };
  highlight: readonly [label: string, value: string];
  receiptNumber: string;
  asOf: string;
  contactNumber: string;
};

/** One payment line of the table, and what a row of the label/value blocks takes. */
const TABLE_LINE = 22;

function renderReceiptPdf(spec: ReceiptSpec): Promise<Buffer> {
  const document = new PDFDocument({
    size: "A4",
    margins: { top: 60, bottom: 30, left: 62, right: 62 },
    info: { Title: `${spec.heading} ${spec.receiptNumber}`, Author: "Connect Tutors" },
  });
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    document.on("data", chunk => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    for (const [name, file] of Object.entries(fontFiles)) document.registerFont(name, readFileSync(file));
    const left = document.page.margins.left;
    const width = document.page.width - left - document.page.margins.right;
    const right = left + width;
    const footerTop = document.page.height - 54;

    // Letterhead, as on the letter: logo left, how to reach us right, a rule that opens in saffron.
    let y = 60;
    const logoHeight = drawLogo(document, left, y);
    document.font("Regular").fontSize(8.5).fillColor(colour.muted);
    const contactTop = y + (logoHeight - 22) / 2;
    document.text(SITE_ADDRESS, left, contactTop, { width, align: "right", lineBreak: false });
    document.text(formatLetterPhone(spec.contactNumber), left, contactTop + 11, { width, align: "right", lineBreak: false });
    y += logoHeight + 14;
    document.save().lineCap("round").lineWidth(2);
    document.strokeColor(colour.line).moveTo(left, y).lineTo(right, y).stroke();
    document.strokeColor(colour.saffron).moveTo(left, y).lineTo(left + width * 0.14, y).stroke();
    document.restore();

    y += 24;
    document.font("Heavy").fontSize(7.5).fillColor(colour.accent).text(spec.kicker, left, y, { characterSpacing: 1.3, lineBreak: false });
    y += 13;
    document.font("Heavy").fontSize(24).fillColor(colour.ink).text(spec.heading, left, y, { characterSpacing: -0.7, lineBreak: false });
    y += 42;

    // The receipt's number, date and Job ID in one box, so it can be named over the phone.
    const metaHeight = 42;
    const totalWeight = spec.meta.reduce((sum, [, , weight]) => sum + weight, 0);
    document.save().lineWidth(0.75).roundedRect(left, y, width, metaHeight, 6).fillAndStroke(colour.wash, colour.line).restore();
    let cellLeft = left;
    spec.meta.forEach(([label, value, weight], index) => {
      const cellWidth = (width * weight) / totalWeight;
      if (index > 0) document.save().lineWidth(0.75).strokeColor(colour.line).moveTo(cellLeft, y).lineTo(cellLeft, y + metaHeight).stroke().restore();
      document.font("Heavy").fontSize(6.5).fillColor(colour.muted).text(label.toUpperCase(), cellLeft + 11, y + 9, { characterSpacing: 0.7, lineBreak: false });
      document.font("Bold").fontSize(10).fillColor(colour.ink).text(value, cellLeft + 11, y + 21, { lineBreak: false });
      cellLeft += cellWidth;
    });
    y += metaHeight + 20;

    document.font("Regular").fontSize(10).fillColor(colour.body).text(spec.intro, left, y, { width, lineGap: 3 });
    y += document.heightOfString(spec.intro, { width, lineGap: 3 }) + 18;

    const padding = 5;
    for (const section of spec.sections) {
      y = sectionLabel(document, section.label, left, y);
      y = drawRows(document, section.rows, left, width, y, padding) + 16;
    }

    if (spec.table) {
      y = sectionLabel(document, spec.table.label, left, y);
      const totalWeights = spec.table.weights.reduce((sum, weight) => sum + weight, 0);
      const columnLeft: number[] = [];
      let running = left;
      for (const weight of spec.table.weights) {
        columnLeft.push(running);
        running += (width * weight) / totalWeights;
      }
      const columnWidth = (index: number) => (width * spec.table!.weights[index]!) / totalWeights - 8;
      const line = (at: number) => document.save().lineWidth(0.75).strokeColor(colour.hairline).moveTo(left, at).lineTo(right, at).stroke().restore();
      line(y);
      // A tuition is paid in two or three payments, but the page must hold however many there are: what sits under
      // the table is measured, and the lines that fit in the rest are drawn, with a count of any that do not.
      document.font("Regular").fontSize(8.5);
      const noteHeight = document.heightOfString(receiptCopy.note, { width, lineGap: 2.5 }) + 8 + document.heightOfString(spec.asOf, { width, lineGap: 2.5 });
      const afterHeight = spec.afterTable ? 15 + spec.afterTable.rows.length * TABLE_LINE + 16 : 0;
      const reserved = TABLE_LINE + 14 + afterHeight + 42 + 18 + noteHeight + 12;
      const maxLines = Math.max(3, Math.floor((footerTop - y - reserved) / TABLE_LINE) - 1);
      spec.table.head.forEach((heading, index) => {
        document.font("Heavy").fontSize(6.5).fillColor(colour.muted).text(heading.toUpperCase(), columnLeft[index]!, y + 7, {
          width: columnWidth(index), characterSpacing: 0.7, lineBreak: false, align: index === spec.table!.rightAligned ? "right" : "left",
        });
      });
      y += TABLE_LINE;
      line(y);
      const shown = spec.table.rows.slice(0, maxLines);
      for (const row of shown) {
        row.forEach((cell, index) => {
          document.font(index === spec.table!.rightAligned ? "Bold" : "Regular").fontSize(9.5).fillColor(colour.ink);
          document.text(cell, columnLeft[index]!, y + 6, { width: columnWidth(index), lineBreak: false, ellipsis: true, align: index === spec.table!.rightAligned ? "right" : "left" });
        });
        y += TABLE_LINE;
        line(y);
      }
      if (spec.table.rows.length > shown.length) {
        document.font("Regular").fontSize(8.5).fillColor(colour.muted).text(`and ${spec.table.rows.length - shown.length} more payments`, left, y + 6, { lineBreak: false });
        y += TABLE_LINE;
      }
      y += 14;
    }

    if (spec.afterTable) {
      y = sectionLabel(document, spec.afterTable.label, left, y);
      y = drawRows(document, spec.afterTable.rows, left, width, y, padding) + 16;
    }

    // The figure people check first gets the one tinted box.
    const boxHeight = 42;
    document.save().roundedRect(left, y, width, boxHeight, 6).fill(colour.feeWash).restore();
    document.font("Bold").fontSize(10).fillColor(colour.feeInk).text(spec.highlight[0], left + 14, y + 15, { lineBreak: false });
    document.font("Heavy").fontSize(14).fillColor(colour.ink).text(spec.highlight[1], left, y + 12, { width: width - 14, align: "right", lineBreak: false });
    y += boxHeight + 18;

    document.font("Regular").fontSize(8.5).fillColor(colour.muted).text(receiptCopy.note, left, y, { width, lineGap: 2.5 });
    y += document.heightOfString(receiptCopy.note, { width, lineGap: 2.5 }) + 8;
    document.text(spec.asOf, left, y, { width, lineGap: 2.5 });

    document.save().lineWidth(0.75).strokeColor(colour.line).moveTo(left, footerTop).lineTo(right, footerTop).stroke().restore();
    document.font("Bold").fontSize(7.5).fillColor(colour.faint);
    document.text(`Connect Tutors · ${SITE_ADDRESS}`, left, footerTop + 9, { lineBreak: false });
    document.text(`${spec.receiptNumber} · Page 1 of 1`, left, footerTop + 9, { width, align: "right", lineBreak: false });
    document.end();
  });
}

export function renderPaymentReceiptPdf(receipt: PaymentReceiptDocument, options: { contactNumber: string }): Promise<Buffer> {
  const content = buildPaymentReceiptContent(receipt);
  return renderReceiptPdf({
    kicker: receiptCopy.paymentKicker,
    heading: receiptCopy.paymentTitle,
    intro: receiptCopy.paymentIntro,
    meta: [["Receipt No", content.receiptNumber, 1.6], ["Paid on", content.paidOn, 1], ["Job ID", content.jobId, 0.8]],
    sections: [
      { label: "Tutor", rows: content.tutorRows },
      { label: "Payment", rows: content.paymentRows },
      ...(content.chargeRows.length ? [{ label: "Platform charge", rows: content.chargeRows }] : []),
    ],
    highlight: content.highlight,
    receiptNumber: content.receiptNumber,
    asOf: `Figures are as of ${formatPostedDate(receipt.issuedAt)}.`,
    contactNumber: options.contactNumber,
  });
}

export function renderClosedTuitionReceiptPdf(receipt: ClosedTuitionReceiptDocument, options: { contactNumber: string }): Promise<Buffer> {
  const content = buildClosedReceiptContent(receipt);
  return renderReceiptPdf({
    kicker: receiptCopy.finalKicker,
    heading: receiptCopy.finalTitle,
    intro: receiptCopy.finalIntro,
    meta: [["Receipt No", content.receiptNumber, 1.6], ["Closed on", content.closedOn, 1], ["Job ID", content.jobId, 0.8]],
    sections: [{ label: "Tutor", rows: content.tutorRows }],
    table: {
      label: "Payments received",
      head: ["Paid on", "Method", "Reference", "Amount"],
      weights: [1.1, 1, 1.6, 1.1],
      rightAligned: 3,
      rows: content.paymentLines.map(line => [...line]),
    },
    afterTable: { label: "Platform charge", rows: content.chargeRows },
    highlight: content.highlight,
    receiptNumber: content.receiptNumber,
    asOf: `Figures are as of ${formatPostedDate(receipt.issuedAt)}.`,
    contactNumber: options.contactNumber,
  });
}
