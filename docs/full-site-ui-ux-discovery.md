# Full-site UI/UX Discovery

## Review scope

The initial review covered the shared application route registry, the public homepage, Tutor discovery and account-entry surfaces, the recently redesigned public form journeys, Guardian request access, authentication-related routes, the global header/footer, and the protected Admin workspace entry points. Screens were assessed at 1280px desktop and 375px mobile widths.

## Confirmed strengths

- The public homepage has a clear Connected Sky visual foundation: calm blue-and-white rhythm, purposeful whitespace, rounded cards, structured proof points, a learning-path narrative, and a strong request/a-tutor split.
- The prior Tutor Request and Tutor Registration upgrade has materially improved public form clarity through guided progress, English-first copy, grouping, and safe privacy cues.
- Guardian request history does not disclose private data before Guardian authentication; the access gate is understandable and visually coherent with the broader public surface.
- Mandatory Admin two-factor verification blocks Admin workspace data before access is granted. This is a deliberate security boundary rather than a discoverability failure.
- Core desktop and mobile views are readable, with no observed horizontal overflow in the reviewed public journeys.

## Highest-priority opportunities

| Area | Observation | User impact | Proposed direction |
|---|---|---|---|
| Brand identity | The current icon and wordmark are small and read as generic in the header/footer. | Reduces memorable, ownable service identity across all routes. | Create a scalable orbit/link mark, clearer wordmark treatment, and a compact brand-usage system. |
| Public navigation | When an Admin session is present, the global header foregrounds Admin account, logout, and dashboard actions on public discovery pages. | Competes with Guardian/Tutor decision-making and makes public pages feel operational. | Introduce route-aware public navigation that retains account access without allowing Admin utilities to dominate public journeys. |
| Cross-route personality | The homepage has warm, human learning imagery; directory, authentication, request, and registration pages are comparatively abstract and card-heavy. | The product feels less personal at key consideration and conversion points. | Extend restrained local-learning warmth, trust moments, and human context into key public decision pages without adding decorative clutter. |
| Typography and rhythm | Large headings are visually strong but occasionally tight and compressed; density varies significantly between public marketing and system pages. | Premium tone and scanability are less consistent. | Establish global type scale, line-height, and page-spacing rules for public, account, and workspace surfaces. |
| Empty, access, and review states | Guardian access state is reassuring; other system/auth states use different visual patterns and CTA hierarchy. | Users can lose confidence when transitioning between public and authenticated flows. | Standardise reusable state patterns for loading, sign-in required, empty, error, review, and success outcomes. |
| Role workspaces | Admin screens cannot be fully inspected without completing mandatory 2FA; the 2FA gate itself works correctly. | Full admin visual review must be performed from an authenticated, 2FA-verified session. | Retain the security gate and separately review actual workspace screens only in an authorized session. |

## Constraints that must remain unchanged

- Tutor and Guardian private contact information must remain non-public.
- Guardian matching and post-match consent processes must not change without separate product approval.
- Admin role gates, mandatory TOTP verification, recovery-code rules, and Owner-only controls must not be weakened for any design change.
- Bangladesh-specific location and academic selectors must retain their existing data contracts and validation behavior.
- Existing Tutor Registration account, password, consent, and profile rules must be preserved.

## Approved full-site UI/UX direction

The user approved the **1-B public-first delivery sequence**: improve public discovery, Guardian/Tutor conversion, and Account/Auth surfaces first, then conduct a separately verified protected-workspace phase. The confirmed visual and experience decisions are recorded below.

