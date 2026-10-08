import { formatLocation } from "./job-card";
import { formatSalaryAmount } from "./salary-amount";

/**
 * What a Tutor sends to a friend about one tuition on the Job Board.
 *
 * Everything in the message is already on the public board, so sharing a job
 * tells the reader nothing the board would not.
 */
export type JobShareInput = {
  jobId: string;
  title: string;
  tuitionType: string;
  locationLabel: string | null;
  budgetAmount: number | null;
};

/** The link that opens this job's details on the Job Board. */
export function buildJobShareUrl(origin: string, jobId: string): string {
  return `${origin.replace(/\/+$/, "")}/job-board?job=${encodeURIComponent(jobId)}`;
}

/**
 * The message: the headline, where, the salary when there is one, the Job ID,
 * and the link on the last line so a chat app makes it tappable.
 */
export function buildJobShareText(job: JobShareInput, url: string): string {
  const lines = [job.title.trim()];
  const place = job.tuitionType === "online" || job.locationLabel?.trim()
    ? formatLocation({ tuitionType: job.tuitionType, locationLabel: job.locationLabel })
    : null;
  if (place) lines.push(`Location: ${place}`);
  if (job.budgetAmount !== null && Number.isFinite(job.budgetAmount)) lines.push(`Salary: ${formatSalaryAmount(job.budgetAmount)}`);
  lines.push(`Job ID: ${job.jobId}`, url);
  return lines.join("\n");
}
