/**
 * The history of one tuition, as an Admin reads it: the moves on the Job Board
 * (`tutor_request_publication_events`) and everything else done to the request
 * (`tutor_request_operation_events`), in one list, newest first.
 *
 * Both logs are written for their own reasons and neither held the other's
 * entries, so reading only one left a tuition's story half told. Nothing
 * private is in either: a publication event carries a safe snapshot of the
 * job-facing fields, an operation event only the names of what changed.
 */

export type TuitionHistoryEntry = {
  /** `board` for a Job Board move, `request` for anything else done to the tuition. */
  source: "board" | "request";
  action: string;
  at: Date | string;
  /** The Admin or Guardian who did it, when that account still has a name. */
  actorName: string | null;
  /** A Job Board move: the state it left and the state it reached, when they differ. */
  from?: string | null;
  to?: string | null;
  /** The note an Admin gave with a Job Board move. */
  reason?: string | null;
  /** The names of the fields an edit changed. */
  changedFields?: string[];
};

const actionLabels: Record<string, string> = {
  // The Job Board.
  go_live: "Went Live",
  publish: "Published to the Job Board",
  edit: "Details edited",
  verify: "Review started",
  guardian_confirmed: "Guardian call recorded",
  guardian_reconfirmed: "Guardian call recorded again",
  request_changes: "Changes requested",
  approve: "Approved for the Job Board",
  close: "Closed",
  // The request itself.
  guardian_updated: "Edited by the Guardian",
  admin_updated: "Edited by an Admin",
  admin_confirmed: "Confirmed by an Admin",
  admin_cancelled: "Cancelled by an Admin",
  guardian_cancelled: "Cancelled by the Guardian",
  admin_appointed: "Tutor appointed",
  admin_declined_appointment: "Appointment request declined",
  admin_reopened: "Sent back to Live",
  admin_payment_status_changed: "Payment status changed",
  tuition_closed: "Closed - fee paid in full",
};

/** A readable name for an action; an action this build does not know is shown as its own words. */
export function tuitionHistoryActionLabel(action: string): string {
  return actionLabels[action] ?? action.replaceAll("_", " ").replace(/^./, first => first.toUpperCase());
}

/** `budgetAmount` -> "Budget amount". */
export function humanizeFieldName(field: string): string {
  const spaced = field.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replaceAll("_", " ").trim().toLowerCase();
  return spaced.replace(/^./, first => first.toUpperCase());
}

/** The changed-fields column is JSON text written by us; anything else reads as no fields. */
export function parseChangedFields(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((field): field is string => typeof field === "string" && field.length > 0).slice(0, 20) : [];
  } catch {
    return [];
  }
}

/** Both logs as one list, newest first; entries made in the same second keep the order they were given in. */
export function mergeTuitionHistory(...logs: TuitionHistoryEntry[][]): TuitionHistoryEntry[] {
  return logs
    .flat()
    .map((entry, index) => ({ entry, index, time: new Date(entry.at).getTime() }))
    .sort((a, b) => b.time - a.time || a.index - b.index)
    .map(({ entry }) => entry);
}
