import { describe, expect, it } from "vitest";
import { tuitionPayments, tutorRequests } from "../drizzle/schema";
import {
  buildChargeTerms,
  chargeKindForTuitionType,
  addDhakaMonths,
  chargeSchedule,
  chargeSettlement,
  chargeSummary,
  endOfDhakaDayAfter,
  tuitionPaymentMethodValues,
  tuitionPaymentStatusValues,
  tutorReportableMethods,
} from "./platform-charge";
import { defaultSiteLimits } from "./site-limits";

const limits = defaultSiteLimits() as unknown as Record<string, number>;
// 10:00 in Dhaka on Monday 1 June 2026.
const confirmedAt = new Date("2026-06-01T04:00:00.000Z");
const day = (n: number, hour = 12) => new Date(Date.UTC(2026, 5, 1 + n, hour - 6, 0, 0));

const terms = (tuitionType: string, salary = 10000) => buildChargeTerms({ tuitionType, salary, limits })!;

describe("what each kind of tuition owes on a 10,000 salary", () => {
  it.each([
    ["home", 3000, 3000, 6000, 5000],
    ["online", 2500, 2500, 5000, 4500],
    ["package", 2000, 1500, 3500, 3000],
    ["group", 2000, 2000, 4000, 3500],
  ])("%s: %i then %i, %i in all, %i paid in full inside the window", (kind, first, second, total, early) => {
    const schedule = chargeSchedule(terms(kind), confirmedAt);
    expect(schedule).toMatchObject({ first, second, total, early });
  });

  it("carries a tuition open to Home or Online at the Home rate", () => {
    expect(chargeKindForTuitionType("both")).toBe("home");
    expect(terms("both").kind).toBe("home");
  });

  it("has nothing to take a share of when the tuition has no salary", () => {
    expect(buildChargeTerms({ tuitionType: "home", salary: null, limits })).toBeNull();
    expect(buildChargeTerms({ tuitionType: "home", salary: 0, limits })).toBeNull();
  });

  it("rounds to a whole taka, and the two instalments always add up to the total", () => {
    const schedule = chargeSchedule(terms("package", 6333), confirmedAt);
    expect(schedule.first + schedule.second).toBe(schedule.total);
    expect(Number.isInteger(schedule.first)).toBe(true);
  });

  it("never lets the reduced total exceed the full one", () => {
    const greedy = buildChargeTerms({ tuitionType: "home", salary: 10000, limits: { ...limits, "charge.home.early": 90 } })!;
    expect(chargeSchedule(greedy, confirmedAt).early).toBe(6000);
  });
});

describe("the first window", () => {
  it("includes the whole of the seventh day, not the hour of confirmation", () => {
    const ends = endOfDhakaDayAfter(confirmedAt, 7);
    expect(ends.toISOString()).toBe("2026-06-08T17:59:59.999Z");
  });

  it("falls due the second instalment a month after confirmation", () => {
    expect(chargeSchedule(terms("home"), confirmedAt).secondDueAt.toISOString()).toBe("2026-07-01T17:59:59.999Z");
  });
});

describe("where a Home tuition's charge stands", () => {
  const home = terms("home");

  it("starts at Full Due with the whole charge owed", () => {
    expect(chargeSummary(home, confirmedAt, [])).toMatchObject({ status: "full_due", owed: 6000, paid: 0, balance: 6000 });
  });

  it("marks the first instalment paid as Half Paid, with the second still owed", () => {
    const summary = chargeSummary(home, confirmedAt, [{ amount: 3000, paidAt: day(3) }]);
    expect(summary).toMatchObject({ status: "half_paid", owed: 6000, balance: 3000, discounted: false });
  });

  it("gives the reduced total to a Tutor who pays everything inside the window", () => {
    const summary = chargeSummary(home, confirmedAt, [{ amount: 5000, paidAt: day(6) }]);
    expect(summary).toMatchObject({ status: "full_paid", owed: 5000, balance: 0, discounted: true });
  });

  it("gives it to one who pays in two goes, both inside the window", () => {
    const summary = chargeSummary(home, confirmedAt, [{ amount: 3000, paidAt: day(2) }, { amount: 2000, paidAt: day(7, 20) }]);
    expect(summary).toMatchObject({ status: "full_paid", discounted: true, balance: 0 });
  });

  it("does not give it once the window has closed, and what was paid still counts", () => {
    const summary = chargeSummary(home, confirmedAt, [{ amount: 3000, paidAt: day(3) }, { amount: 2000, paidAt: day(9) }]);
    expect(summary).toMatchObject({ status: "half_paid", owed: 6000, paid: 5000, balance: 1000, discounted: false });
  });

  it("calls anything short of the first instalment a partial payment", () => {
    expect(chargeSummary(home, confirmedAt, [{ amount: 1000, paidAt: day(2) }]).status).toBe("partial_paid");
  });

  it("owes the full total on what was left after a partial first payment", () => {
    const summary = chargeSummary(home, confirmedAt, [{ amount: 1000, paidAt: day(2) }]);
    expect(summary).toMatchObject({ owed: 6000, balance: 5000, discounted: false });
  });

  it("is Full Paid once both instalments are in, late or not", () => {
    const summary = chargeSummary(home, confirmedAt, [{ amount: 3000, paidAt: day(3) }, { amount: 3000, paidAt: day(35) }]);
    expect(summary).toMatchObject({ status: "full_paid", owed: 6000, balance: 0 });
  });
});

