import type { PaymentReminderKind } from "@shared/payment-reminders";

/**
 * What a Tutor is told about a payment of theirs. The amount is theirs to see;
 * the Admin's own note is not repeated.
 */
const taka = (amount: number) => `${amount.toLocaleString("en-US")} টাকা`;

/** An Admin recorded a payment on the Tutor's behalf, so it counts at once. */
export function paymentRecordedTutorNotification(jobId: string, amount: number) {
  return {
    title: `${jobId}-এর জন্য পেমেন্ট রেকর্ড হয়েছে`,
    message: `আপনার প্ল্যাটফর্ম চার্জের বিপরীতে ${taka(amount)} রেকর্ড করা হয়েছে।`,
  };
}

/** The Admin confirmed the money a Tutor reported. */
export function paymentVerifiedTutorNotification(jobId: string, amount: number) {
  return {
    title: `${jobId}-এর জন্য আপনার পেমেন্ট যাচাই হয়েছে`,
    message: `${taka(amount)} এখন আপনার প্ল্যাটফর্ম চার্জে যোগ হয়েছে।`,
  };
}

/** The Admin could not confirm the money a Tutor reported. */
export function paymentRejectedTutorNotification(jobId: string, amount: number) {
  return {
    title: `${jobId}-এর জন্য আপনার পেমেন্ট গ্রহণ করা হয়নি`,
    message: `${taka(amount)} নিশ্চিত করা যায়নি। ট্রানজেকশন আইডি যাচাই করে আবার জানান।`,
  };
}

/** The last of the fee is in: the tuition has moved to Closed. */
export function tuitionClosedTutorNotification(jobId: string) {
  return {
    title: "পেমেন্ট সম্পূর্ণ",
    message: `Job ID ${jobId}-এর পেমেন্ট সম্পূর্ণ হয়েছে। টিউশনটি এখন Closed।`,
  };
}

const dhakaDate = new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", day: "numeric", month: "long" });

/** A Tutor with money still owed on a Confirmed tuition, reminded before the date or after it (shared/payment-reminders.ts). */
export function paymentReminderTutorNotification(kind: PaymentReminderKind, jobId: string, amount: number, deadline: Date | null) {
  const date = deadline ? dhakaDate.format(deadline) : "";
  if (kind === "window") {
    return {
      title: `${jobId}: কম রেটে চার্জ দেওয়ার সময় শেষ হচ্ছে`,
      message: `কম রেটের শেষ দিন ${date}। ওই দিনের মধ্যে আরও ${taka(amount)} দিলে প্ল্যাটফর্ম চার্জ কম রেটে মিটবে।`,
    };
  }
  if (kind === "second") {
    return {
      title: `${jobId}: চার্জের শেষ তারিখ কাছে`,
      message: `শেষ তারিখ ${date}। ${taka(amount)} মিটিয়ে দিন।`,
    };
  }
  return {
    title: `${jobId}: প্ল্যাটফর্ম চার্জ বাকি আছে`,
    message: `নির্ধারিত তারিখ পেরিয়ে গেছে, এখনো ${taka(amount)} বাকি। দয়া করে মিটিয়ে দিন।`,
  };
}

/** The Admins' one line about a day's reminders; they are told nothing on a day none went out. */
export function paymentReminderAdminSummary(counts: Record<PaymentReminderKind, number>) {
  const total = counts.window + counts.second + counts.overdue;
  const parts = [
    counts.window > 0 ? `${counts.window} reduced-rate window closing` : "",
    counts.second > 0 ? `${counts.second} due date near` : "",
    counts.overdue > 0 ? `${counts.overdue} overdue` : "",
  ].filter(Boolean);
  return {
    title: "Payment reminders sent",
    body: `${total} ${total === 1 ? "reminder" : "reminders"} went to Tutors: ${parts.join(", ")}.`,
  };
}

/**
 * A tuition that was cancelled has been settled: what comes back, what is still
 * due, or that nothing more is. The Admin's grounds are theirs and stay out.
 */
export function tuitionSettledTutorNotification(jobId: string, settlement: { refund: number; due: number; disposition: "none" | "refunded" | "credited" }) {
  let message = "এই টিউশনের জন্য আর কিছু বাকি নেই।";
  if (settlement.refund > 0 && settlement.disposition === "credited") message = `${taka(settlement.refund)} আপনার ক্রেডিটে যোগ করা হয়েছে, অন্য টিউশনে ব্যবহার করতে পারবেন।`;
  else if (settlement.refund > 0) message = `আপনার দেওয়া ${taka(settlement.refund)} ফেরত দেওয়া হচ্ছে।`;
  else if (settlement.due > 0) message = `এই টিউশনের জন্য এখনো ${taka(settlement.due)} বাকি আছে।`;
  return { title: `${jobId} টিউশনের হিসাব মিটমাট হয়েছে`, message };
}
