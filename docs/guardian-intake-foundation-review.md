# Guardian Phone-Intake Foundation Review

## Scope

Reviewed GR-01 private pre-registration phone capture across `drizzle/schema.ts`, migration `0011_yielding_wallop.sql`, `server/guardian-intake.validation.ts`, `server/guardian-intake-handoff.ts`, `server/db.ts`, `server/routers.ts`, and their focused regressions.

## Findings

| Severity | Finding | Result |
|---|---|---|
| Blocking | Data-loss or destructive schema change | None. The migration adds one private table and indexes only. |
| High | Public exposure of phone numbers, intake IDs, token values, or database errors | None. The mutation returns only `{ success: true }`; opaque token material remains httpOnly-cookie/hashed-storage only; persistence failures return Bengali recovery text. |
| High | Untrusted phone input or invalid Bangladesh number canonicalization | None. Input is normalized before persistence, and invalid values return `BAD_REQUEST`. |
| Medium | Duplicate/incomplete submission behaviour | Addressed. Canonical-phone uniqueness with `onDuplicateKeyUpdate` safely supersedes an incomplete handoff. |
| Medium | Handoff forgery or stale handoff reuse | Addressed. The opaque token is random, HMAC-signed, hashed before persistence, and expiry-checked. |
| Low | Expired or completed intake cleanup | Deferred intentionally. GR-02 will consume/complete the handoff; a later retention policy may safely purge completed/expired records. |

## Verification

`pnpm vitest run` passed with **153 tests**. `pnpm check`, `pnpm build`, and `git diff --check` also passed. The build reports an existing JavaScript chunk-size advisory only; it is not a functional or security blocker for this milestone.
