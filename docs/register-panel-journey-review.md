# Register Panel Journey Review

**Author:** Manus AI  
**Status:** Analysis complete; implementation requires the selected scope  
**Objective:** Update the public `/auth` **Register** panel using the real existing Guardian and Tutor registration journeys, without creating a duplicate account-creation flow.

## Confirmed Current State

The public account page already has separate **Sign in** and **Register** modes, with a Guardian/Tutor role choice. Its current Register mode displays only a brief role-specific description and one route CTA. It does not contain registration fields. [1]

Guardian registration is not an isolated account form. It is a guided three-stage journey: Bangladesh mobile capture, private Guardian account creation, then the Tutor Request form. The journey needs name, gender, email, password, City, location, and policy acceptance before account creation, and continues directly to the request workflow. [2]

Tutor registration is a two-step journey. The first step creates account/contact credentials; the second collects teaching location and terms acceptance. Tutor profile details remain a subsequent dashboard task. [3]

> **Preserved boundary:** The approved account-access specification explicitly says that the Register tab must not create accounts inline. It must direct each role to the established journey. Admin access remains entirely separate. [4]

| Role | Existing registration journey | Existing route | Register panel must promise |
|---|---|---|---|
| Guardian | Phone → private account → Tutor Request | `/request-tutor` | A guided Tutor Request that creates a Guardian account as part of the request |
| Tutor | Account/contact → location and consent | `/become-tutor` | A two-step Tutor Registration, followed by Dashboard profile completion |
| Admin | Owner invitation and mandatory two-factor authentication | `/admin/login` | Nothing; no Admin registration or role option appears on public account access |

## Requirement and Risk Matrix

| Requirement | Evidence | Risk if ignored | Acceptance condition |
|---|---|---|---|
| Use existing forms and server contracts | Guardian and Tutor journeys are already operational [2] [3] | Duplicate validation, inconsistent phone normalization, or bypassed consent | The Register panel has no account-creation inputs or mutation; it only starts the canonical role journey |
| Keep role separation | Selected role is already part of public account access [1] | A Guardian may be routed to Tutor registration or vice versa | Guardian always receives the Guardian request CTA; Tutor always receives the Tutor registration CTA |
| Explain the true flow before navigation | Guardian is three stages; Tutor is two stages [2] [3] | Visitors may abandon after expecting a short form | The panel shows a concise role-specific step map and accurate “what you need” guidance |
| Keep sign-in available | The Register panel is adjacent to the Sign in mode [1] | Existing users may start registration unnecessarily | Each role card includes a direct, visible “Already registered? Sign in” action that returns to Login while preserving the selected role |
| Keep Admin boundary unchanged | Admin is intentionally excluded from public account access [4] | Security expectation becomes unclear | Admin information remains only as a low-emphasis separate-access notice |
| Avoid stale Tutor sign-in routing | Tutor registration still links to legacy `/tutor/login` [3] | Tutor may miss the current email-or-mobile sign-in experience | Update that contextual link to the unified Tutor-selected sign-in entry as part of the same release |

## Recommendation: Enhanced Journey Launcher

I recommend retaining `/auth` as an **account access and journey-selection surface**, rather than embedding either full registration form into it. The Register tab should become a richer, role-specific **journey launcher** drawn from the existing panels.

For a selected Guardian, the panel should show a compact three-step progress row: **Confirm mobile**, **Create private account**, and **Request a Tutor**. It should state that phone, email, student information, and request notes are kept private from public Tutor profiles, then provide a primary **Start your Tutor Request** CTA to `/request-tutor`.

For a selected Tutor, the panel should show a compact two-step progress row: **Secure account details** and **Teaching location and consent**. It should clarify that teaching profile preferences are completed from the Tutor Dashboard after registration, then provide a primary **Start Tutor Registration** CTA to `/become-tutor`.

Both panels should offer a role-preserving **Already registered? Sign in** action. The Tutor registration page’s outdated “Sign in with email” link should point to the unified Tutor-selected sign-in route. The implementation may use a narrow URL query such as `/auth?role=tutor` solely to preselect the visible account type; it must never set a server role or alter session permissions.

| Aspect | Recommended behaviour | Why |
|---|---|---|
| Register tab | Accurate role-specific step map, requirements summary, privacy cue, CTA | Makes the panel visibly reflect the existing journey without duplicating it |
| Form fields on `/auth` | None | Preserves canonical validation, phone capture, consent, and mutation paths |
| Selected role | Persists while switching between Sign in and Register | Reduces wrong-role friction without exposing account existence |
| Tutor legacy sign-in link | Unified `/auth` route with Tutor preselected | Aligns existing Tutor registration with email-or-mobile access |
| Mobile layout | Step cards stack vertically with 44px-plus tap targets | Keeps the information scannable and accessible at 375px |

## Scope Alternatives

| Option | Description | Consequence |
|---|---|---|
| **A — Enhanced journey launcher (recommended)** | Upgrade the Register tab with accurate journey maps and direct CTAs to existing routes | Low risk; reuses all approved validation and privacy safeguards |
| B — Embed complete existing forms inside `/auth` | Refactor both journeys into reusable subflows and render them inside the Register tab | Higher delivery risk; may complicate Guardian’s sequential request flow and create route/state recovery problems |
| C — Keep current single-card panel | Only refresh copy or styling | Lowest effort, but does not substantially meet the request to update the Register panel from existing journeys |

## Decisions Needed Before Implementation

Choose one scope:

| Decision | Choices | Recommended selection |
|---|---|---|
| Register panel behaviour | **A** Enhanced journey launcher; **B** embed complete existing forms; **C** copy-only refresh | **A** |
| Tutor legacy sign-in link | **A** change it to unified Tutor-selected `/auth`; **B** retain legacy `/tutor/login` | **A** |

## Acceptance Criteria for Option A

The public Register tab shows role-specific step information that matches the existing journeys exactly. Guardian registration always opens `/request-tutor`; Tutor registration always opens `/become-tutor`. No duplicate registration fields or mutations are added to `/auth`. Existing users can return to role-preserving sign-in. The Tutor registration sign-in link opens the unified access screen with Tutor selected. Admin sign-in and two-factor authentication do not change. The release includes route/UI regression tests, keyboard checks, desktop and 375px mobile verification, TypeScript validation, production build, and a privacy review.

## References

[1]: ../client/src/pages/Auth.tsx "Public account access and current Register tab"
[2]: ../client/src/pages/GuardianRequestJourney.tsx "Canonical Guardian phone, account, and request journey"
[3]: ../client/src/pages/JoinTutor.tsx "Canonical two-step Tutor registration journey"
[4]: ./guardian-tutor-account-access-spec.md "Approved account-access specification"