describe("the other kinds follow their own first instalment", () => {
  it("counts a Package's 2,000 as its first instalment, though that is not half of 3,500", () => {
    const summary = chargeSummary(terms("package"), confirmedAt, [{ amount: 2000, paidAt: day(3) }]);
    expect(summary).toMatchObject({ status: "half_paid", balance: 1500 });
  });

  it("gives an Online tuition its 4,500 reduced total inside the window", () => {
    const summary = chargeSummary(terms("online"), confirmedAt, [{ amount: 4500, paidAt: day(5) }]);
    expect(summary).toMatchObject({ status: "full_paid", owed: 4500, discounted: true });
  });
});

describe("the ledger's vocabulary", () => {
  it("is the same list the columns accept", () => {
    expect(tuitionPayments.method.enumValues).toEqual([...tuitionPaymentMethodValues]);
    expect(tuitionPayments.status.enumValues).toEqual([...tuitionPaymentStatusValues]);
  });

  it("lets an Admin apply credit, but a Tutor can only report money they sent", () => {
    expect(tuitionPaymentMethodValues).toContain("credit");
    expect(tutorReportableMethods).not.toContain("credit");
    for (const method of tutorReportableMethods) expect(tuitionPaymentMethodValues).toContain(method);
  });

  it("keeps the terms snapshot beside the tuition, empty until it is confirmed", () => {
    expect(tutorRequests.chargeTerms.notNull).toBe(false);
  });
});

