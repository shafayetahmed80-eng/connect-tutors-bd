import { describe, expect, it } from "vitest";
import { tutorRequests } from "../drizzle/schema";
import { DEFAULT_JOB_PAYMENT_STATUS, isJobPaymentStatus, jobPaymentStatusLabels, jobPaymentStatusValues } from "./job-payment-status";

describe("job payment status", () => {
  it("offers the Owner's four states, starting at Full Due", () => {
    expect(jobPaymentStatusValues.map(value => jobPaymentStatusLabels[value])).toEqual(["Full Due", "Half Paid", "Partial Paid", "Full Paid"]);
    expect(DEFAULT_JOB_PAYMENT_STATUS).toBe("full_due");
    expect(isJobPaymentStatus("half_paid")).toBe(true);
    expect(isJobPaymentStatus("refunded")).toBe(false);
  });

  it("is the same list the database column accepts, with the same default", () => {
    const column = tutorRequests.paymentStatus;
    expect(column.enumValues).toEqual([...jobPaymentStatusValues]);
    expect(column.default).toBe(DEFAULT_JOB_PAYMENT_STATUS);
    expect(column.notNull).toBe(true);
  });
});
