# Admin 2FA Removal and Moderator Role — Security Decision Review

**Prepared:** 21 August 2026  
**Scope:** Assess the proposed credential-only Admin login, removal of mandatory Admin TOTP 2FA, and creation of a Moderator role. This is an analysis document only; it does **not** change authentication, roles, permissions, or production data.

## Executive conclusion

The proposal is technically possible, but **removing mandatory 2FA for every Admin is not compatible with the current approved security model**. It would weaken the protection that presently gates Guardian contact access, matching, publication, Tutor moderation, Guardian-photo moderation, Owner controls, and security audit access. It is therefore a deliberate security-policy replacement, not a small login-screen adjustment. [1] [2]

The recommended direction is a **three-tier staff model**: retain **Owner** and **Admin** as two-factor-protected privileged roles, add a restricted **Moderator** role for narrowly defined, privacy-safe review work, and create a separate, credential-based staff sign-in flow only after defining secure credential provisioning and recovery. This meets the operational goal of delegating routine moderation without making password-only access capable of exposing Guardian contact data or changing high-impact matching/publication decisions.

> The current implementation explicitly requires “Admin role plus a valid, current two-factor proof” for monitoring and moderation procedures, and marks Guardian contact disclosure as a high-sensitivity operation. [2]

## Confirmed current-state evidence

| Concern | Confirmed current implementation | Impact of the proposal | Evidence |
|---|---|---|---|
| Admin entry | `/admin/login` expects an already established Admin session, then routes it to TOTP enrollment or challenge before the workspace. It does not contain an email/password form. | A credential-only staff sign-in page, backend contract, session flow, and recovery path would need to be built. | [3] |
| Password login | The current generic credential verifier accepts only `guardian` and `tutor` roles. It also returns a generic failure if the account has no password or is not active. | Admin or Moderator credential login cannot simply be enabled by changing copy; its role contract and account-provisioning flow must be extended. | [4] |
| Role vocabulary | The user enum contains only `guardian`, `tutor`, `admin`, and `user`. The shared Admin guard accepts only `admin`. | A `moderator` role requires a schema migration and a new server-side authorization guard; treating Moderator as Admin defeats least privilege. | [5] [6] |
| 2FA enforcement | The approved policy requires every Admin to complete TOTP before protected Admin operations. The short-lived proof is cryptographically bound to the Admin user ID and expiry. | Removing 2FA requires changing both server authorization and shared Admin workspace routing, plus the current security guarantees and regression tests. | [1] [7] |
| Sensitive data | Authorized Admin Guardian-contact viewing is specifically two-factor-protected and access-logged. | Password-only access to this surface materially increases account-takeover impact and invalidates an approved privacy boundary. | [2] |
| Operational workflows | Admin 2FA covers matching, assignment, publication, profile moderation, audit review, and recently added Guardian photo moderation. | A blanket removal creates broad code, test, UI, documentation, and audit-policy changes across existing modules. | [1] [2] |
| Owner security | Only the Owner currently manages invitations, role revocation, audit history, and 2FA reset. | Moderator management must preserve Owner-exclusive creation, suspension, role change, and recovery controls. | [1] [2] |

## Conflict assessment

### Removing mandatory 2FA for all Admins

This option conflicts directly with the approved Admin security decisions. The existing implementation states that protected Admin operations require a verified second factor, the Admin UI actively redirects unverified Admins to TOTP setup/challenge, and focused regression tests codify password-only Admin sessions as insufficient for matching, publishing, Guardian contact access, and moderation. [1] [3] [8]

There is also an operational privacy conflict. Admins may access Guardian phone, email, and registered location only through a two-factor-protected, audit-recorded action. Replacing that protection with an ordinary password increases the consequence of credential reuse, phishing, malware, and an unattended signed-in device. The current audited disclosure model remains valuable, but it no longer provides the same preventive control. [2]

Finally, the desired “Admin user ID and password” path does not exist today. The platform’s Admin page starts a preconfigured authenticated session flow, while the custom password verifier is deliberately limited to Guardian and Tutor accounts. Password-only staff authentication therefore needs a new enrollment/provisioning and recovery design; it is not only a route redirect. [3] [4]

### Creating a Moderator role

Creating a separate Moderator role is compatible with the architecture **if it is implemented as a distinct role with a dedicated permission guard**. It is not compatible with the current schema and shared Admin guard without code and migration work, because both currently recognize `admin` as the sole staff role. [5] [6]

