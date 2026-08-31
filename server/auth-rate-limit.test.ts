import { describe, expect, it } from "vitest";
import { createAuthRateLimiter } from "./auth-rate-limit";

function clock(start = 0) {
  const state = { t: start };
  return {
    now: () => state.t,
    advance: (ms: number) => { state.t += ms; },
  };
}

describe("createAuthRateLimiter", () => {
  it("allows attempts up to the limit, then blocks for the configured duration", () => {
    const time = clock();
    const limiter = createAuthRateLimiter({ windowMs: 10_000, maxAttempts: 3, blockMs: 5_000 }, time.now);

    expect(limiter.check("k").blocked).toBe(false);
    expect(limiter.record("k").blocked).toBe(false); // 1
    expect(limiter.record("k").blocked).toBe(false); // 2
    const tripped = limiter.record("k"); // 3 -> block
    expect(tripped.blocked).toBe(true);
    expect(tripped.retryAfterSeconds).toBe(5);
    expect(limiter.check("k").blocked).toBe(true);
  });

  it("clears the block once blockMs has elapsed", () => {
    const time = clock();
    const limiter = createAuthRateLimiter({ windowMs: 10_000, maxAttempts: 2, blockMs: 5_000 }, time.now);
    limiter.record("k");
    limiter.record("k");
    expect(limiter.check("k").blocked).toBe(true);

    time.advance(4_999);
    expect(limiter.check("k").blocked).toBe(true);
    time.advance(2);
    expect(limiter.check("k").blocked).toBe(false);
  });

  it("only counts attempts inside the rolling window", () => {
    const time = clock();
    const limiter = createAuthRateLimiter({ windowMs: 10_000, maxAttempts: 3, blockMs: 5_000 }, time.now);
    limiter.record("k"); // t=0
    time.advance(6_000);
    limiter.record("k"); // t=6000
    time.advance(6_000); // t=12000 — the first attempt (t=0) is now outside the 10s window
    expect(limiter.record("k").blocked).toBe(false); // only 2 in-window attempts
    expect(limiter.record("k").blocked).toBe(true); // now 3 in-window -> block
  });

  it("isolates keys from one another", () => {
    const time = clock();
    const limiter = createAuthRateLimiter({ windowMs: 10_000, maxAttempts: 2, blockMs: 5_000 }, time.now);
    limiter.record("a");
    limiter.record("a");
    expect(limiter.check("a").blocked).toBe(true);
    expect(limiter.check("b").blocked).toBe(false);
  });

  it("reset() forgives a key after a legitimate success", () => {
    const time = clock();
    const limiter = createAuthRateLimiter({ windowMs: 10_000, maxAttempts: 3, blockMs: 5_000 }, time.now);
    limiter.record("k");
    limiter.record("k");
    limiter.reset("k");
    expect(limiter.record("k").blocked).toBe(false); // counter started over
    expect(limiter.record("k").blocked).toBe(false);
  });

  it("sweep() releases fully-expired buckets without disturbing live ones", () => {
    const time = clock();
    const limiter = createAuthRateLimiter({ windowMs: 10_000, maxAttempts: 5, blockMs: 5_000 }, time.now);
    limiter.record("old");
    time.advance(20_000);
    limiter.record("fresh");
    limiter.sweep();
    expect(limiter.size()).toBe(1);
  });
});
