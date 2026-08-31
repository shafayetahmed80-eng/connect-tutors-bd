import { createHash, randomBytes } from "node:crypto";

export const TUTOR_PORTAL_SESSION_HEADER = "x-connect-tutor-portal-session";
/**
 * How long one Tutor Dashboard tab's proof stays valid without a renewing
 * request. The client renews every 20s while the tab is focused, but browsers
 * throttle (and eventually freeze) background timers, and a short laptop sleep
 * pauses them entirely. A 10-minute window lets a briefly-backgrounded tab
 * recover instead of bouncing the Tutor to sign-in mid-session, while still
 * keeping a leaked session cookie useless without a live tab hand-off.
 */
export const TUTOR_PORTAL_SESSION_TTL_MS = 10 * 60_000;

type HeaderValue = string | string[] | undefined;

export function hashTutorPortalToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createTutorPortalToken() {
  return randomBytes(32).toString("base64url");
}

export function getTutorPortalTokenFromHeaders(headers?: Record<string, HeaderValue>) {
  if (!headers) return undefined;
  const value = headers[TUTOR_PORTAL_SESSION_HEADER];
  if (typeof value !== "string") return undefined;
  const token = value.trim();
  if (token.length === 0 || token.length > 512) return undefined;
  return token;
}

export function createTutorPortalExpiry(now = new Date()) {
  return new Date(now.getTime() + TUTOR_PORTAL_SESSION_TTL_MS);
}