The main design risk is permission creep. Adding `moderator` to every `adminProcedure` or `adminTwoFactorVerifiedProcedure` would automatically grant high-risk actions such as Guardian contact disclosure, Tutor assignment, publication lifecycle changes, security audit access, role management, and potentially personal-data exposure. That would create a second Admin in practice, only with weaker authentication. The proposed role must instead be opt-in at each procedure according to a written capability matrix.

## Benefits and disadvantages

| Choice | Benefits | Disadvantages and security cost | Overall assessment |
|---|---|---|---|
| Remove 2FA for all Admins and use password-only login | Faster daily access and fewer recovery/support steps. | Weakens approved defense in depth for highly sensitive Guardian contact and matching operations; breaks current guards/tests; requires a new staff credential lifecycle. | **Not recommended.** |
| Keep 2FA for Owner/Admin; add password-only restricted Moderator | Delegates repetitive moderation and allows operational access with less friction. Limits impact if the Moderator permission set is narrow. | Still needs secure staff credential setup, reset, rate limiting, audit logs, and careful per-procedure authorization. | **Recommended with strict boundaries.** |
| Keep 2FA for every privileged staff role; add Moderator | Strongest protection and consistent operational model. Simplifies policy and preserves current shared workspace gate. | Does not satisfy the request to remove the 2FA step for Moderators. | **Safest alternative.** |
| Make Moderator an alias of Admin | Smallest code change. | No meaningful privilege separation; exposes sensitive Admin powers and likely data. | **Reject.** |

## Recommended target role and permission model

The recommended baseline is to introduce **Moderator** as a staff role that can complete clearly delimited, privacy-safe review tasks. Owner remains an immutable privilege flag within the Admin role; it must not be represented as a client-side-only role label.

| Capability | Moderator, credential-only | Admin, mandatory 2FA | Owner Admin, mandatory 2FA |
|---|---:|---:|---:|
| Sign in to staff workspace | Yes | Yes | Yes |
| View privacy-safe queues and non-sensitive public-job fields | Yes | Yes | Yes |
| Approve/reject Guardian profile photos with controlled reason and audit | Yes | Yes | Yes |
| Review Tutor profile (non-document, non-contact fields) | **Decision required** | Yes | Yes |
| Create/edit a draft job without Guardian contact, notes, exact address, or publication | **Decision required** | Yes | Yes |
| View Guardian phone, email, or exact registered location | No | Yes, after valid 2FA and access audit | Yes, after valid 2FA and access audit |
| Record Guardian confirmation | No | Yes | Yes |
| Publish/unpublish, extend expiry, or assign a Tutor | No | Yes, after valid 2FA | Yes, after valid 2FA |
| Review Tutor interest with private Tutor contact data | No by default | Yes, after valid 2FA | Yes, after valid 2FA |
| Invite/revoke staff, alter roles, reset 2FA, or view security audit logs | No | No | Yes |
| Change Owner settings or remove Owner authority | No | No | No |

This split preserves the existing rule that no Tutor receives Guardian contact data. It also ensures that a compromised password-only Moderator account cannot use the staff console to expose Guardian contacts or carry out high-impact matching decisions.

## Recommended authentication design

The requested “Admin user ID and password” experience needs a precise definition. The current database supports a password hash on a user record, but the password-login contract does not accept Admins and the Admin entry page has no credential form. [3] [4] The safer design is:

1. **Use email as the staff sign-in identifier**, not a sequential or guessable Administrator ID. Display-only staff IDs may exist for support, but they should not replace a normalized, unique login identifier.
2. **Owner provisions the staff account through an expiry-bound, single-use invitation.** The invite should let a prospective Moderator set a strong password; the Owner never receives or creates a plaintext password.
3. **Store only a password hash**, retain a generic “invalid credentials” error, enforce account status, and add rate limiting/temporary throttling for repeated failures. The existing password verifier already shows the generic-error and active-account pattern. [4]
4. **Issue a separate scoped staff session** that contains role and session version, expires predictably, is `httpOnly`, `Secure`, and has rotation/revocation support. Do not repurpose a Guardian/Tutor account session without reviewing session scope.
5. **Provide Owner-only reset, suspension, and audit controls**, and record successful/failed staff credential events without passwords, reset tokens, session secrets, or IP history beyond the existing privacy-minimized policy.
6. **Keep Admin and Owner 2FA mandatory.** A successful Admin credential login should lead to the existing TOTP challenge; it should not grant access directly to privileged actions.

## Required implementation impacts

