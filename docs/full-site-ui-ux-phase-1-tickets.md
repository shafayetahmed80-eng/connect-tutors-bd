# Full-site UI/UX Phase 1 — Approved Public-first Implementation Tickets

## Delivery boundary

This package implements the approved **1-B public-first sequence** and the selected design direction: **Connected Sky blue with restrained saffron accents, an original scalable orbit/link wordmark, controlled Bangladesh-context imagery, English-first UI copy, honest live/upcoming workspace hierarchy, and a mobile Tutor-directory filter sheet**. It covers public discovery, Guardian/Tutor conversion, and Account/Auth surfaces before a separately verified Tutor/Admin/Owner workspace release.

Privacy, matching, authentication, authorization, mandatory TOTP, recovery-code handling, Bangladesh selector contracts, Tutor Registration account/password/consent rules, and the prohibition on public contact disclosure are non-negotiable. No testimonial, rating, review, blog, event, tuition, or contact claim may be fabricated.

| Ticket | Outcome | Depends on |
|---|---|---|
| FSUX-01 | Shared brand, typography, responsive visual, and image-asset foundation | None |
| FSUX-02 | Route-aware public navigation, footer, and Home hierarchy | FSUX-01 |
| FSUX-03 | Account/Auth presentation recovery and secure support states | FSUX-01 |
| FSUX-04 | Honest public information, empty/error, and recovery-state system | FSUX-01 |
| FSUX-05 | Mobile-first Tutor Directory filter sheet and result feedback | FSUX-01 |
| FSUX-06 | Human, privacy-safe Tutor Profile trust and conversion hierarchy | FSUX-01, FSUX-04 |
| FSUX-07 | Tutor/Guardian conversion-route consistency review | FSUX-01–FSUX-06 where relevant |
| FSUX-08 | Cross-route accessibility, privacy, test, and release verification | FSUX-02–FSUX-07 |

## FSUX-01 — Establish the brand and public visual foundation

**Purpose.** Create an original, scalable orbit/link logo and wordmark; establish Connected Sky blue, restrained saffron, type scale, page rhythm, responsive spacing, accessible focus, card, state, and image-treatment primitives. Replace low-resolution or generic brand treatment without changing routes or business behavior.

**Likely surfaces.** `client/src/index.css`, `client/src/components/SiteHeader.tsx`, `client/src/components/SiteFooter.tsx`, brand-asset source files, `Home.tsx`, and representative public-page styles.

**Dependencies.** None.

**Acceptance criteria.** The logo remains sharp at header, mobile, footer, and social-preview-scale placements. Headlines use readable line-height and no cramped desktop or 375px wrapping. Saffron is an accent rather than a competing primary colour. Original Bangladesh-context imagery appears only on approved public trust/conversion routes, is responsive, has meaningful alt text, and is stored/served through the project’s approved static-asset workflow. Protected workspaces receive no decorative imagery.

**Verification.** Brand/header rendering regression; colour-contrast and keyboard-focus inspection; desktop and 375px screenshots; `pnpm test`; `pnpm exec tsc`; `pnpm build`.

## FSUX-02 — Apply purpose-led public navigation, footer, and Home hierarchy

**Purpose.** Extend the approved public-journey header policy across public discovery, information, Account/Auth, and conversion routes: keep the brand story, Home, Help, and contextual account/sign-in action primary, without letting Admin operational utilities dominate those routes. Refresh Home-section hierarchy using the shared brand and controlled human-learning visual layer.

**Likely surfaces.** `SiteHeader.tsx`, `SiteFooter.tsx`, `Home.tsx`, public-route shell, navigation tests, and responsive styles.

**Dependencies.** FSUX-01.

**Acceptance criteria.** Visitor, Guardian, Tutor, and Admin session states retain a clear recovery path but public acquisition routes do not visually foreground Admin Dashboard or logout controls. All role-gated destinations, sessions, sign-out, and mandatory 2FA behavior remain unchanged. Mobile menus remain keyboard accessible and dismiss correctly. Footer links remain factual and do not claim unverified contact channels.

**Verification.** Header role-state and mobile-menu regressions; Home/navigation desktop and 375px screenshots; `pnpm test`.

## FSUX-03 — Repair Account/Auth presentation and secure support states

**Purpose.** Resolve the missing `/account` `auth-*` design-system classes and unify Account, Admin Login, Admin Help, invitation acceptance, TOTP setup/challenge, and recovery presentation in an English-first support hierarchy.

**Likely surfaces.** `Account.tsx`, Admin auth/help pages, `index.css`, shared state components, and focused tests.

**Dependencies.** FSUX-01.

**Acceptance criteria.** `/account` renders as a complete responsive screen. Errors, loading, disabled actions, access denials, 2FA explanations, and recovery choices state the next safe action without exposing protected data. Mandatory TOTP, recovery-code one-time use, invitation expiry, Owner controls, role checks, and safe sign-out remain server-enforced and unchanged.

**Verification.** New Account rendering regression plus existing Admin security/auth suite; keyboard focus review; desktop/mobile captures; `pnpm test`; `pnpm exec tsc`.

## FSUX-04 — Standardize public information and recovery states

