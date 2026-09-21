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
