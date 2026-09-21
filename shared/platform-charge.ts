/**
 * What a Tutor owes Connect Tutors once a tuition is confirmed, and how much
 * of it has been paid.
 *
 * The charge is a share of the tuition's monthly salary, taken in two
 * instalments: the first within a few days of confirmation, the second once the
 * Tutor has been paid for the first month. Paying everything inside the first
 * window earns a smaller total. All the numbers are the Owner's, set from Admin
 * Control; this module only turns them into amounts and a status.
 *
 * Nothing here reads the database, so the same rules answer for the Admin's
 * list, the Tutor's own page and, later, a payment gateway's webhook.
 */
import type { JobPaymentStatus } from "./job-payment-status";

export const chargeKinds = ["home", "online", "package", "group"] as const;
export type ChargeKind = (typeof chargeKinds)[number];

export const chargeKindLabels: Record<ChargeKind, string> = {
  home: "Home Tutoring",
  online: "Online Tutoring",
  package: "Package Tutoring",
  group: "Group Tutoring",
};

/**
 * How a Tutor can pay. `drizzle/schema.ts` repeats these values for the column
 * (it imports nothing from here); a test keeps the two lists the same.
 */
export const tuitionPaymentMethodValues = ["bkash", "nagad", "rocket", "bank", "cash", "other"] as const;
export type TuitionPaymentMethod = (typeof tuitionPaymentMethodValues)[number];

export const tuitionPaymentMethodLabels: Record<TuitionPaymentMethod, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  bank: "Bank transfer",
  cash: "Cash",
  other: "Other",
};

/** The methods the Owner has an account for; cash and other need none. */
export const paymentAccountMethods = ["bkash", "nagad", "rocket", "bank"] as const satisfies readonly TuitionPaymentMethod[];
export type PaymentAccountMethod = (typeof paymentAccountMethods)[number];

/** The site-content slot that holds where a Tutor should send money for a method. */
export function paymentAccountSlotId(method: PaymentAccountMethod): string {
  return `payment.account.${method}`;
}

/** Only a verified payment counts towards what is paid. */
export const tuitionPaymentStatusValues = ["submitted", "verified", "rejected"] as const;
export type TuitionPaymentStatus = (typeof tuitionPaymentStatusValues)[number];

export const tuitionPaymentStatusLabels: Record<TuitionPaymentStatus, string> = {
  submitted: "Waiting",
  verified: "Verified",
  rejected: "Rejected",
};

/** The limit ids the Owner's numbers are stored under. */
export const CHARGE_WINDOW_DAYS_ID = "charge.windowDays";
export const CHARGE_SECOND_DUE_DAYS_ID = "charge.secondDueDays";
export function chargeRateLimitId(kind: ChargeKind, part: "first" | "second" | "early"): string {
  return `charge.${kind}.${part}`;
}

/**
 * A tuition open to Home or Online carries the Home rate: it is the dearer of
 * the two, and the Admin's confirmation is where a tuition stops being both.
 */
export function chargeKindForTuitionType(tuitionType: string): ChargeKind {
  if (tuitionType === "online" || tuitionType === "package" || tuitionType === "group") return tuitionType;
  return "home";
}

/**
 * The terms a tuition was confirmed on, kept with it. Rates change; a tuition
 * confirmed last month keeps the rates it was confirmed at.
 */
export type ChargeTerms = {
  kind: ChargeKind;
  /** The agreed monthly salary the percentages are taken of. */
  salary: number;
  firstPct: number;
  secondPct: number;
  /** The total when everything is paid inside the first window. */
  earlyPct: number;
  windowDays: number;
  secondDueDays: number;
};

type LimitValues = Record<string, number>;

/** Null when the tuition has no salary to take a share of. */
export function buildChargeTerms(input: { tuitionType: string; salary: number | null | undefined; limits: LimitValues }): ChargeTerms | null {
  const salary = Number(input.salary ?? 0);
  if (!Number.isFinite(salary) || salary <= 0) return null;
  const kind = chargeKindForTuitionType(input.tuitionType);
  const firstPct = input.limits[chargeRateLimitId(kind, "first")] ?? 0;
  const secondPct = input.limits[chargeRateLimitId(kind, "second")] ?? 0;
  // An early total above the full total would make paying early cost more.
  const earlyPct = Math.min(input.limits[chargeRateLimitId(kind, "early")] ?? firstPct + secondPct, firstPct + secondPct);
  return {
    kind,
    salary: Math.round(salary),
    firstPct,
    secondPct,
    earlyPct,
    windowDays: input.limits[CHARGE_WINDOW_DAYS_ID] ?? 7,
    secondDueDays: input.limits[CHARGE_SECOND_DUE_DAYS_ID] ?? 30,
  };
}

/** Bangladesh has no daylight saving, so a fixed offset is the honest clock. */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The last instant of the Dhaka day that is `days` after `from`. "Within 7 days" includes the seventh. */
export function endOfDhakaDayAfter(from: Date, days: number): Date {
  const shifted = from.getTime() + DHAKA_OFFSET_MS;
  const startOfDay = Math.floor(shifted / DAY_MS) * DAY_MS;
  return new Date(startOfDay + (days + 1) * DAY_MS - 1 - DHAKA_OFFSET_MS);
}

export type ChargeSchedule = {
  /** Both instalments, when the first window is missed. */
  total: number;
  first: number;
  second: number;
  /** The reduced total for paying everything inside the window. */
  early: number;
  windowEndsAt: Date;
  secondDueAt: Date;
};

const share = (salary: number, pct: number) => Math.round((salary * pct) / 100);

export function chargeSchedule(terms: ChargeTerms, confirmedAt: Date): ChargeSchedule {
  const total = share(terms.salary, terms.firstPct + terms.secondPct);
  const first = Math.min(share(terms.salary, terms.firstPct), total);
  return {
    total,
    first,
    second: total - first,
    early: Math.min(share(terms.salary, terms.earlyPct), total),
    windowEndsAt: endOfDhakaDayAfter(confirmedAt, terms.windowDays),
    secondDueAt: endOfDhakaDayAfter(confirmedAt, terms.secondDueDays),
  };
}

export type ChargePayment = { amount: number; paidAt: Date };

export type ChargeSummary = ChargeSchedule & {
  /** What is owed: the reduced total once it was earned, else the full one. */
  owed: number;
  paid: number;
  balance: number;
  /** True when everything owed was paid inside the first window. */
  discounted: boolean;
  status: JobPaymentStatus;
};

/**
 * Where a tuition's charge stands, from the payments that were verified.
 *
 * The reduced total is earned by having paid it in full inside the window, in
 * one payment or several. Missing it does not cost the first instalment: what
 * was paid still counts, and the rest is owed at the full total.
 */
export function chargeSummary(terms: ChargeTerms, confirmedAt: Date, payments: readonly ChargePayment[]): ChargeSummary {
  const schedule = chargeSchedule(terms, confirmedAt);
  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const paidInWindow = payments
    .filter(payment => payment.paidAt.getTime() <= schedule.windowEndsAt.getTime())
    .reduce((sum, payment) => sum + payment.amount, 0);
  const discounted = schedule.early < schedule.total && paidInWindow >= schedule.early;
  const owed = discounted ? schedule.early : schedule.total;

  let status: JobPaymentStatus = "full_due";
  if (paid >= owed) status = "full_paid";
  else if (paid >= schedule.first) status = "half_paid";
  else if (paid > 0) status = "partial_paid";

  return { ...schedule, owed, paid, balance: Math.max(0, owed - paid), discounted, status };
}
