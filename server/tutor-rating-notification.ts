/** What a Tutor is told when a Guardian rates or re-rates them. The comment stays private to the Admin's Ratings view. */
export function tutorRatedNotification(jobId: string, rating: number) {
  return {
    title: `You were rated on ${jobId}`,
    message: `A Guardian gave you ${rating} of 5 stars. Open your profile to see your average.`,
  };
}