| Decision | Approved direction | Boundary |
|---|---|---|
| Delivery sequence | Public, conversion, and Account/Auth first; Tutor/Admin/Owner workspace polish later. | The later workspace phase must retain all role, 2FA, audit, matching, and contact-disclosure boundaries. |
| Brand system | Connected Sky blue with restrained saffron accents and a scalable custom orbit/link wordmark. | The brand asset must be original, responsive, and not depend on a small raster logo. |
| Human visual layer | Controlled Bangladesh-context human-learning imagery on public trust and conversion routes. | Protected workspace, security, 2FA, and matching screens remain clarity-first and free of decorative imagery. |
| Language | English-first UI across the website. | Existing private data, validation rules, and secure account language must remain accurate. |
| Workspace hierarchy | Clearly group live tools and upcoming tools; use honest empty states and reduced visual noise. | This is a later protected-surface release, not a promise to build placeholder workflows. |
| Tutor discovery filters | Mobile filter sheet with applied-filter chips, clear/reset controls, and result feedback. | Existing server filter contract, pagination, and public-contact privacy rules must remain unchanged. |

## Discovery status

The full-site discovery is complete. The implementation-ready public-first ticket package is documented in `docs/full-site-ui-ux-phase-1-tickets.md`; protected workspace polish remains a separately verified follow-on phase.

## Route-sweep findings

| Area | Observation | Risk / opportunity |
|---|---|---|
| Information routes | Tuition, Blog, Events, Privacy, and Terms share a polished but extremely sparse placeholder pattern. Multiple primary-navigation destinations currently end with a single "available soon" sentence. | The visual system feels consistent, but the platform appears incomplete at decision-making moments. Each route needs a content strategy, not merely surface polish. |
| Contact trust cues | The footer presents an illustrative office appointment, phone number, and `hello@connecttutorsbd.com`; these need confirmation as operational details before a public production launch. | Inaccurate contact claims weaken trust and can create a support dead end. Use only verified operating details or clearly scoped contact options. |
| Account entry | `/account` renders an unstyled, low-density legacy account screen which is visually disconnected from every other public or workspace surface. | This is the highest-severity consistency gap observed in the route sweep and should be a distinct early implementation ticket. |
| Admin invitation access state | The invitation security screen has good hierarchy and preserves 2FA, but its inactive/disabled primary action has insufficient visual distinction at a glance. | Improve disabled-action explanation and contrast without changing the secure invitation or 2FA logic. |
| Fallback recovery | The 404 page is simple, readable, and has a clear return-home action, but its visual language does not fully match the public brand system. | A small shared empty/recovery-state component could make it consistent with access, empty, and error flows. |
| Authenticated public header | The route sweep confirmed that public information pages show Admin account and Admin Dashboard affordances when an Admin session is present. | The selected route-aware public header policy should extend beyond the two form pages so the public product story remains primary. |

### Confirmed account-screen root cause

`Account.tsx` already uses the shared `auth-page`, `auth-shell`, `auth-panel`, `auth-feature-list`, and `auth-actions` class vocabulary. Those selectors do not currently exist in `index.css`, so the account page renders as largely unstyled semantic markup. This is a contained design-system gap, not an authorization issue: its role-specific actions and protected redirect behavior are already present and should be retained.

## Additional workflow findings

| Area | Observation | Risk / opportunity |
|---|---|---|
| Tutor discovery | The public directory offers powerful filters, but relies on a persistent dense desktop filter rail and native multi-select controls that require Ctrl/Cmd or a touch-specific multi-selection pattern. | This creates high cognitive and interaction friction on mobile. A staged mobile filter sheet, selected-filter chips, and clearer count/clear affordances should be planned without changing the current server filter contract. |
| Tutor dashboard | The portal has a coherent shared sidebar and a strong profile-status header, but exposes thirteen navigation destinations while most use a common "ready for its next workflow" placeholder. | The menu communicates a broader product promise than the activated feature set. Grouping current versus upcoming tools, improving empty-state explanations, and reducing visual repetition would make the workspace feel more intentional. |
| Dashboard shell | Tutor and Admin workspaces reuse a responsive, collapsible layout with safe authentication and mobile sidebar closure. The shared shell uses generic workspace naming rather than a branded product anchor. | Retain the protected behavior and responsive mechanics; introduce a light shared workspace visual system, clearer role/context indicators, and useful active-state breadcrumbs rather than redesigning the sidebar from scratch. |
