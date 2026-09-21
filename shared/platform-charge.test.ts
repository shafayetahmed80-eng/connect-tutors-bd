import { describe, expect, it } from "vitest";
import {
  buildChargeTerms,
  chargeKindForTuitionType,
  chargeSchedule,
  chargeSummary,
  endOfDhakaDayAfter,
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
