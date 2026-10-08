/**
 * What the Project Owner's phone is told about Admin sign-ins: a correct
 * password from a browser that account has not used before, and a run of wrong
 * passwords for a real Admin account.
 */

const ADMIN_ALERT_URL = "/admin/security";

export function adminNewDevicePush(loginId: string, ip: string) {
  return {
    title: "New Admin sign-in",
    body: `${loginId} signed in from a new device (${ip}). If this was not them, use Sign out everywhere.`,
    url: ADMIN_ALERT_URL,
  };
}

export function adminWrongPasswordPush(loginId: string, ip: string) {
  return {
    title: "Wrong Admin password",
    body: `${loginId} had 5 wrong passwords in a row from ${ip}.`,
    url: ADMIN_ALERT_URL,
  };
}

/**
 * Counts wrong passwords in a row per key. `record` answers true exactly once
 * per window - when the count reaches the threshold - so a long run of guesses
 * is one alert, not hundreds. A correct sign-in clears the run with `reset`.
 * In memory, like the sign-in attempt limits: a restart starts a fresh count.
 */
export function createFailureStreak(config: { threshold: number; windowMs: number }, now: () => number = Date.now) {
  const buckets = new Map<string, { attempts: number[]; alertedUntil: number }>();
  return {
    record(key: string): boolean {
      const at = now();
      const bucket = buckets.get(key) ?? { attempts: [], alertedUntil: 0 };
      bucket.attempts = bucket.attempts.filter(timestamp => timestamp > at - config.windowMs);
      bucket.attempts.push(at);
      buckets.set(key, bucket);
      if (bucket.attempts.length < config.threshold || bucket.alertedUntil > at) return false;
      bucket.alertedUntil = at + config.windowMs;
      return true;
    },
    reset(key: string) {
      buckets.delete(key);
    },
    clear() {
      buckets.clear();
    },
  };
}
