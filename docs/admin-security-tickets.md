# Admin Security and Access Management — Approved Implementation Tickets

## Approved policies

| Topic | Decision |
|---|---|
| Administrative authority | Only the configured Project Owner manages Admin access and security records. |
| Invitation delivery | The Owner creates a single-use, expiry-bound link and shares it manually. No external email provider is introduced. |
| Second factor | TOTP through an authenticator application, with one-time recovery codes. |
| Enforcement | Every Admin must complete 2FA before accessing protected Admin operations. Only the Owner can reset a lost factor. |

## Security invariants

- Admin invitation tokens are stored only as one-way hashes, are single-use, and expire after a bounded period.
- The Owner cannot lose Owner authority or downgrade their own role through the management UI.
- Audit entries never contain plaintext invitation tokens, TOTP secrets, recovery codes, passwords, or raw session cookies.
- TOTP secrets are encrypted at rest using a server-only key; recovery codes are stored only as salted hashes.
- A successful second-factor verification issues a short-lived, signed, `httpOnly`, secure cookie tied to the current Admin identity.
- Admin procedures that expose matching data, role controls, audit records, or security actions require a verified second factor. Enrollment, verification, and Owner recovery endpoints are intentionally scoped exceptions.

## Implementation tickets

### AS-01 — Security schema and cryptographic primitives

Add non-destructive persistence for Admin invitations, Admin audit events, encrypted TOTP enrollment data, hashed recovery codes, and short-lived verification state. Add server-only encryption and hashing helpers with deterministic unit tests. Generate and review a migration before applying it.

**Acceptance criteria:** no secret value is returned from a database mapper; old accounts remain compatible; invalid/missing crypto configuration fails closed.

### AS-02 — Owner-only invitation and role-management procedures

Add Owner-guarded list, create, revoke, accept, and role-management procedures. Invitations bind to a normalized email, expire after seven days, and cannot be accepted twice. The Owner retains immutable authority, and audit events are written for all sensitive changes.

**Acceptance criteria:** non-Owner accounts receive `FORBIDDEN`; expired/revoked/mismatched invitations cannot activate Admin access; response payloads omit raw tokens.

### AS-03 — Admin login audit trail

Write privacy-minimized events for Admin access outcomes and security actions. Add Owner-only, paginated audit-log reads with event/type/date filtering.

**Acceptance criteria:** audit reads are Owner-only; returned data excludes secrets; pagination is deterministic; failed access never prevents a safe user-facing error response.

### AS-04 — TOTP enrollment, verification, and recovery

Add Admin enrollment, one-time recovery-code acknowledgement, 2FA challenge verification, factor reset by Owner, and short-lived verified-session marker. Require valid TOTP or a recovery code before completing verification.

**Acceptance criteria:** users cannot access verified Admin procedures without the marker; replayed recovery codes fail; the raw recovery-code set is returned exactly once during enrollment.

### AS-05 — Owner security workspace and Admin 2FA screens

Create an Owner-only security workspace for invitations, active Admin accounts, revocation/reset actions, and audit logs. Create focused Admin enrollment and verification screens with accessible errors and no secret logging. Route protected Admin entry through the 2FA challenge when required.

**Acceptance criteria:** Admin navigation stays hidden from non-Admins; Owner controls remain hidden from regular Admins; desktop and mobile layouts keep controls reachable and readable.

### AS-06 — Release verification

Add focused authorization, expiry, token-hash, TOTP, recovery, audit-privacy, and UI regressions. Run the complete suite, TypeScript, production build, code review, and responsive checks before release.