| Surface | Required change if the recommended model is approved |
|---|---|
| Schema and migration | Add `moderator` to the role enum, revise the role-scoped phone uniqueness rule if phone login is allowed for staff, and add only the staff credential/reset/audit records actually required. Generate and review a non-destructive migration. |
| Authentication | Add a staff credential sign-in contract, secure invite/initial-password setup, password reset/revocation path, rate limiting, and staff session boundaries. Do not enable the existing Guardian/Tutor generic login for all staff without review. |
| Authorization | Add `moderatorProcedure` and narrowly scoped shared procedures such as `staffModerationProcedure`; retain `adminTwoFactorVerifiedProcedure` for sensitive data and state changes. Never append `moderator` broadly to Admin guards. |
| Workspace UI | Make staff navigation role-aware. Moderator sees only allowed queues; Admin continues through the existing TOTP gate; Owner-only security/reports remain absent from Moderator and normal Admin navigation. |
| Workflows | Split any mixed queue into privacy-safe metadata and privileged details. For example, photo review can be Moderator-safe, while Guardian contact, Tutor matching, confirmation calls, publication, extension, and assignment remain Admin-only. |
| Testing and audit | Update existing 2FA tests only where policy intentionally changes; add deny-by-default Moderator tests, direct URL checks, field omission tests, invitation/reset/audit privacy tests, and tests proving password-only Moderator sessions cannot call privileged Admin procedures. |
| Documentation | Replace Admin help/login guidance only after the server policy is changed and tested. The current wording correctly states that role access and authenticator verification are required. [3] |

## Decisions required before specification

The following decisions are high impact and cannot safely be inferred:

| ID | Decision required | Why it matters | Recommended decision |
|---|---|---|---|
| D-01 | Is 2FA removed for **all** Admins, or only omitted for Moderators? | Determines whether high-sensitivity contact/matching protections are weakened. | Keep it mandatory for Admin and Owner; omit only for narrowly scoped Moderators if business-critical. |
| D-02 | What exact Moderator actions are permitted? | Prevents accidental Admin-equivalent access. | Start with Guardian-photo review only; expand via separate approvals. |
| D-03 | May a Moderator see Guardian/Tutor phone, email, raw address, notes, documents, or contact-consent history? | Direct privacy boundary and breach impact. | No, all remain Admin-with-2FA only. |
| D-04 | What identifier is intended by “Admin user ID”? | A sequential or public support ID is poor credential design. | Email login identifier; optional opaque display ID only. |
| D-05 | How are staff passwords created and recovered? | Prevents Owner-created/shared passwords and account-lockout risk. | Single-use Owner invitation to set password; Owner-only reset/revoke. |
| D-06 | Should existing Admins be moved to password login? | Current Admin accounts may not have password credentials. | Preserve the current sign-in/TOTP path initially; migrate only through a dedicated, tested enrollment process. |

## Rejected alternatives

**Removing TOTP only in the frontend** is rejected because server procedures, not UI routing, enforce the current two-factor boundary. Hiding the challenge would produce failed calls or, if server guards were weakened without a policy redesign, silently expose sensitive operations. [1] [7]

**Adding `moderator` wherever `admin` is accepted** is rejected because it creates no effective least-privilege boundary. The new role would acquire the ability to open Guardian contacts or perform matching/publication operations unless every endpoint is audited individually.

**Using a sequential Admin/Moderator ID as the sole login identifier** is rejected because it is predictable and does not improve authentication strength. It may be retained as a display/support identifier, while email plus password remains the login identity.

## Recommended next step

Approve one of the following policy directions before implementation:

| Option | Approval text |
|---|---|
| A — Recommended | “Keep mandatory TOTP for Owner/Admin. Add a credential-only Moderator role limited initially to Guardian photo review, with no Guardian/Tutor contact, matching, publication, assignment, security, or report access. Use Owner-issued single-use password-setup invitations and email sign-in.” |
| B — Stronger security | “Add Moderator, but retain mandatory TOTP for every staff role. Apply the same permission limits as Option A.” |
| C — Higher risk | “Remove TOTP for every Admin and use credential-only staff login.” This requires an explicit acceptance that Guardian-contact and matching controls will be password-only, plus a full replacement security specification. |

## References

[1]: ../docs/admin-security-tickets.md "Approved Admin security policy and TOTP enforcement"
[2]: ../docs/admin-monitoring-sidebar-tickets.md "Admin monitoring, Guardian-contact privacy, and Owner boundaries"
[3]: ../client/src/pages/AdminLogin.tsx "Current Admin entry and TOTP routing"
[4]: ../server/db.ts "Current password account verification contract"
[5]: ../drizzle/schema.ts "Current user role enum and users table"
[6]: ../server/_core/trpc.ts "Current server role guards"
[7]: ../server/admin-security.ts "Short-lived signed Admin two-factor proof"
[8]: ../server/admin-security.router.test.ts "2FA-gated Admin operation regressions"