**Purpose.** Create a visually coherent English-first state system for loading, empty, no-result, unavailable profile, sign-in-required, and 404 conditions. Improve sparse public information routes through useful, transparent orientation—not invented operational content.

**Likely surfaces.** `NotFound.tsx`, public information pages, `TutorListing.tsx`, `TutorProfile.tsx`, Guardian access states, shared state primitive, and `index.css`.

**Dependencies.** FSUX-01.

**Acceptance criteria.** Every state explains what happened and offers a valid recovery action. The directory no-result, unavailable Tutor Profile, sign-in-required, loading, and fallback patterns share visual language while retaining accurate route-specific copy. No false availability, pricing, review, rating, testimonial, event, blog, or contact promise is introduced.

**Verification.** State-rendering regressions; manual keyboard review; desktop/mobile screenshots; `pnpm test`.

## FSUX-05 — Implement mobile-first Tutor Directory refinement

**Purpose.** Replace the mobile experience of the dense persistent filter rail with an accessible filter sheet, applied-filter chips, clear/reset action, and unambiguous result feedback while retaining the desktop filter rail.

**Likely surfaces.** `TutorListing.tsx`, filter components/styles, directory tests, and existing selector helpers.

**Dependencies.** FSUX-01.

**Acceptance criteria.** Subject, location, tuition mode, fee, language, gender, and verified filters preserve their current server-backed request contract and pagination. At 375px, a user can open, select, apply, clear, dismiss, and keyboard-navigate filters with no horizontal overflow. Chips accurately reflect applied filters, and result count remains clear. No private Tutor contact data appears in results or filter UI.

**Verification.** Existing directory filter/pagination tests plus new sheet interaction, applied-chip, clear/reset, and mobile overflow regressions; 375px screenshot; `pnpm test`; `pnpm exec tsc`.

## FSUX-06 — Strengthen Tutor Profile trust and Guardian conversion

**Purpose.** Make public Tutor Profile pages confident decision surfaces through improved credential hierarchy, verified status, tuition preferences, protected-contact explanation, controlled human-learning visual treatment, and one clear Guardian-request next step.

**Likely surfaces.** `TutorProfile.tsx`, public profile styles, approved visual assets, profile data/privacy tests, and action-behavior tests.

**Dependencies.** FSUX-01 and FSUX-04.

**Acceptance criteria.** Profile pages remain readable at desktop and 375px. Verified status and privacy explanation are prominent but factual. “Request this tutor” continues to use the current Guardian request flow. Any “Save profile” affordance must connect to a real approved capability or be removed; it must never falsely imply persistence. Phone and email remain absent from public API and HTML.

**Verification.** Existing profile privacy/data tests plus action behavior regressions; desktop/mobile screenshots; `pnpm test`.

## FSUX-07 — Align Tutor and Guardian conversion continuity

**Purpose.** Apply the approved visual foundation to recently improved Tutor Registration and Guardian Request journeys only where it improves cross-site consistency, without reopening their approved flow, validation, data, consent, or privacy contracts.

**Likely surfaces.** `JoinTutor.tsx`, `GuardianRequestJourney.tsx`, `JourneyProgress.tsx`, shared styles, existing regressions.

**Dependencies.** FSUX-01 and relevant state primitives from FSUX-04.

**Acceptance criteria.** Existing two-step Tutor Registration and guided Guardian Request remain English-first, retain entered values across steps, preserve city/location dependencies and password/consent rules, display inline recovery feedback, and keep Guardian contact/matching information private. Only surface-level visual consistency and factual trust cues may change.

**Verification.** Existing Tutor Registration, location-selector, Guardian request, and privacy tests; focused visual contracts; desktop/mobile screenshots; `pnpm test`.

## FSUX-08 — Complete release quality, accessibility, and privacy gates

**Purpose.** Verify the public-first release is cohesive, responsive, accessible, and safe before the protected workspace phase begins.

**Likely surfaces.** Relevant client tests, `todo.md`, discovery/ticket documents, and runtime logs. No schema migration is expected.

**Dependencies.** Every implemented Phase 1 ticket.

**Acceptance criteria.** TDD-style focused regressions cover new interaction contracts. All Guardian, Tutor, Admin security, mandatory 2FA, location/academic selector, matching, and public-contact privacy regressions continue to pass. Keyboard focus, colour contrast, descriptive alt text, responsive tap targets, and 375px overflow are reviewed. Protected Tutor/Admin/Owner workspaces remain functionally unchanged.

**Verification.** `pnpm test && pnpm exec tsc && pnpm build`; diff and whitespace review; recent runtime-log review; desktop/mobile screenshots; code review.

## Follow-on protected workspace phase

After Phase 1 passes every release gate, create a new discovery and ticket package for Tutor Dashboard, Admin Monitoring Workspace, Owner Security, and Owner Report polish. It will apply the approved **live versus upcoming** hierarchy, clearer empty states, reduced placeholder noise, role/context cues, and active-location breadcrumbs. Authenticated, 2FA-verified visual review is mandatory, and no role gates, audit logs, recovery codes, matching permissions, or Guardian contact-disclosure controls may change without separate approval.
