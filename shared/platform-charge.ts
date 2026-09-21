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
export const tuitionPaymentMethodValues = ["bkash", "nagad", "rocket", "bank", "cash", "other", "credit"] as const;
export type TuitionPaymentMethod = (typeof tuitionPaymentMethodValues)[number];

export const tuitionPaymentMethodLabels: Record<TuitionPaymentMethod, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  bank: "Bank transfer",
  cash: "Cash",
  other: "Other",
  /** Money the Tutor was already owed, from a tuition that was cancelled. Only an Admin applies it. */
  credit: "Credit",
};

/** What a Tutor can say they paid with: credit is applied by an Admin, never claimed. */
export const tutorReportableMethods = ["bkash", "nagad", "rocket", "bank", "cash", "other"] as const;

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
export function chargeRateLimitId(kind: ChargeKind, part: "first" | "second" | "early" | "refund1" | "refund2"): string {
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
  /** Of the salary, given back on a valid cancellation in the first and second month. */
  refund1Pct: number;
  refund2Pct: number;
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
    refund1Pct: input.limits[chargeRateLimitId(kind, "refund1")] ?? 0,
    refund2Pct: input.limits[chargeRateLimitId(kind, "refund2")] ?? 0,
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
export function chargeSummary(terms: ChargeTerms, confirmedAt: Date, payments: readonly ChargePayment[], options: { settledOwed?: number } = {}): ChargeSummary {
  const schedule = chargeSchedule(terms, confirmedAt);
  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const paidInWindow = payments
    .filter(payment => payment.paidAt.getTime() <= schedule.windowEndsAt.getTime())
    .reduce((sum, payment) => sum + payment.amount, 0);
  // A cancelled tuition has been settled at a figure of its own, which the schedule no longer decides.
  const settled = options.settledOwed !== undefined;
  const discounted = !settled && schedule.early < schedule.total && paidInWindow >= schedule.early;
  const owed = settled ? options.settledOwed! : discounted ? schedule.early : schedule.total;

  let status: JobPaymentStatus = "full_due";
  if (paid >= owed) status = "full_paid";
  else if (paid >= schedule.first) status = "half_paid";
  else if (paid > 0) status = "partial_paid";

  return { ...schedule, owed, paid, balance: Math.max(0, owed - paid), discounted, status };
}

/* ------------------------------------------------------------------ */
/* When a confirmed tuition is cancelled                               */
/* ------------------------------------------------------------------ */

/**
 * Why a confirmed tuition ended. Only a valid reason from the Guardian, told to
 * us in time, earns a refund; the Admin decides which of these it was.
 */
export const cancellationReasons = ["guardian_valid", "tutor_fault", "late_notice", "other"] as const;
export type CancellationReason = (typeof cancellationReasons)[number];

export const cancellationReasonLabels: Record<CancellationReason, string> = {
  guardian_valid: "Guardian's valid reason",
  tutor_fault: "Tutor's fault",
  late_notice: "Not reported within 24 hours",
  other: "Other",
};

/** What became of a refund: sent back, or kept as credit against the Tutor's other tuitions. */
export const settlementDispositions = ["none", "refunded", "credited"] as const;
export type SettlementDisposition = (typeof settlementDispositions)[number];

/**
 * The end of the Dhaka day that falls `months` calendar months after `from`.
 * A month a day short - 31 January plus one - ends on its last day.
 */
export function addDhakaMonths(from: Date, months: number): Date {
  const shifted = new Date(from.getTime() + DHAKA_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(shifted.getUTCDate(), lastDay);
  return new Date(Date.UTC(year, month, day + 1) - 1 - DHAKA_OFFSET_MS);
}

/** Where in its life a tuition was when it ended. */
export type SettlementPhase = "unpaid_first_month" | "first_month" | "second_month" | "later";

export type ChargeSettlement = {
  phase: SettlementPhase;
  /** The share of salary given back; zero when the reason earns none or the rates offer none. */
  refundPct: number;
  /** What the Tutor keeps owing for a tuition that ended. */
  retained: number;
  /** Of what is paid, what comes back. */
  refund: number;
  /** Of what is retained, what is still to be paid. */
  due: number;
  /** The full charge the tuition would have cost had it run on. */
  total: number;
};

/**
 * What a Tutor owes, and is owed back, for a confirmed tuition that ended.
 *
 * Inside the first month, with nothing paid yet, the charge is a share of the
 * salary the Tutor actually received - the first instalment's rate - when the
 * Admin has that figure. Otherwise the refund rate for the month it ended in
 * is taken off the total charge, and only for a Guardian's valid reason: what
 * is kept is the total less the refund. What is paid above what is kept comes
 * back; what is short of it is still owed. The Admin can move the result, since
 * it is their decision; this is the figure they start from.
 */
export function chargeSettlement(input: {
  terms: ChargeTerms;
  confirmedAt: Date;
  cancelledAt: Date;
  paid: number;
  reason: CancellationReason;
  receivedSalary?: number | null;
}): ChargeSettlement {
  const { terms, confirmedAt, cancelledAt, paid, reason } = input;
  const total = share(terms.salary, terms.firstPct + terms.secondPct);
  const cancelledMs = cancelledAt.getTime();
  const phaseByDate: SettlementPhase = cancelledMs <= addDhakaMonths(confirmedAt, 1).getTime()
    ? "first_month"
    : cancelledMs <= addDhakaMonths(confirmedAt, 2).getTime() ? "second_month" : "later";

  const received = input.receivedSalary;
  if (phaseByDate === "first_month" && paid === 0 && received != null && received >= 0) {
    const retained = Math.min(total, share(received, terms.firstPct));
    return { phase: "unpaid_first_month", refundPct: 0, retained, refund: 0, due: retained, total };
  }

  const refundPct = reason !== "guardian_valid" ? 0
    : phaseByDate === "first_month" ? terms.refund1Pct
    : phaseByDate === "second_month" ? terms.refund2Pct
    : 0;
  const retained = Math.min(total, share(terms.salary, Math.max(0, terms.firstPct + terms.secondPct - refundPct)));
  return { phase: phaseByDate, refundPct, retained, refund: Math.max(0, paid - retained), due: Math.max(0, retained - paid), total };
}
