/**
 * What a Tutor is told about a payment of theirs. The amount is theirs to see;
 * the Admin's own note is not repeated.
 */
const taka = (amount: number) => `${amount.toLocaleString("en-US")} Taka`;

/** An Admin recorded a payment on the Tutor's behalf, so it counts at once. */
export function paymentRecordedTutorNotification(jobId: string, amount: number) {
  return {
    title: `Payment recorded for ${jobId}`,
    message: `${taka(amount)} was recorded against your platform charge.`,
  };
}

/** The Admin confirmed the money a Tutor reported. */
export function paymentVerifiedTutorNotification(jobId: string, amount: number) {
  return {
    title: `Your payment for ${jobId} was verified`,
    message: `${taka(amount)} now counts towards your platform charge.`,
  };
}

/** The Admin could not confirm the money a Tutor reported. */
export function paymentRejectedTutorNotification(jobId: string, amount: number) {
  return {
    title: `Your payment for ${jobId} was not accepted`,
    message: `We could not confirm ${taka(amount)}. Check the transaction ID and report it again.`,
  };
}

/**
 * A tuition that was cancelled has been settled: what comes back, what is still
 * due, or that nothing more is. The Admin's grounds are theirs and stay out.
 */
export function tuitionSettledTutorNotification(jobId: string, settlement: { refund: number; due: number; disposition: "none" | "refunded" | "credited" }) {
  let message = "Nothing more is due for this tuition.";
  if (settlement.refund > 0 && settlement.disposition === "credited") message = `${taka(settlement.refund)} was added to your credit, to use on your other tuitions.`;
  else if (settlement.refund > 0) message = `${taka(settlement.refund)} of what you paid is being returned to you.`;
  else if (settlement.due > 0) message = `${taka(settlement.due)} is still due for this tuition.`;
  return { title: `Tuition ${jobId} has been settled`, message };
}
