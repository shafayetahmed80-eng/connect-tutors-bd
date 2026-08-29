# Guardian Registration Feedback — Implementation Tickets

**Status:** Approved for implementation planning  
**Scope:** Add the approved password-manager compatibility hint, City/Area selection-complete feedback, and mobile usability validation to the existing Guardian registration journey. No database, API, password policy, consent rule, or Guardian request-flow change is included.

## Guardrails

The existing Guardian registration flow remains canonical. Password-manager feedback is informational only and must never expose password values or weaken server-side validation. Location feedback must reflect the real selected City and Area/Sub-area state, must not auto-submit the request, and must not expose private contact information. Admin authentication and mandatory 2FA are outside this scope.

## GRF-01 — Password-manager compatibility hint

**Purpose:** Help users understand that the password field supports browser and device password managers.

**Likely surfaces:** `client/src/pages/GuardianRequestJourney.tsx`, `client/src/pages/GuardianRequestJourney.account.test.tsx`, shared brand styles only if needed.

**Dependencies:** Existing Guardian password-strength and confirm-password indicators.

**Implementation:** Add a compact, non-blocking helper beneath or beside the password controls using a key/lock affordance. State that users may use a trusted browser or device password manager to generate and save a password. Preserve `autocomplete="new-password"` on account creation and keep password text out of DOM status messages, logs, analytics, and rendered attributes. The helper must not claim that a password was saved or that a particular browser supports a feature.

**Acceptance criteria:** The hint is visible only in the Guardian account step, is concise on 375px screens, is readable in the Connected Sky design, and is keyboard/screen-reader friendly. Password-strength, confirm-match, submit validation, and server contracts remain unchanged.

**Verification:** Add a focused DOM regression for visibility, safe wording, absence of password values, and mobile-safe wrapping. Run `pnpm vitest run client/src/pages/GuardianRequestJourney.account.test.tsx` and `pnpm exec tsc --noEmit`.

## GRF-02 — City/Area selection-complete indicator

**Purpose:** Give Guardian users clear confirmation that their location selection is complete before continuing.

**Likely surfaces:** `client/src/pages/GuardianRequestJourney.tsx`, `client/src/pages/GuardianRequestJourney.account.test.tsx`, existing location data utilities and styles only when required.

**Dependencies:** Existing City and combined Thana/Upazila/Area/Sub-area selectors.

**Implementation:** When both required location values are valid for the selected City, render a compact success summary such as “Location selected” with the selected City and Area/Sub-area. Keep the summary editable through the existing selectors and hide or replace it with a neutral recovery hint when City is cleared or the location is incomplete. Do not duplicate options, change normalization, or modify request payloads.

**Acceptance criteria:** The success state appears only for a valid matching City/location pair, never for an incomplete or stale selection, and updates immediately after selection changes. It is visually distinct but not colour-only, has an accessible status label, does not expose private contact data, and does not interfere with the existing submit guard.

**Verification:** Add deterministic tests for complete, incomplete, cleared, and changed-location states. Run the focused Guardian journey tests and existing location regression tests.

## GRF-03 — Mobile usability verification and refinement

**Purpose:** Ensure both feedback components remain useful and non-obstructive on mobile devices.

**Likely surfaces:** Guardian account-step styles and focused UI tests; no new route or data model.

**Dependencies:** GRF-01 and GRF-02.

**Implementation:** Verify at 375px width that hints wrap without clipping, status text does not push the primary action below an unusable viewport position, touch targets remain at least 44px where interactive, and focus order remains logical. Use responsive CSS rather than viewport-specific hardcoded text or offsets.

**Acceptance criteria:** Desktop and 375px mobile screenshots show no overlap, horizontal scrolling, clipped labels, or invisible text. Reduced-motion preferences remain respected. The full Guardian request flow remains operable with keyboard and touch.

**Verification:** Run focused tests, `pnpm test`, `pnpm exec tsc --noEmit`, and `pnpm build`; review desktop and 375px screenshots plus browser/dev-server logs.

## Delivery order

| Order | Ticket | Outcome |
|---:|---|---|
| 1 | GRF-01 | Safe password-manager guidance |
| 2 | GRF-02 | Truthful City/Area completion confirmation |
| 3 | GRF-03 | Responsive and accessibility release verification |

## Out of scope

OTP or phone verification, password policy changes, password-reset delivery, database migration, API changes, analytics changes, Admin login/2FA, and redesign of the Guardian request stages are not authorized by this ticket package.

## Release gate

Before implementation is marked complete, all focused and full regression tests, TypeScript validation, production build, desktop/mobile visual review, and privacy review must pass. The current project checkpoint remains the recovery point before implementation.

## References

- `client/src/pages/GuardianRequestJourney.tsx`
- `client/src/pages/GuardianRequestJourney.account.test.tsx`
- `docs/guardian-tutor-account-access-spec.md`
- `docs/register-panel-journey-review.md`
- `todo.md`

---

**Author:** Manus AI
