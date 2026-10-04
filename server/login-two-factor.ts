import { LOGIN_TWO_FACTOR_COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { createAdminTwoFactorSessionProof, verifyAdminTwoFactorSessionProof } from "./admin-security";
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
