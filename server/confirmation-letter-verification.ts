import { createHmac, timingSafeEqual } from "node:crypto";
import { confirmationLetterVerifyPath, normalizeLetterVerificationCode } from "@shared/confirmation-letter";
import { ENV } from "./_core/env";

/** 32 symbols with no 0/O or 1/I to misread when someone types a code off paper. */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 10;

/**
 * The secret code printed on a Confirmation Letter and inside its QR link.
 *
 * It is derived from the Letter ID with the server's own secret rather than
 * stored, so every letter - including those issued before codes existed - has
 * one without a database change, and nobody can work one out from a Letter
 * ID. Ten symbols is 50 bits: guessing is hopeless, while the code stays
 * short enough to type.
 */
export function letterVerificationCode(letterNumber: string, secret = ENV.cookieSecret) {
  if (!secret) throw new Error("JWT_SECRET is not set, so letters cannot carry a verification code.");
  const digest = createHmac("sha256", `confirmation-letter:${secret}`).update(letterNumber).digest();
  const bits = Array.from(digest, byte => byte.toString(2).padStart(8, "0")).join("");
  let code = "";
  for (let index = 0; code.length < CODE_LENGTH; index += 5) code += ALPHABET[parseInt(bits.slice(index, index + 5), 2)];
  return code;
}

/** Whether a code someone typed or scanned belongs to this letter; dashes, spaces and case do not matter. */
export function matchesLetterVerificationCode(letterNumber: string, candidate: string, secret = ENV.cookieSecret) {
  const expected = Buffer.from(letterVerificationCode(letterNumber, secret));
  const given = Buffer.from(normalizeLetterVerificationCode(candidate));
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** The full link the letter's QR code carries. */
export function letterVerificationUrl(letterNumber: string, secret = ENV.cookieSecret) {
  return `${ENV.publicSiteUrl}${confirmationLetterVerifyPath(letterNumber, letterVerificationCode(letterNumber, secret))}`;
}
