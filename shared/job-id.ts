/**
 * The number a job is known by.
 *
 * It is derived from the request's own id rather than stored, which settles
 * three things at once: a Guardian can quote a number the moment they submit,
 * no request can exist without one, and the number the Job Board shows after
 * publication is the same number the Guardian saw while it was still Pending.
 * One job, one id.
 *
 * The offset is what makes the first job read 6800 rather than 1. It is a
 * constant and must stay one: every id shifts if it moves, and these numbers
 * are read out over the phone.
 */
export const JOB_ID_OFFSET = 6799;

export function jobIdForRequest(requestId: number): string {
  if (!Number.isInteger(requestId) || requestId <= 0) {
    throw new Error("Request ID must be a positive integer.");
  }
  return String(JOB_ID_OFFSET + requestId);
}

/** Reads a job id back to the request it belongs to, for lookups by number. */
export function requestIdFromJobId(jobId: string): number | null {
  const digits = jobId.trim();
  if (!/^[0-9]+$/.test(digits)) return null;
  const requestId = Number(digits) - JOB_ID_OFFSET;
  return Number.isInteger(requestId) && requestId > 0 ? requestId : null;
}

/** Whether a string looks like one of these numbers at all. */
export function isJobIdNumber(value: string): boolean {
  return requestIdFromJobId(value) !== null;
}
