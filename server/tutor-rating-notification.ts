/** What a Tutor is told when a Guardian rates or re-rates them. The comment stays private to the Admin's Ratings view. */
export function tutorRatedNotification(jobId: string, rating: number) {
  return {
    title: `${jobId}-এ আপনাকে রেটিং দেওয়া হয়েছে`,
    message: `একজন গার্ডিয়ান আপনাকে ৫-এ ${rating} তারা দিয়েছেন। আপনার গড় দেখতে প্রোফাইল খুলুন।`,
  };
}
