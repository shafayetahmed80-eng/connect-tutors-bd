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
