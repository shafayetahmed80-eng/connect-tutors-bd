/**
 * In-process sliding-window limiter for the public authentication endpoints
 * (login, registration, guardian phone intake). It is a defence-in-depth
 * measure sized for a single-instance deployment: the counters live in memory,
 * so they reset on restart and are not shared across instances. A durable,
 * queryable store is the follow-up once DB migrations can be run here.
 *
 * Nothing credential-bearing is stored — only opaque keys (an IP, or an
 * IP + account pair) and the timestamps of countable attempts.
 */
export type AuthRateLimitConfig = {
  /** Rolling window over which countable attempts are tallied. */
  windowMs: number;
  /** Attempts allowed within the window before the key is blocked. */
  maxAttempts: number;
  /** How long a block lasts once it is triggered. */
  blockMs: number;
};

export type AuthRateLimitDecision = {
  blocked: boolean;
  /** Whole seconds until the block clears; 0 when not blocked. */
  retryAfterSeconds: number;
};

type Bucket = { attempts: number[]; blockedUntil: number };

function decisionFor(bucket: Bucket, at: number): AuthRateLimitDecision {
  return bucket.blockedUntil > at
    ? { blocked: true, retryAfterSeconds: Math.ceil((bucket.blockedUntil - at) / 1000) }
    : { blocked: false, retryAfterSeconds: 0 };
}

export function createAuthRateLimiter(config: AuthRateLimitConfig, now: () => number = Date.now) {
  const buckets = new Map<string, Bucket>();

  function trim(bucket: Bucket, at: number) {
    bucket.attempts = bucket.attempts.filter(timestamp => timestamp > at - config.windowMs);
  }

  return {
    /** Read the current state for a key — call this before the expensive credential work. */
    check(key: string): AuthRateLimitDecision {
      const at = now();
      const bucket = buckets.get(key);
      return bucket ? decisionFor(bucket, at) : { blocked: false, retryAfterSeconds: 0 };
    },

    /** Tally one countable attempt (a failed login, or any registration try). */
    record(key: string): AuthRateLimitDecision {
      const at = now();
      const bucket = buckets.get(key) ?? { attempts: [], blockedUntil: 0 };
      trim(bucket, at);
      bucket.attempts.push(at);
      if (bucket.attempts.length >= config.maxAttempts) {
        bucket.blockedUntil = at + config.blockMs;
        bucket.attempts = [];
      }
      buckets.set(key, bucket);
      return decisionFor(bucket, at);
    },

    /** Clear a key after a legitimate success so it starts fresh. */
    reset(key: string) {
      buckets.delete(key);
    },

    /** Drop fully-expired buckets so the map cannot grow without bound. Optional; safe to call any time. */
    sweep() {
      const at = now();
      const stale: string[] = [];
      buckets.forEach((bucket, key) => {
        trim(bucket, at);
        if (bucket.attempts.length === 0 && bucket.blockedUntil <= at) stale.push(key);
      });
      for (const key of stale) buckets.delete(key);
    },

    /** Test hook: forget every key. */
    clear() {
      buckets.clear();
    },

    /** Test/introspection hook. */
    size() {
      return buckets.size;
    },
  };
}

export type AuthRateLimiter = ReturnType<typeof createAuthRateLimiter>;
