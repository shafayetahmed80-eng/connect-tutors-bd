# Tutor Request and Tutor Registration UI/UX Tickets

## Approved product decisions

| Area | Approved direction |
| --- | --- |
| Tutor Registration | Replace the one-card form with a **two-step guided journey**: Account details, then Location and consent. Keep all existing fields, validation, password rules, consent, Bangladesh phone formatting, and dashboard handoff. |
| Tutor Request | Retain the existing phone → account → request process and its three request steps. Add a cohesive guided-progress system, English-first labels and helper text, clearer information grouping, field-level recovery feedback, and a confident review state. |
| Visual language | Use Connected Sky blue as the dominant brand colour, restrained saffron accents for progress and emphasis, plus capsule guidance chips, trust cues, and a subtle guided-path motif. Do not introduce stock photography or media dependencies in this release. |
| Language | Make all user-facing copy within both journeys **English-first**. Keep Bangladesh-specific terms such as Thana, Upazila, and BDT where they provide necessary local clarity. |
| Public-form header | Request and Registration pages must use a conversion-focused header. It should prioritize the brand, Home, help/contact, and contextual sign-in. It must not foreground Admin account, Log out, or Admin Dashboard links. |

## Non-negotiable boundaries

No database schema, role, matching, account, or consent contract changes are in scope. Guardian phone, email, student identity, notes, contact-consent data, and Tutor private data must remain protected exactly as today. Current server-authoritative validation and City-scoped location selection remain the source of truth.

## Dependency order

### TRR-UX-01 — Conversion-focused public journey header and shared visual primitives

**Purpose.** Create the shared public-form presentation layer so both journeys use the same conversion-focused header, English-first visual language, saffron progress accent, and accessible trust/guidance treatment.

**Likely surfaces.** `client/src/components/SiteHeader.tsx`, `client/src/index.css`, a small shared journey UI component if justified, and focused header/component tests.

**Implementation details.** Add an explicit journey variant to the shared header rather than duplicating header behaviour. In journey mode, preserve the clickable brand and help/contact access, add a clear Home return route, and expose only contextual sign-in navigation. Do not render Admin Dashboard, Admin account, or logout actions in the conversion header. Add reusable visual primitives for step chips, a compact progress path, trust notices, and primary/secondary action states with visible keyboard focus and reduced-motion-safe transitions.

**Acceptance criteria.**

- Both form pages use the same journey header at desktop and 375 px widths.
- The public header exposes brand/Home/help and contextual sign-in, but not Admin account, Admin Dashboard, or Log out.
- The visual system uses blue as the primary colour and saffron only as a supporting emphasis colour with sufficient text contrast.
- No existing authenticated-route or role guard changes.

**Verification.** Focused header tests, keyboard navigation checks, `pnpm test`, `pnpm exec tsc`, and desktop/mobile screenshots.

### TRR-UX-02 — Two-step English-first Tutor Registration journey

**Purpose.** Turn the existing dense Tutor Registration card into a professional two-step progression without changing registration fields or account creation behaviour.

**Likely surfaces.** `client/src/pages/JoinTutor.tsx`, `client/src/pages/JoinTutor.test.tsx`, possibly shared journey primitives from TRR-UX-01.

**Implementation details.** Step 1 contains name, gender, Bangladesh phone, email, password, and password confirmation. Step 2 contains City, the dependent Thana/Upazila/Area/Sub-area selector, agreement, and submit. Retain the exact current client and server checks; validate only the current step before moving forward, surface concise English inline recovery messages near affected fields, focus the first invalid field, and preserve valid input when users move backward. Keep the existing password visibility controls, Terms/Privacy links, and existing-Tutor sign-in destination.

**Acceptance criteria.**

- A new Tutor can complete every current required field through two labelled steps and create an account exactly as before.
- City changes still clear the selected dependent location; no location may be submitted without City selection.
- Invalid values never advance the active step and receive understandable English feedback without exposing server details.
- On mobile, progress, actions, agreement, and existing-account path are readable and easy to tap without horizontal scrolling.

**Verification.** Add component tests for step gating, backward data retention, City/location dependency, and error focus/visibility. Run `pnpm test`, `pnpm exec tsc`, `pnpm build`, and desktop/mobile screenshots.

### TRR-UX-03 — Guided English-first Guardian Tutor Request experience

**Purpose.** Reframe the Guardian request journey as a clear, protective guided process while keeping the phone-first intake, registration, request payload, and privacy boundary intact.

**Likely surfaces.** `client/src/pages/GuardianRequestJourney.tsx`, its existing tests, and shared journey primitives from TRR-UX-01.

**Implementation details.** Translate the entire request journey into English-first copy, including the first phone stage, account stage, request form, review state, success state, labels, selector placeholders, and messages. Present the request form as three consistently named stages—Learning needs, Match preferences, and Review & send—with a shared progress path. Improve field grouping, use capsule selectable options with clear selected states, add concise inline validation/recovery guidance with preserved existing values, and keep privacy/trust information visible where decisions are made. Preserve the existing conditional tuition-location and budget rules as well as the final consent explanation.

**Acceptance criteria.**

- The Guardian can complete phone capture, account creation, all request stages, review, and submission with no payload or workflow change.
- Home/Both still require City and location; Online still never requests an exact location.
- Guardian contact, student identity, notes, and consent data remain private and are not exposed in any visual confirmation beyond the current safe scope.
- Errors are comprehensible, tied to the correct stage, and do not erase completed selections.

**Verification.** Add regression coverage for English labels/steps, stage gating, location conditionals, value retention, and safe review rendering. Run the full suite, TypeScript, build, and desktop/mobile screenshot review.

### TRR-UX-04 — Accessibility, responsive quality, and release gate

**Purpose.** Validate the shared and journey-specific redesign as a coherent, safe release.

**Likely surfaces.** Tests from TRR-UX-01 through TRR-UX-03, relevant CSS, `todo.md`, and release notes.

**Implementation details.** Verify semantic form labels, required-field communication, focus visibility, keyboard operation of location selectors and choice chips, error announcement/focus recovery, colour contrast, and no horizontal overflow at 375 px. Recheck that header mode does not weaken sign-in, user session, Admin-role, or mandatory-2FA enforcement. Recheck that no public UI exposes private Guardian or Tutor data.

**Acceptance criteria.**

- All new flows remain usable with keyboard and touchscreen input.
- Desktop and mobile screenshots demonstrate no clipped actions, overlapping controls, or low-contrast essential copy.
- Full tests, TypeScript, and production build pass.
- A focused code review finds no privacy, authorization, accessibility, or regression blocker.

**Verification.** `pnpm test && pnpm exec tsc && pnpm build`, whitespace check, route screenshots for `/request-tutor` and `/join-tutor` at desktop and 375 px, then save a checkpoint.

## Implementation sequence

Implement **TRR-UX-01 → TRR-UX-02 → TRR-UX-03 → TRR-UX-04**. This order isolates the shared header/design system first, enables independently reviewable Tutor and Guardian work, and finishes with security, accessibility, responsive, and release verification.
