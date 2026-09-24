/**
 * The rules for the 4-digit SMS codes that prove a person holds a mobile
 * number (Tutor registration, Guardian phone step).
 *
 * A 4-digit code is only 10,000 guesses, so the limits carry the security:
 * 5 wrong tries spend a code, a new code needs 60 seconds, a number gets at
 * most 5 codes an hour, and a code lives 5 minutes. Only an HMAC of the code -
 * bound to the number and the purpose - is stored.
 */
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { PhoneVerificationPurpose } from "../drizzle/schema";

export const PHONE_CODE_TTL_MS = 5 * 60 * 1000;
export const PHONE_CODE_RESEND_MS = 60 * 1000;
export const PHONE_CODE_MAX_ATTEMPTS = 5;
export const PHONE_CODES_PER_HOUR = 5;
export const PHONE_CODE_PATTERN = /^\d{4}$/;

export function generatePhoneCode() {
  return randomInt(0, 10_000).toString().padStart(4, "0");
}

export function hashPhoneCode(code: string, phone: string, purpose: PhoneVerificationPurpose, secret: string) {
  return createHmac("sha256", secret).update(`${purpose}:${phone}:${code}`).digest("hex");
}

export function phoneCodeHashesMatch(stored: string, candidate: string) {
  const a = Buffer.from(stored, "hex");
  const b = Buffer.from(candidate, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** BulkSMSBD's required OTP wording: "Your {Brand} OTP is XXXX". */
export function phoneCodeMessage(code: string) {
  return `Your Connect Tutors OTP is ${code}`;
}

export type PhoneCodeCheck =
  | { status: "ok"; id: number }
  | { status: "missing" | "expired" | "locked" }
  | { status: "wrong"; attemptsLeft: number };

export type PhoneCodeLanguage = "en" | "bn";

const messages = {
  en: {
    missing: "Send a code to your mobile number first.",
    expired: "This code has expired. Send a new code.",
    locked: "Too many wrong codes. Send a new code.",
    wrong: (left: number) => `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.`,
    wait: (seconds: number) => `Wait ${seconds} seconds before asking for a new code.`,
    hourly: "Too many codes for this number. Try again in an hour.",
    notSent: "The code could not be sent right now. Please try again in a few minutes.",
  },
  bn: {
    missing: "আগে আপনার মোবাইলে কোড পাঠান।",
    expired: "কোডটির মেয়াদ শেষ। নতুন কোড পাঠান।",
    locked: "অনেকবার ভুল কোড দেওয়া হয়েছে। নতুন কোড পাঠান।",
    wrong: (left: number) => `কোডটি সঠিক নয়। আর ${left} বার চেষ্টা করা যাবে।`,
    wait: (seconds: number) => `নতুন কোড চাইতে ${seconds} সেকেন্ড অপেক্ষা করুন।`,
    hourly: "এই নম্বরে অনেকগুলো কোড পাঠানো হয়েছে। এক ঘণ্টা পর আবার চেষ্টা করুন।",
    notSent: "এই মুহূর্তে কোড পাঠানো যাচ্ছে না। কয়েক মিনিট পর আবার চেষ্টা করুন।",
  },
} as const;

export function phoneCodeCheckMessage(check: Exclude<PhoneCodeCheck, { status: "ok" }>, language: PhoneCodeLanguage) {
  const text = messages[language];
  return check.status === "wrong" ? text.wrong(check.attemptsLeft) : text[check.status];
}

export function phoneCodeSendMessage(kind: "hourly" | "notSent", language: PhoneCodeLanguage): string;
export function phoneCodeSendMessage(kind: "wait", language: PhoneCodeLanguage, seconds: number): string;
export function phoneCodeSendMessage(kind: "wait" | "hourly" | "notSent", language: PhoneCodeLanguage, seconds = 0) {
  const text = messages[language];
  return kind === "wait" ? text.wait(seconds) : text[kind];
}

/**
 * Carried as a TRPCError cause so the error formatter reports it as a
 * `phoneCode` field error - the form puts the message under the code box.
 */
export class PhoneCodeFieldError extends Error {
  readonly issues: Array<{ path: string[]; message: string }>;
  constructor(message: string) {
    super(message);
    this.issues = [{ path: ["phoneCode"], message }];
  }
}
