# Rollback to `fe06f04b` — Database Impact Assessment

**Assessment date:** 21 August 2026  
**Current active checkpoint:** `c25432e8`  
**Target checkpoint:** `fe06f04b`  
**Scope:** Database and persisted-data impact only. This document does not perform a rollback.

## Short answer

Rolling the project code back to `fe06f04b` would **not automatically roll the database back**. The database would retain all migrations that were applied after that checkpoint. In this project, the only post-`fe06f04b` database migration is `0023_old_cable.sql`, which adds the Guardian profile-photo tables, their indexes, and foreign keys. The currently active Open Requests dashboard refinement has no database migration. [1] [2]

At the time of this assessment, both post-`fe06f04b` Guardian photo tables exist but contain **zero records**. Therefore, the rollback would not currently strand any persisted Guardian photo or photo-audit rows. The tables would remain empty, unused database objects until a later forward release uses them again or a separately approved destructive cleanup removes them. [3]

> **Important:** A code rollback returns application files and configuration to an older checkpoint. It does not delete rows, drop tables, reverse foreign keys, or remove uploaded objects from storage.

## What existed at `fe06f04b`

Checkpoint `fe06f04b` includes the Guardian core release. Its data foundation already includes the opaque Guardian ID and Guardian profile-update audit event model from migrations `0021_stormy_network.sql` and `0022_normal_iron_lad.sql`. Those database structures remain compatible with the target checkpoint and therefore are not rollback concerns. [4]

| Data area | Present at `fe06f04b` | Effect after code rollback |
|---|---:|---|
| Guardian opaque ID | Yes | Continues to work normally. |
| Guardian profile-update audit events | Yes | Continues to work normally. |
| Tutor jobs and Tutor interests | Yes | Continues to work normally. |
| Guardian request lifecycle/publication records | Yes | Continues to work normally. |
| Guardian photo reference and photo-moderation audit | No | Database objects remain, but target code does not use them. |
| Open Requests mini-list UI | No | Removed from the Guardian Dashboard; no data is deleted. |

## Post-target database change

Migration `0023_old_cable.sql` creates two tables. It does not alter or delete existing Guardian, Tutor, Job Board, request, user, or Admin-security tables. [1]

| Database object | Purpose in current release | State after rollback to `fe06f04b` |
|---|---|---|
| `guardian_profile_photos` | Stores one private photo reference per Guardian, status, moderation result, reviewer, and timestamps. | Remains in the database but is no longer read or written by the older code. |
| `guardian_profile_photo_events` | Stores privacy-minimised submitted/replaced/removed/approved/rejected events. | Remains in the database but is no longer read or written by the older code. |
| Photo-table indexes and foreign keys | Protect ownership uniqueness and improve status/audit queries. | Remain attached to the unused tables. |
| Guardian photo storage objects | Private image objects referenced by current photo records. | Any object that exists is not automatically removed by rollback. |

The migration is additive: it uses `CREATE TABLE`, `ALTER TABLE … ADD CONSTRAINT`, and `CREATE INDEX`; it contains no `DROP`, `DELETE`, `TRUNCATE`, or modification to pre-existing business tables. [1]

## Verified current data position

A safe count-only database query was performed before this assessment. It found zero rows in both tables.

| Table | Current row count | Immediate rollback consequence |
|---|---:|---|
| `guardian_profile_photos` | 0 | No Guardian photo reference will be left unread by the old code. |
| `guardian_profile_photo_events` | 0 | No photo moderation audit event will be left unused by the old code. |

This result describes the database at the assessment time. If a Guardian uploads a photo before a later rollback, repeat this count and decide whether the photo data should remain preserved for a possible forward restoration.

## Feature impact distinct from database impact

| Current capability | Database change required? | What happens after rollback |
|---|---:|---|
| Guardian photo upload and approval queue | Yes, migration `0023` | The feature disappears from code/UI. Empty tables remain. If data exists later, it remains private but inaccessible through the target UI. |
| Open Requests mini-list and single status action | No | The current Dashboard refinement disappears from code/UI. Guardian request records themselves remain untouched. |
| Admin 2FA / Guardian core / Job Board / Tutor interest | No post-target schema dependency identified | Retains the behavior included in `fe06f04b`. |
| Admin/Moderator security-review documents | No | Documentation changes are reverted with the code checkpoint; database is unaffected. |

## Main risks

The rollback produces a **database-ahead-of-code** situation: the database knows about `0023`, while the target code’s Drizzle schema does not. This is generally safe here because the migration is additive and the old code does not attempt to drop or reinterpret those tables. It becomes risky only if someone manually drops the tables, runs an improvised rollback SQL script, or assumes older code has deleted photo data.

The more important product risk is feature availability. After rollback, Guardian photo upload/review and the Dashboard Open Requests mini-list will no longer be available. This can confuse Guardians and Admins who saw the newer interface, even though their core request and account data remains unaffected.

## Recommended safe rollback procedure

First, retain the current checkpoint `c25432e8` as the forward-recovery point. It is already available in version history, so this step is satisfied. Do not overwrite it or manually edit database migration metadata.

Second, immediately before rollback, repeat the count-only check on the two Guardian photo tables. If either count is non-zero, record the result and decide whether the photo data must be available again soon. No deletion is required merely to roll code back.

Third, use the project version-history control to select `fe06f04b` and perform the rollback. Do **not** run manually written `DROP TABLE` queries, do not remove the `0023` migration record, and do not run a reverse migration as part of this rollback.

Fourth, verify the restored application’s high-priority flows: Guardian sign-in, Guardian Profile, password change, Hire a Tutor, Posted Jobs, Tutor Job Board, Admin TOTP challenge, and Admin request review. The Guardian photo section and Open Requests mini-list should be absent because they did not exist in the target checkpoint; that is expected behavior.

Finally, if the rollback is temporary, return to `c25432e8` when ready. Because `0023` remains applied, restoring the newer code should reuse the existing empty photo tables without a destructive database operation. If the photo feature is permanently discontinued, decide on a retention period and approve a separate, reviewed, destructive cleanup migration only after any needed backup/export.

## Recommendation

Given the verified **zero-row** state of the Guardian photo tables, rolling back to `fe06f04b` has **low immediate database-data risk**. The primary impact is functional: the Guardian photo moderation feature and Open Requests dashboard refinement will be removed. Keep the empty `0023` tables in place during any temporary rollback; they do not harm the target checkpoint and they preserve a clean route to restoring the newer release later.

## References

[1]: ../drizzle/0023_old_cable.sql "Guardian profile-photo additive migration"

[2]: ../docs/guardian-dashboard-parity-grill-review.md "Open Requests refinement is a UI/data-consumption enhancement"

[3]: Database count-only query executed 21 August 2026: `guardian_profile_photos = 0`, `guardian_profile_photo_events = 0`.

[4]: ../drizzle/0021_stormy_network.sql and ../drizzle/0022_normal_iron_lad.sql "Guardian core database foundations included in fe06f04b"
