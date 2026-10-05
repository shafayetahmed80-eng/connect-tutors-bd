import { LOGIN_TWO_FACTOR_COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { createAdminTwoFactorSessionProof, verifyAdminTwoFactorSessionProof } from "./admin-security";
import { getTutorGuardianLoginOtpSettings } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";

const DAY_MS = 24 * 60 * 60 * 1000;

export function setLoginTwoFactorProofCookie(req: Request, res: Response, userId: number, rememberDays: number) {
  const maxAgeMs = rememberDays * DAY_MS;
  const proof = createAdminTwoFactorSessionProof(userId, ENV.cookieSecret, Date.now() + maxAgeMs);
  const { path, sameSite, secure } = getSessionCookieOptions(req);
  res.cookie(LOGIN_TWO_FACTOR_COOKIE_NAME, proof, { httpOnly: true, path, sameSite, secure, maxAge: maxAgeMs });
}

export function clearLoginTwoFactorProofCookie(req: Request, res: Response) {
  const { path, sameSite, secure } = getSessionCookieOptions(req);
  res.clearCookie(LOGIN_TWO_FACTOR_COOKIE_NAME, { path, sameSite, secure });
}

export function hasLoginTwoFactorProof(req: Request, userId: number) {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  return verifyAdminTwoFactorSessionProof(cookies[LOGIN_TWO_FACTOR_COOKIE_NAME], userId, ENV.cookieSecret);
}

/**
 * Whether a Tutor or Guardian may use a route that is not behind tRPC: the
 * Owner's sign-in code is switched off, or this browser has already cleared it.
 */
export async function loginTwoFactorCleared(req: Pick<Request, "headers">, userId: number) {
  const { enabled } = await getTutorGuardianLoginOtpSettings();
  return !enabled || hasLoginTwoFactorProof(req as Request, userId);
}
