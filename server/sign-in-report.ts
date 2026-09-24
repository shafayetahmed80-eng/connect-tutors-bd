/**
 * The Owner's sign-in report: public auth events counted per Bangladesh day,
 * and the sign-in blocks the in-process rate limiters hold right now.
 *
 * Pure functions only - the router supplies the rows and the limiter keys - so
 * the counting and the key parsing can be tested without a database.
 */
import { createHash } from "node:crypto";
import { maskIdentifier } from "./auth-audit";

export type SignInReportRow = { event: string; role: string | null; reason: string | null; createdAt: Date };

export type SignInReportDay = {
  /** `YYYY-MM-DD` in Asia/Dhaka. */
  date: string;
  newGuardians: number;
  newTutors: number;
  signIns: number;
  failed: number;
  /** Right password, other account type - see `AccountRoleMismatch`. */
  wrongCard: number;
  blocked: number;
  /** SMS verification codes sent (Tutor registration and Guardian phone step). */
  codesSent: number;
  codesVerified: number;
  /** Wrong, expired or used-up codes entered. */
  wrongCodes: number;
};

type Counts = Omit<SignInReportDay, "date">;

const emptyCounts = (): Counts => ({ newGuardians: 0, newTutors: 0, signIns: 0, failed: 0, wrongCard: 0, blocked: 0, codesSent: 0, codesVerified: 0, wrongCodes: 0 });

const dhakaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" });

export function dhakaDay(at: Date) {
  return dhakaDate.format(at);
}

/** Which column one event counts in, or null when the report does not show it. */
function columnFor(row: SignInReportRow): keyof Counts | null {
  switch (row.event) {
    case "registration_success": return row.role === "tutor" ? "newTutors" : row.role === "guardian" ? "newGuardians" : null;
    case "login_success": return "signIns";
    case "login_failure": return row.reason === "role-mismatch" ? "wrongCard" : "failed";
    case "login_blocked": return "blocked";
    case "phone_code_sent": return "codesSent";
    case "phone_verified": return "codesVerified";
    case "phone_code_rejected": return "wrongCodes";
    default: return null;
  }
}

/** One row per day for the last `days` days, newest first, zero-filled, plus the totals. */
export function summariseSignInEvents(rows: SignInReportRow[], days: number, now: Date = new Date()) {
  const byDay = new Map<string, Counts>();
  for (let offset = 0; offset < days; offset += 1) {
    byDay.set(dhakaDay(new Date(now.getTime() - offset * 24 * 60 * 60 * 1000)), emptyCounts());
  }
  const totals = emptyCounts();
  for (const row of rows) {
    const column = columnFor(row);
    const day = byDay.get(dhakaDay(row.createdAt));
    if (!column || !day) continue;
    day[column] += 1;
    totals[column] += 1;
  }
  return { days: Array.from(byDay, ([date, counts]) => ({ date, ...counts })), totals };
}

export type SignInBlockKind = "account" | "connection" | "registration";

export type SignInBlock = {
  /** Opaque handle for unlocking; the raw key (with the full identifier) never leaves the server. */
  id: string;
  kind: SignInBlockKind;
  ip: string;
  role: string | null;
  identifierMasked: string | null;
  retryAfterSeconds: number;
};

export function signInBlockId(key: string) {
  return createHash("sha256").update(key).digest("hex").slice(0, 24);
}

/**
 * Reads a limiter key back into something an Owner can recognise. Account keys
 * are `pair:<ip>:<role>:<identifier>`; an IPv6 address carries colons, so the
 * role and identifier are taken from the right.
 */
export function describeSignInBlock(kind: SignInBlockKind, key: string, retryAfterSeconds: number): SignInBlock {
  const id = signInBlockId(key);
  if (kind === "account" && key.startsWith("pair:")) {
    const parts = key.slice("pair:".length).split(":");
    const identifier = parts.pop() ?? "";
    const role = parts.pop() ?? null;
    return { id, kind, ip: parts.join(":"), role, identifierMasked: identifier ? maskIdentifier(identifier) : null, retryAfterSeconds };
  }
  return { id, kind, ip: key.replace(/^(?:ip|reg):/, ""), role: null, identifierMasked: null, retryAfterSeconds };
}
