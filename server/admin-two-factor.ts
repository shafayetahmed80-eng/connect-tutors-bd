import { ADMIN_TWO_FACTOR_COOKIE_NAME, ADMIN_TWO_FACTOR_SESSION_TTL_MS } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { createAdminTwoFactorSessionProof, verifyAdminTwoFactorSessionProof } from "./admin-security";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";

/**
 * Proves, without a database round trip, that this browser passed an Admin's
 * second factor within the last `ADMIN_TWO_FACTOR_SESSION_TTL_MS` (12h) - the
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

export function hasAdminTwoFactorProof(req: Request, userId: number) {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  return verifyAdminTwoFactorSessionProof(cookies[ADMIN_TWO_FACTOR_COOKIE_NAME], userId, ENV.cookieSecret);
}
