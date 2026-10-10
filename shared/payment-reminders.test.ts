import { describe, expect, it } from "vitest";
import { chargeKindForTuitionType, chargeSummary, type ChargeTerms } from "./platform-charge";
import { dhakaDaysUntil, dueReminders, isReminderHour, paymentReminderKey } from "./payment-reminders";

// A 10,000 Taka salary: 50% in two halves is 5,000 in all, 4,000 when paid inside the window.
const terms: ChargeTerms = { kind: chargeKindForTuitionType("home"), salary: 10000, firstPct: 25, secondPct: 25, earlyPct: 40, refund1Pct: 0, refund2Pct: 0, windowDays: 7, secondDueDays: 30 };
// 10:00 Dhaka time on 1 October 2026.
const confirmedAt = new Date("2026-10-01T04:00:00Z");
const at = (days: number, hour = 4) => new Date(confirmedAt.getTime() + days * 24 * 60 * 60 * 1000 + (hour - 4) * 60 * 60 * 1000);
const summary = (paid: Array<[number, number]> = []) => chargeSummary(terms, confirmedAt, paid.map(([amount, day]) => ({ amount, paidAt: at(day) })));

describe("the first window", () => {
  it("is reminded about from two days before its last day, and not earlier", () => {
    // Confirmed on day 0, the window's last day is day 7.
    expect(dueReminders(summary(), 0, at(4))).toEqual([]);
    expect(dueReminders(summary(), 0, at(5))).toMatchObject([{ kind: "window", amount: 4000, round: 0 }]);
    expect(dueReminders(summary(), 0, at(6))).toMatchObject([{ kind: "window", amount: 4000 }]);
    expect(dueReminders(summary(), 0, at(7))).toMatchObject([{ kind: "window", amount: 4000 }]);
  });

  it("asks only for the rest of the reduced total once part of it is in", () => {
    expect(dueReminders(summary([[1500, 2]]), 0, at(5))).toMatchObject([{ kind: "window", amount: 2500 }]);
  });

  it("goes quiet once the window is over, and the reduced total can no longer be had", () => {
    expect(dueReminders(summary(), 0, at(8))).toEqual([]);
  });

  it("is not sent when the reduced total was already paid, which leaves nothing owed", () => {
    expect(dueReminders(summary([[4000, 3]]), 0, at(5))).toEqual([]);
  });

  it("is not sent where paying early earns nothing", () => {
    const noDiscount = chargeSummary({ ...terms, earlyPct: 50 }, confirmedAt, []);
    expect(dueReminders(noDiscount, 0, at(5))).toEqual([]);
  });

  it("leaves out what the Tutor has reported and nobody has checked yet", () => {
    expect(dueReminders(summary(), 1000, at(5))).toMatchObject([{ kind: "window", amount: 3000 }]);
    expect(dueReminders(summary(), 4000, at(5))).toEqual([]);
    expect(dueReminders(summary(), 5000, at(5))).toEqual([]);
  });
});

describe("the due date", () => {
  it("is reminded about from three days before it", () => {
    // Day 30 is the due date.
    expect(dueReminders(summary(), 0, at(26))).toEqual([]);
    expect(dueReminders(summary(), 0, at(27))).toMatchObject([{ kind: "second", amount: 5000, round: 0 }]);
    expect(dueReminders(summary(), 0, at(30))).toMatchObject([{ kind: "second", amount: 5000 }]);
  });

  it("asks for what is left of the full total", () => {
    expect(dueReminders(summary([[2000, 9]]), 0, at(28))).toMatchObject([{ kind: "second", amount: 3000 }]);
  });

  it("is not sent for money a Tutor has reported that covers the balance", () => {
    expect(dueReminders(summary([[2000, 9]]), 3000, at(28))).toEqual([]);
    expect(dueReminders(summary([[2000, 9]]), 1000, at(28))).toMatchObject([{ kind: "second", amount: 2000 }]);
  });

  it("is not sent for a tuition that is paid in full", () => {
    expect(dueReminders(summary([[5000, 9]]), 0, at(28))).toEqual([]);
  });
});

describe("a charge that is overdue", () => {
  it("is reminded about the day after the due date, then once a week", () => {
    // The due date is day 30, so day 31 is the first day past it.
    expect(dueReminders(summary(), 0, at(31))).toMatchObject([{ kind: "overdue", amount: 5000, round: 0, deadline: null }]);
    expect(dueReminders(summary(), 0, at(37))).toMatchObject([{ kind: "overdue", round: 0 }]);
    expect(dueReminders(summary(), 0, at(38))).toMatchObject([{ kind: "overdue", round: 1 }]);
    expect(dueReminders(summary(), 0, at(44))).toMatchObject([{ kind: "overdue", round: 1 }]);
    expect(dueReminders(summary(), 0, at(45))).toMatchObject([{ kind: "overdue", round: 2 }]);
  });

  it("asks for the balance, and not at all while a reported payment covers it", () => {
    expect(dueReminders(summary([[2000, 9]]), 0, at(40))).toMatchObject([{ kind: "overdue", amount: 3000 }]);
    expect(dueReminders(summary([[2000, 9]]), 3000, at(40))).toEqual([]);
  });
});

describe("the Dhaka day", () => {
  it("counts days by the calendar in Dhaka, not by hours", () => {
    const lateDay0 = new Date("2026-10-01T17:30:00Z"); // 23:30 in Dhaka, still 1 October
    const earlyDay1 = new Date("2026-10-01T18:30:00Z"); // 00:30 in Dhaka, already 2 October
    const deadline = new Date("2026-10-03T17:59:59Z"); // the last second of 3 October in Dhaka
    expect(dhakaDaysUntil(deadline, lateDay0)).toBe(2);
    expect(dhakaDaysUntil(deadline, earlyDay1)).toBe(1);
    expect(dhakaDaysUntil(deadline, new Date("2026-10-03T17:59:00Z"))).toBe(0);
    expect(dhakaDaysUntil(deadline, new Date("2026-10-03T18:00:00Z"))).toBe(-1);
  });

  it("allows reminders from 08:00 to 20:59 in Dhaka only", () => {
    expect(isReminderHour(new Date("2026-10-10T01:59:00Z"))).toBe(false); // 07:59
    expect(isReminderHour(new Date("2026-10-10T02:00:00Z"))).toBe(true); // 08:00
    expect(isReminderHour(new Date("2026-10-10T14:59:00Z"))).toBe(true); // 20:59
    expect(isReminderHour(new Date("2026-10-10T15:00:00Z"))).toBe(false); // 21:00
    expect(isReminderHour(new Date("2026-10-10T20:00:00Z"))).toBe(false); // 02:00 next day
  });
});

describe("paymentReminderKey", () => {
  it("names the kind, the tuition, the Tutor and the round, so each is sent once", () => {
    expect(paymentReminderKey({ kind: "overdue", round: 2 }, 41, "tutor-9")).toBe("payment-reminder:overdue:41:tutor-9:2");
    expect(paymentReminderKey({ kind: "window", round: 0 }, 41, "tutor-9")).not.toBe(paymentReminderKey({ kind: "second", round: 0 }, 41, "tutor-9"));
  });
});
