import { createHash, randomBytes } from "node:crypto";
import { ONE_YEAR_MS } from "@shared/const";

export const TUTOR_PORTAL_SESSION_HEADER = "x-connect-tutor-portal-session";
/**
 * How long a Tutor's portal proof stays valid without a renewing request.
 *
 * This was ten minutes, on the reasoning that a proof should be short-lived.
 * In practice a closed laptop or a long break signed the Tutor out while their
 * account cookie was still good for a year - a sign-out nobody had asked for.
 * The two now expire together, so only an explicit sign-out ends a session.
 *
 * What the proof still buys is unchanged: a session cookie taken on its own
 * cannot open the Tutor Dashboard, because the paired token lives in the
 * browser that signed in. The length was never what protected it - an attacker
 * holding the cookie for ten minutes holds it for a year.
 */
export const TUTOR_PORTAL_SESSION_TTL_MS = ONE_YEAR_MS;

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
