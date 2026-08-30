/**
 * Structured, single-line audit records for the public authentication endpoints.
 * They are written to stdout for a log pipeline to collect. Nothing
 * credential-bearing (passwords, session tokens, cookies) is ever included, and
 * the identifier is masked so an email or phone is never logged in full.
 *
 * A durable, Owner-queryable table is the follow-up once DB migrations can run
 * here — mirror `db.logAdminAuditEvent` when that lands.
 */
export type AuthAuditEvent =
  | "login_success"
  | "login_failure"
  | "login_blocked"
  | "login_account_suspended"
  | "login_account_closed"
  | "registration_success"
  | "registration_rejected"
  | "registration_blocked"
  | "phone_intake"
  | "phone_intake_blocked";

export type AuthAuditFields = {
  role?: "tutor" | "guardian" | "admin";
  ip?: string;
  identifier?: string;
  reason?: string;
};

export type AuthAuditSink = (line: string) => void;

const defaultSink: AuthAuditSink = line => {
  console.info(line);
};

/** Keeps enough of an email or phone to correlate incidents without logging it whole. */
export function maskIdentifier(identifier: string): string {
  const value = identifier.trim();
  if (!value) return "";
  const atIndex = value.indexOf("@");
  if (atIndex > 0) {
    const local = value.slice(0, atIndex);
    const domain = value.slice(atIndex);
    const shown = local.slice(0, Math.min(2, local.length));
    return `${shown}${"*".repeat(Math.max(1, local.length - shown.length))}${domain}`;
  }
  if (value.length <= 3) return "*".repeat(value.length);
  return `${"*".repeat(value.length - 3)}${value.slice(-3)}`;
}

export function recordAuthAudit(event: AuthAuditEvent, fields: AuthAuditFields = {}, sink: AuthAuditSink = defaultSink) {
  const payload: Record<string, string> = { ts: new Date().toISOString(), scope: "auth", event };
  if (fields.role) payload.role = fields.role;
  if (fields.ip) payload.ip = fields.ip;
  if (fields.identifier && fields.identifier.trim()) payload.identifier = maskIdentifier(fields.identifier);
  if (fields.reason) payload.reason = fields.reason;
  sink(`[auth-audit] ${JSON.stringify(payload)}`);
}
