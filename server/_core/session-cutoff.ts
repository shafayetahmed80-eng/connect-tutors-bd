/** Two clocks may disagree by a moment; a cutoff this close to "now" is still believed. */
const CLOCK_SLACK_MS = 60_000;

let warned = false;

/**
 * The account's "everything signed before this is ended" moment, or null when
 * the stored one cannot be right.
 *
 * Every real cutoff is set to "now" when someone presses Sign out everywhere or
 * changes an Admin password, so one that lies in the future is a bad value (a
 * database whose clock is not in UTC once wrote one six hours ahead, and locked
 * every Admin out until it passed). It is ignored rather than obeyed: a sign-in
 * that can never count is a far worse failure than a session that was not ended.
 */
export function usableSessionsValidFrom(cutoff: Date | null | undefined, nowMs = Date.now()): Date | null {
  if (!cutoff) return null;
  if (cutoff.getTime() <= nowMs + CLOCK_SLACK_MS) return cutoff;
  if (!warned) {
    warned = true;
    console.warn(`[Auth] Ignoring a session cutoff in the future (${cutoff.toISOString()}); it was written with the wrong clock.`);
  }
  return null;
}

/** For tests: lets the one-time warning fire again. */
export function resetSessionCutoffWarning() {
  warned = false;
}
