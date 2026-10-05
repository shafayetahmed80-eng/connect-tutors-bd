import { LOGIN_TWO_FACTOR_COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { createAdminTwoFactorSessionProof, verifyAdminTwoFactorSessionProof } from "./admin-security";
import { getTutorGuardianLoginOtpSettings } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";

const DAY_MS = 24 * 60 * 60 * 1000;

/** A proof is signed with the Owner's reset count, so raising the count ends every proof given before it. */
const proofKey = (epoch: number) => `${ENV.cookieSecret}:login-trust:${epoch}`;

export function createLoginTwoFactorProof(userId: number, expiresAtMs: number, epoch = 0) {
  return createAdminTwoFactorSessionProof(userId, proofKey(epoch), expiresAtMs);
}

export function setLoginTwoFactorProofCookie(req: Request, res: Response, userId: number, rememberDays: number, epoch = 0) {
  const maxAgeMs = rememberDays * DAY_MS;
  const proof = createLoginTwoFactorProof(userId, Date.now() + maxAgeMs, epoch);
  const { path, sameSite, secure } = getSessionCookieOptions(req);
  res.cookie(LOGIN_TWO_FACTOR_COOKIE_NAME, proof, { httpOnly: true, path, sameSite, secure, maxAge: maxAgeMs });
}

export function clearLoginTwoFactorProofCookie(req: Request, res: Response) {
  const { path, sameSite, secure } = getSessionCookieOptions(req);
  res.clearCookie(LOGIN_TWO_FACTOR_COOKIE_NAME, { path, sameSite, secure });
}

export function hasLoginTwoFactorProof(req: Request, userId: number, epoch = 0) {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  return verifyAdminTwoFactorSessionProof(cookies[LOGIN_TWO_FACTOR_COOKIE_NAME], userId, proofKey(epoch));
}

/**
 * Whether a Tutor or Guardian may use a route that is not behind tRPC: the
 * Owner's sign-in code is switched off, or this browser has already cleared it.
 */
export async function loginTwoFactorCleared(req: Pick<Request, "headers">, userId: number) {
  const { enabled, epoch } = await getTutorGuardianLoginOtpSettings();
  return !enabled || hasLoginTwoFactorProof(req as Request, userId, epoch);
}
