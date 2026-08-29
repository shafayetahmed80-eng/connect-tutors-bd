import { createHash, randomBytes } from "node:crypto";

export const TUTOR_PORTAL_SESSION_HEADER = "x-connect-tutor-portal-session";
export const TUTOR_PORTAL_SESSION_TTL_MS = 60_000;

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
