/**
 * When a Tutor is reminded about the platform charge on a Confirmed tuition.
 *
 * Three moments, each worked out from the charge's own dates (`chargeSummary`):
 *  - `window`: the first window, in which paying everything earns the reduced
 *    total, closes in two days or less;
 *  - `second`: the date the rest is due is three days away or less;
 *  - `overdue`: that date has passed and something is still owed, once a week.
 *
 * A reminder is for money still owed that nobody has already reported: a payment
 * the Tutor has submitted and an Admin has not yet verified counts as covering
 * what it covers, so a Tutor who has paid is not nagged for the days it takes to
 * check. Days are Dhaka days, so "two days before" means the same on every run.
 */
import type { ChargeSummary } from "./platform-charge";

export type PaymentReminderKind = "window" | "second" | "overdue";

export type PaymentReminder = {
  kind: PaymentReminderKind;
  /** What the Tutor is asked to pay: the rest of the reduced total, or the whole balance. */
  amount: number;
  /** The date the reminder is about; the overdue reminder has none worth showing. */
  deadline: Date | null;
  /**
   * Tells one reminder from the next for the same tuition: always 0 for the first two
   * kinds, and the number of whole weeks since the due date for an overdue one.
   */
  round: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

/** How many days ahead of the end of the first window, and of the due date, a reminder goes out. */
export const WINDOW_REMINDER_DAYS = 2;
export const SECOND_REMINDER_DAYS = 3;

/** Reminders are not sent in the small hours, however the schedule that calls for them is set. */
export const REMINDER_FIRST_HOUR = 8;
export const REMINDER_LAST_HOUR = 20;

const dhakaDay = (date: Date) => Math.floor((date.getTime() + DHAKA_OFFSET_MS) / DAY_MS);

/** True from 8:00 to 20:59 in Dhaka. */
export function isReminderHour(now: Date): boolean {
  const hour = new Date(now.getTime() + DHAKA_OFFSET_MS).getUTCHours();
  return hour >= REMINDER_FIRST_HOUR && hour <= REMINDER_LAST_HOUR;
}

/** Dhaka days from `now` to the day `date` falls on; negative once that day is over. */
export function dhakaDaysUntil(date: Date, now: Date): number {
  return dhakaDay(date) - dhakaDay(now);
}

/** The reminders a Confirmed tuition calls for right now; usually none, rarely two. */
export function dueReminders(summary: ChargeSummary, waiting: number, now: Date): PaymentReminder[] {
  if (summary.balance <= 0) return [];
  const reminders: PaymentReminder[] = [];

  const windowDays = dhakaDaysUntil(summary.windowEndsAt, now);
  if (summary.early < summary.total && !summary.discounted && windowDays >= 0 && windowDays <= WINDOW_REMINDER_DAYS) {
    const needed = summary.early - summary.paid;
    if (needed > 0 && waiting < needed) reminders.push({ kind: "window", amount: needed - waiting, deadline: summary.windowEndsAt, round: 0 });
  }

  const owed = summary.balance - waiting;
  if (owed > 0) {
    const dueDays = dhakaDaysUntil(summary.secondDueAt, now);
    if (dueDays >= 0 && dueDays <= SECOND_REMINDER_DAYS) {
      reminders.push({ kind: "second", amount: owed, deadline: summary.secondDueAt, round: 0 });
    } else if (dueDays < 0) {
      reminders.push({ kind: "overdue", amount: owed, deadline: null, round: Math.floor((-dueDays - 1) / 7) });
    }
  }
  return reminders;
}

/** The key that makes sure a reminder reaches a Tutor once, however often the daily run is made. */
export function paymentReminderKey(reminder: Pick<PaymentReminder, "kind" | "round">, requestId: number, tutorId: string): string {
  return `payment-reminder:${reminder.kind}:${requestId}:${tutorId}:${reminder.round}`;
}