describe("when a confirmed tuition is cancelled", () => {
  // Confirmed at 10:00 Dhaka on 1 June 2026. A cancellation is dated by the day it happened.
  const cancelled = (month: number, dayOfMonth: number) => new Date(Date.UTC(2026, month - 1, dayOfMonth, 6, 0, 0));
  const settle = (kind: string, over: { paid?: number; reason?: any; at?: Date; received?: number | null } = {}) =>
    chargeSettlement({
      terms: terms(kind),
      confirmedAt,
      cancelledAt: over.at ?? cancelled(6, 20),
      paid: over.paid ?? 0,
      reason: over.reason ?? "guardian_valid",
      receivedSalary: over.received,
    });

  it("charges Home a share of the salary it actually received when nothing was paid, in the first month", () => {
    // 5,000 received at the 30% first-instalment rate: 1,500.
    expect(settle("home", { received: 5000 })).toMatchObject({ phase: "unpaid_first_month", retained: 1500, refund: 0, due: 1500 });
  });

  it("does the same for every kind, each at its own first-instalment rate", () => {
    expect(settle("online", { received: 5000 }).retained).toBe(1250);
    expect(settle("package", { received: 5000 }).retained).toBe(1000);
    expect(settle("group", { received: 5000 }).retained).toBe(1000);
  });

  it("never charges more than the full charge, however much was received", () => {
    expect(settle("home", { received: 50000 }).retained).toBe(6000);
  });

  it("gives back 30% of the salary from a Home tuition closed in its first month for a valid reason", () => {
    expect(settle("home", { paid: 6000 })).toMatchObject({ phase: "first_month", refundPct: 30, retained: 3000, refund: 3000, due: 0 });
  });

  it("gives back 15% in the second month, keeping 4,500 of the 6,000 paid", () => {
    expect(settle("home", { paid: 6000, at: cancelled(7, 15) })).toMatchObject({ phase: "second_month", refundPct: 15, retained: 4500, refund: 1500, due: 0 });
  });

  it("gives back nothing after two months, and what was left unpaid is still owed", () => {
    expect(settle("home", { paid: 3000, at: cancelled(8, 20) })).toMatchObject({ phase: "later", refund: 0, retained: 6000, due: 3000 });
  });

  it("gives back nothing when the fault was the Tutor's, or the news came late", () => {
    for (const reason of ["tutor_fault", "late_notice", "other"] as const) {
      expect(settle("home", { paid: 6000, reason })).toMatchObject({ refundPct: 0, retained: 6000, refund: 0 });
    }
  });

  it("gives back nothing to a Tutor who had paid only the first instalment, which is what is kept anyway", () => {
    expect(settle("home", { paid: 3000 })).toMatchObject({ retained: 3000, refund: 0, due: 0 });
  });

  it("follows each kind's own refund rates: Online first month only, Package never, Group first month only", () => {
    expect(settle("online", { paid: 5000 })).toMatchObject({ refundPct: 25, retained: 2500, refund: 2500 });
    expect(settle("online", { paid: 5000, at: cancelled(7, 15) })).toMatchObject({ refundPct: 0, retained: 5000, refund: 0 });
    expect(settle("package", { paid: 3500 })).toMatchObject({ refundPct: 0, retained: 3500, refund: 0 });
    expect(settle("group", { paid: 4000 })).toMatchObject({ refundPct: 20, retained: 2000, refund: 2000 });
  });

  it("gives back what a Tutor overpaid the reduced total by, too", () => {
    // Paid the reduced 5,000 in the window, then the tuition closed in the second month: 4,500 is kept.
    expect(settle("home", { paid: 5000, at: cancelled(7, 15) })).toMatchObject({ retained: 4500, refund: 500 });
  });

  it("ignores the salary received once anything has been paid, or the first month is over", () => {
    expect(settle("home", { paid: 3000, received: 5000 }).phase).toBe("first_month");
    expect(settle("home", { received: 5000, at: cancelled(7, 15) }).phase).toBe("second_month");
  });

  it("counts a month to the end of its last day", () => {
    const at = (iso: string) => chargeSettlement({ terms: terms("home"), confirmedAt, cancelledAt: new Date(iso), paid: 6000, reason: "guardian_valid" }).phase;
    expect(at("2026-07-01T17:59:59.999Z")).toBe("first_month");
    expect(at("2026-07-01T18:00:00.000Z")).toBe("second_month");
  });

  it("ends a month that has no such day on its last one", () => {
    // 31 January plus a month is the end of February.
    expect(addDhakaMonths(new Date("2026-01-31T04:00:00.000Z"), 1).toISOString()).toBe("2026-02-28T17:59:59.999Z");
  });

  it("takes the terms it was confirmed on, so a later change of rates does not reach back", () => {
    const changed = buildChargeTerms({ tuitionType: "home", salary: 10000, limits: { ...limits, "charge.home.refund1": 10 } })!;
    expect(chargeSettlement({ terms: changed, confirmedAt, cancelledAt: cancelled(6, 20), paid: 6000, reason: "guardian_valid" }).refund).toBe(1000);
    expect(settle("home", { paid: 6000 }).refund).toBe(3000);
  });
});

describe("a settled tuition", () => {
  it("is owed what it was settled at, not what the schedule says", () => {
    const summary = chargeSummary(terms("home"), confirmedAt, [{ amount: 3000, paidAt: day(3) }], { settledOwed: 4500 });
    expect(summary).toMatchObject({ owed: 4500, paid: 3000, balance: 1500, discounted: false, status: "half_paid" });
  });

  it("is paid once the settled amount is in, and owes nothing when it was settled at nothing", () => {
    expect(chargeSummary(terms("home"), confirmedAt, [{ amount: 4500, paidAt: day(3) }], { settledOwed: 4500 })).toMatchObject({ status: "full_paid", balance: 0 });
    expect(chargeSummary(terms("home"), confirmedAt, [], { settledOwed: 0 })).toMatchObject({ balance: 0, owed: 0 });
  });
});
