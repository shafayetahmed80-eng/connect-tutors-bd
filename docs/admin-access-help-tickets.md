# Admin Access Help and Mobile Navigation Tickets

## Approved scope

This work adds a public, guidance-only Admin Help destination and makes the existing **Admin Login** route easier to discover. It does not change Admin roles, invitations, passwords, sessions, 2FA enforcement, recovery-code handling, or Owner controls.

| Decision | Approved behavior |
|---|---|
| Footer destination | Add **Admin Help** to the homepage footer Quick Links and route it to `/admin/help`. |
| Help-page visibility | The page is public because it contains workflow guidance only, never user/account data. |
| Login-page guidance | Add a concise link from `/admin/login` to the help page; do not link an unauthenticated visitor directly to the setup route. |
| Mobile navigation | Show **Admin Login** for every visitor and route it only to `/admin/login`; show **Admin Dashboard** separately only to an authenticated Admin account. |
| Security | Mandatory 2FA stays unchanged. The help page must not show recovery codes, TOTP secrets, account-specific states, or instructions that bypass invitation/role checks. |

## Dependency-ordered tickets

### AH-01 — Create the public Admin Help page

**Objective.** Add `/admin/help` as a concise, mobile-responsive guide for the approved Admin access journey.

**Content.** Explain the six steps in neutral language: receive an Owner invitation, sign in with the invited account, become an Admin only after invitation acceptance, complete required authenticator enrollment on first Admin access, use the time-based code for later Admin sessions, and contact the Owner for an approved reset if the authenticator is lost. Include a clear link to `/admin/login` and a route back to the homepage.

**Security and privacy acceptance criteria.** The page must not expose whether any supplied email is an Admin, link directly to private Admin dashboard destinations, present recovery codes, expose TOTP secrets, or offer an alternative login path. It must remain usable whether the visitor is signed out, a Guardian, a Tutor, an Admin, or the Owner.

**UI acceptance criteria.** Use the established Connect Tutors BD visual language, readable mobile typography, semantic heading structure, and visible focus states. The page must have a clear page title and no dead-end navigation.

**Tests.** Add route-content and navigation tests covering the fixed Admin Login link, Home return path, and the absence of secret/recovery-code rendering.

### AH-02 — Add discoverability links without weakening access controls

**Objective.** Expose the help and login routes from the requested navigation locations.

**Changes.** Add **Admin Help** to `SiteFooter` Quick Links. Add a short “Need help with Admin sign-in or 2FA?” link to `/admin/login`. Add **Admin Login** to the mobile navigation menu for all users; it always targets `/admin/login`. Preserve the existing role-aware **Admin Dashboard** mobile entry for authenticated Admin accounts only.

**Authorization acceptance criteria.** No link may promote an account, mutate a session, complete 2FA, or circumvent the existing Admin/Owner server procedures. After an ordinary visitor selects the quick action, the current Admin Login and mandatory 2FA rules must determine access.

**Accessibility acceptance criteria.** Links must have unambiguous visible labels, remain keyboard reachable, and preserve the menu-close-on-navigation behavior. The Admin Login entry must not be represented only by an icon.

**Tests.** Add focused footer, login-page, and mobile-navigation regression coverage for exact destinations and the Admin Dashboard role boundary.

### AH-03 — Validate and release the navigation-help update

**Objective.** Verify that public guidance remains useful while protected access remains protected.

**Validation.** Run the focused tests plus the full regression suite, TypeScript check, production build, and whitespace check. Capture desktop and 375px mobile screenshots of the footer, mobile menu, help page, and login-to-help path. Confirm a signed-out visitor can read help and reach sign-in but cannot reach protected Admin workspace data; confirm the existing 2FA gate still intercepts unverified Admin sessions.

## Delivery order

| Order | Ticket | Depends on |
|---:|---|---|
| 1 | AH-01 — Public Admin Help page | Existing `/admin/login` and global home-return shell |
| 2 | AH-02 — Footer, login, and mobile discoverability links | AH-01 |
| 3 | AH-03 — Tests, visual verification, and release | AH-01 and AH-02 |

## Explicitly out of scope

This slice does not add SMS/email OTP, downloadable support files, a public reset mechanism, support-ticket integration, account invitation management changes, or any billing/subscription feature.
