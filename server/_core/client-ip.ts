/**
 * The address of the person on the other end of a request.
 *
 * Behind the host's web server the socket only shows the web server itself, so
 * the real address arrives in `X-Forwarded-For`. That header is a list: the
 * visitor can write anything into it, and each server on the way appends the
 * address it saw to the END. Only the entries our own servers appended can be
 * trusted, so the address is read from the right, skipping `trustedProxyHops`
 * entries that belong to servers we run, and everything to its left is ignored.
 * Reading the first entry instead lets anyone pick a new "address" per try and
 * walk straight past the sign-in attempt limits.
 *
 * `trustedProxyHops` is how many servers of ours sit in front of the app (1 for
 * the host's web server alone; 2 when a service such as Cloudflare sits in
 * front of that). 0 ignores the header and uses the socket address.
 */
export function resolveClientIp(input: {
  forwardedFor: string | string[] | undefined;
  socketIp: string | undefined;
  trustedProxyHops: number;
}): string {
  const fallback = input.socketIp || "unknown";
  if (input.trustedProxyHops <= 0) return fallback;
  const header = Array.isArray(input.forwardedFor) ? input.forwardedFor.join(",") : input.forwardedFor;
  const entries = (header ?? "").split(",").map(entry => entry.trim()).filter(Boolean);
  // Fewer entries than servers of ours means a server did not add its entry; do not guess.
  if (entries.length < input.trustedProxyHops) return fallback;
  const candidate = entries[entries.length - input.trustedProxyHops] ?? "";
  // The address ends up in logs and in a phone alert, so only something shaped like an address passes.
  return LOOKS_LIKE_AN_ADDRESS.test(candidate) ? candidate : fallback;
}

const LOOKS_LIKE_AN_ADDRESS = /^[0-9a-fA-F:.]{2,45}$/;
