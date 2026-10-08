import { ADMIN_KNOWN_DEVICE_COOKIE_NAME, ADMIN_KNOWN_DEVICE_TTL_MS, ADMIN_TWO_FACTOR_COOKIE_NAME, ADMIN_TWO_FACTOR_SESSION_TTL_MS } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { createAdminKnownDeviceToken, createAdminTwoFactorSessionProof, verifyAdminKnownDeviceToken, verifyAdminTwoFactorSessionProof } from "./admin-security";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";

/**
 * Proves, without a database round trip, that this browser passed an Admin's
 * second factor within the last `ADMIN_TWO_FACTOR_SESSION_TTL_MS` (30 days) - the
 * same window `admin-security.ts`'s HMAC proof is built to carry. Sits beside
 * the ordinary `app_session_id` cookie rather than inside it, so a signed-in
 * Admin who has not cleared this second factor still reads as signed in (the
 * password was right) while every `adminProcedure` call still refuses them
 * until they do.
 */
export function setAdminTwoFactorProofCookie(req: Request, res: Response, userId: number) {
  const expiresAtMs = Date.now() + ADMIN_TWO_FACTOR_SESSION_TTL_MS;
  const proof = createAdminTwoFactorSessionProof(userId, ENV.cookieSecret, expiresAtMs);
  const { path, sameSite, secure } = getSessionCookieOptions(req);
  res.cookie(ADMIN_TWO_FACTOR_COOKIE_NAME, proof, { httpOnly: true, path, sameSite, secure, maxAge: ADMIN_TWO_FACTOR_SESSION_TTL_MS });
}

export function clearAdminTwoFactorProofCookie(req: Request, res: Response) {
  const { path, sameSite, secure } = getSessionCookieOptions(req);
  res.clearCookie(ADMIN_TWO_FACTOR_COOKIE_NAME, { path, sameSite, secure });
}

/**
 * `sessionsValidFrom` is the account's "everything before this is signed out"
 * moment: a proof earned before it no longer counts, so a lost laptop that
 * remembered the second factor is not trusted after "Sign out everywhere".
 */
export function hasAdminTwoFactorProof(req: Request, userId: number, sessionsValidFrom?: Date | null) {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const proof = cookies[ADMIN_TWO_FACTOR_COOKIE_NAME];
  if (!verifyAdminTwoFactorSessionProof(proof, userId, ENV.cookieSecret)) return false;
  if (!sessionsValidFrom) return true;
  const expiresAtMs = Number(proof?.split(".")[1]);
  return expiresAtMs - ADMIN_TWO_FACTOR_SESSION_TTL_MS >= Math.floor(sessionsValidFrom.getTime() / 1000) * 1000;
}

/** Remembers this browser as one the Admin has signed in from, so the next sign-in here is not a "new device". */
export function markAdminDeviceKnown(req: Request, res: Response, userId: number) {
  const token = createAdminKnownDeviceToken(userId, ENV.cookieSecret, Date.now() + ADMIN_KNOWN_DEVICE_TTL_MS);
  const { path, sameSite, secure } = getSessionCookieOptions(req);
  res.cookie(ADMIN_KNOWN_DEVICE_COOKIE_NAME, token, { httpOnly: true, path, sameSite, secure, maxAge: ADMIN_KNOWN_DEVICE_TTL_MS });
}

export function isKnownAdminDevice(req: Request, userId: number) {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  return verifyAdminKnownDeviceToken(cookies[ADMIN_KNOWN_DEVICE_COOKIE_NAME], userId, ENV.cookieSecret);
}
