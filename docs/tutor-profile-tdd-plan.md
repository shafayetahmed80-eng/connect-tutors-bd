# Connecttutorsbd.com — Tutor Profile Test-First Development Plan

**Status:** Ready for implementation  
**Source tickets:** `docs/tutor-profile-implementation-tickets.md`  
**Testing stack:** Vitest for pure domain rules and tRPC contracts; browser checks only after the corresponding UI ticket is implemented.

> The first executable test intentionally fails before production code is written. This is the required red state for TP-01; implementation must make it pass without weakening the expected behaviour.

## Test Strategy

Tests are grouped around observable business outcomes rather than internal implementation details. Pure mapping and validation rules receive table-driven unit coverage. Registration, authorization, privacy, and status transitions receive router- or database-boundary tests. Components are tested for keyboard-reachable state changes, while responsive layouts are validated after their implementation through desktop and 375 px browser checks.

| Ticket | Test-first boundary    | Required behaviours                                                                                                                                                                        | Test type                                    |
| ------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| TP-01  | Registration defaults  | Registration maps Name, Gender, Phone, Email, and City/Area to one private `draft` Profile record; passwords are excluded; duplicate/failed registration cannot produce an orphan profile. | Pure helper, router, transaction integration |
| TP-02  | Normalized persistence | Academic hierarchy parent-child relationships, unique Tutor selections, historical-record compatibility, and FK/constraint behaviour are preserved.                                        | Schema/database integration                  |
| TP-03  | Catalog query contract | Active-only search, 50-result cap, case-normalized query, and university/faculty/degree parent-child filtering hold.                                                                       | Query helper and router                      |
| TP-04  | Profile domain rules   | Partial drafts save; submitted Profile requires A–F; selection invariants, field limits, system-field rejection, and 27-unit completion calculation hold.                                  | Pure helper and Zod                          |
| TP-05  | Owner API contract     | Tutors access only their Profile; Guardian/public/inactive access is rejected; save is atomic; a valid submit becomes `pending`.                                                           | tRPC/router                                  |
| TP-06  | Photo boundary         | Auth, MIME/signature, 5 MB, dimensions, generated storage key, and no binary DB persistence are enforced.                                                                                  | Endpoint/storage adapter                     |
| TP-07  | Sections A–C form      | Server defaults win over browser drafts; dependent academic selectors reset and are keyboard usable; read-only identity fields cannot be edited.                                           | Component and browser                        |
| TP-08  | Sections D–G form      | Multi-select duplicate/conflict handling, draft-save pending state, field error display, and valid submission flow work.                                                                   | Component, mutation, browser                 |
| TP-09  | Section H state        | Server-derived completion, date, status, account state, and zero assigned-count render read-only; crafted mutations cannot edit them.                                                      | DTO, router, component                       |
| TP-10  | Release regression     | Existing password login, public directory privacy, migration safety, mobile accessibility, type-check, build, and full test suite remain healthy.                                          | Full suite and browser                       |

## TP-01 Red Tests

The initial test file, `server/tutor-profile.registration-defaults.tdd.test.ts`, sets the smallest contract required before production work begins. It expects a pure `createTutorProfileDefaults` helper in `server/db.ts`. The helper does not exist yet, so the test must fail until TP-01 implementation creates it and connects it to the registration transaction.

| Case                   | Given                                                                    | Expected result                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Canonical mapping      | A successful registration payload with whitespace in the name and email. | A `draft` profile-default record has trimmed Name/Email, private contact email, Gender, normalized Phone, and selected location ID. |
| Password isolation     | A registration input includes Password and Confirm Password.             | No resulting default object contains either key or any plaintext password value.                                                    |
| Explicit initial state | A valid registration input.                                              | The derived state is exactly `draft`; it is not silently `pending` or `approved`.                                                   |

## Red–Green–Refactor Workflow Per Ticket

| Stage          | Required action                                                                                     | Gate                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Red**        | Add the narrowest failing test for the Ticket acceptance criterion and execute only that test file. | Failure must demonstrate the absent behaviour rather than a broken test harness. |
| **Green**      | Implement the smallest production change that makes the focused test pass.                          | The focused test passes without relaxing assertions.                             |
| **Refactor**   | Remove duplication, improve types/names, and retain behaviour.                                      | Focused test and relevant existing tests still pass.                             |
| **Regression** | Run `pnpm test`, `pnpm check`, and the appropriate browser/build checks.                            | Any unrelated regression blocks the next ticket.                                 |

## Test Data and Privacy Rules

Test fixtures use synthetic names, emails, and phone numbers only. Tests must never create fabricated customer reviews, ratings, testimonials, or production Tutor records. Public DTO assertions explicitly confirm that phone, contact email, date of birth, account status, exact request counts, and raw owner Profile values do not appear in public directory responses.

## Implementation Handoff

TP-01 begins next. Its implementation may add the pure default mapper, persistent draft Profile creation within the registration transaction, and focused database/router tests only. It must not begin catalog, full Profile form, matching, notifications, or verification-document scope.
