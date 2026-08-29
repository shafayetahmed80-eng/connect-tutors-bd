# Connect Tutors BD Account-Recovery UX Audit

## Scope and conclusion

This audit reviews the public Guardian/Tutor sign-in surface and the current password-recovery path after the approved account-access release. The current product deliberately provides **WhatsApp-assisted recovery** rather than an automated password-reset flow. That behavior is now documented in the interface and covered by a regression so users are not promised an email reset link that the system does not currently provide.

## Confirmed current behavior

| Surface | Current behavior | Assessment |
|---|---|---|
| Identifier entry | Users can enter an email address or Bangladesh mobile number. | Consistent with the approved public sign-in contract. |
| Password recovery link | “Need help signing in?” opens the factual Connect Tutors BD WhatsApp support path at `https://wa.me/8801516131411`. | Safe assisted-recovery route; it does not expose credentials or private account data. |
| Recovery disclosure | The form states that password recovery is handled by the support team on WhatsApp and that email reset links are not offered yet. | Honest and expectation-setting. |
| Automated reset action | No “Reset password” or email-reset control is shown. | Correct for the current backend capability; avoid adding a dead-end CTA. |
| Admin boundary | The public Guardian/Tutor screen does not expose an Admin role or Admin recovery path. | Preserves the separate Admin authentication and mandatory 2FA boundary. |

> **User-facing recovery contract:** “For password recovery, contact our support team on WhatsApp. We do not offer email reset links yet.”

## Risk and recommendation matrix

| Priority | Finding | User impact | Recommended next action |
|---|---|---|---|
| Informational | Recovery is manual through WhatsApp. | A user may wait for support instead of completing recovery immediately. | Keep the current factual disclosure until an automated reset backend is approved and implemented. |
| Low | The support message is generic and does not tell the user what safe information to include. | Users may send incomplete context, increasing support back-and-forth. | Add a short safe prompt such as: “Include your account type and registered email/mobile number. Never send your password or verification codes.” |
| Medium, future | There is no self-service reset flow. | Recovery depends on support availability. | When prioritized, add a time-limited, single-use reset-token flow with generic responses, rate limiting, session invalidation after reset, and audit events. Do not expose whether an identifier exists. |
| High, future security gate | A future reset implementation could accidentally cross the public/Admin boundary. | Admin security could be weakened if public recovery handles Admin accounts. | Keep Admin recovery separate from Guardian/Tutor recovery and require the existing mandatory TOTP policy for Admin access. |

## Regression coverage

The Auth DOM regression verifies the WhatsApp destination, the honest no-email-reset disclosure, the absence of a misleading reset-password link, password visibility behavior, and the continued absence of an Admin role in the public flow. The Guardian journey regression verifies that the location completion card exposes a keyboard-reachable edit action and clears only the selected area, returning the user to the existing selector without changing the request contract.

## Implementation boundary

No backend schema, credential-verification, role authorization, session, or Admin 2FA behavior was changed for this audit. An automated password-reset feature remains a future ticket because it requires an explicit token, expiry, abuse-prevention, notification, and privacy design before implementation.
