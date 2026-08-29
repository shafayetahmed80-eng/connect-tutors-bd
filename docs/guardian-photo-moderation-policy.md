# Guardian Profile Photo Moderation Policy

## Purpose and scope

This policy governs an **optional Guardian profile photo** used only within the authenticated Guardian workspace and the Admin moderation workspace. A Guardian photo is **not a public Job Board asset**, is never supplied to Tutors, and does not change a Guardian’s ability to submit or manage a tutor request.

The feature supports a recognisable, appropriate portrait for the account holder while preserving the platform’s existing rule that Guardian phone numbers, email addresses, exact addresses, request notes, and student identity are not exposed to Tutors or public visitors.

## Eligibility and file-safety rules

| Rule | Requirement |
| --- | --- |
| Eligible uploader | The current, active Guardian account holder only. |
| File formats | JPEG, PNG, or WebP only. The server verifies the binary signature, not merely the browser-declared MIME type or file extension. |
| Maximum file size | 5 MB. |
| Image dimensions | At least 300 × 300 pixels and at most 10,000 × 10,000 pixels. |
| Storage | The server stores only an opaque S3 object key. Raw storage keys and unreviewed image URLs are never returned through public contracts. |
| Replacement | Uploading a replacement retains one current photo record, resets it to `pending_review`, and clears any prior decision from the current display state. The previous object is no longer referenced. |
| Removal | A Guardian may remove the current photo at any time. Removal clears the active record so initials become the identity fallback immediately. |

## Moderation lifecycle

```text
no_photo ──upload──> pending_review ──approve──> approved
                      │                     │
                      └────reject──────────> rejected

pending_review | approved | rejected ──replace──> pending_review
pending_review | approved | rejected ──remove──> no_photo
```

| Status | Meaning | Guardian-facing behaviour | Display rule |
| --- | --- | --- | --- |
| `pending_review` | A valid upload awaits an Admin decision. | The Guardian sees a factual “under review” status. | The image is not displayed in the sidebar identity surface; initials remain visible. |
| `approved` | A 2FA-verified Admin has approved the image. | The Guardian sees “approved.” | The photo may appear only in Guardian-owned identity surfaces. It is never shown on the public Job Board or to Tutors. |
| `rejected` | A 2FA-verified Admin declined the current image. | The Guardian sees a safe reason category and any approved-safe note. | The image is not displayed; initials remain visible. |
| no record | No current photo exists, or it was removed. | The Guardian is invited to upload an optional photo. | Initials fallback remains visible. |

Only an Admin whose mandatory TOTP verification is current may approve or reject a pending photo. A decision is immutable for that submitted object; a Guardian who wants a different result uploads a replacement, creating a fresh pending-review cycle.

## Review policy

An Admin approves a photo only when it is a clear, appropriate Guardian account portrait and does not create a privacy, safeguarding, or operational risk. The Admin rejects a photo when one of the following controlled reason categories applies.

| Rejection category | When it applies |
| --- | --- |
| `not_clear_guardian_portrait` | The image is unrelated, too unclear to review, or does not reasonably represent the account holder. |
| `contains_child_or_sensitive_personal_data` | The image shows a child or unnecessary sensitive personal information. |
| `contains_contact_or_promotional_content` | The image includes a phone number, email address, social handle, advertisement, QR code, or solicitation. |
| `inappropriate_or_unsafe_content` | The image contains abusive, sexually explicit, threatening, or otherwise unsafe material. |
| `low_quality_or_unrelated_image` | The image is materially unsuitable as an account image because of quality or relevance. |

An Admin may add a short, respectful note of up to 280 characters to help the Guardian correct a rejection. The Admin interface must remind reviewers not to include phone numbers, email addresses, exact locations, student information, credentials, or other unnecessary personal information in that note.

## Access, privacy, and auditability

The Admin queue exposes only the minimum operational metadata needed to review a photo: Guardian opaque ID, submission time, status, image preview, and previous moderation decision. It must not show Guardian phone, email, exact address, request notes, or student information. The Guardian’s own profile endpoint may expose only its current photo status, safe rejection context, and an authorized image URL when relevant; it must never return the raw storage key.

Each submission, replacement, removal, approval, and rejection produces an append-only, privacy-safe audit event. Audit events retain actor IDs, timestamps, action/status transition, and the controlled reason category. They do not duplicate image bytes, raw storage keys, Guardian contact data, or unbounded free-text notes. The current short moderation note remains visible only to the owning Guardian and authorized 2FA-verified Admin reviewers.

## Retention and deletion

The current record remains while it is needed to display the active status or approved image. A Guardian-initiated removal immediately removes the database reference and makes the image unavailable through the application. Replaced and removed objects are not reused. The platform does not promise immediate physical deletion from infrastructure-level backups; any backup retention follows the storage provider’s operational retention process. Review metadata is retained as a minimal operational audit trail without image content or contact data.

## First-release non-goals

The first release does not use facial recognition, automated identity verification, public Guardian directories, Tutor-visible photos, image sharing in messages, or any claim that the photo verifies identity. It also does not permit bulk moderation decisions or unreviewed image display outside the owner’s upload flow.
