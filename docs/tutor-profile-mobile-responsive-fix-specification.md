# Tutor Profile Mobile Responsive Fix Specification

**Status:** Proposed for approval  
**Author:** Manus AI  
**Scope:** Signed-in Tutor Profile workspace on Android-class portrait mobile viewports, including the Add to Home Screen browser preview.

## 1. Scope and objectives

The current Tutor Profile mobile experience has two screenshot-confirmed defects. First, the Bengali label for the review-submission action is clipped inside the completion card. Second, the Profile Photo panel does not preserve a clear and stable responsive layout for its photo preview or placeholder and its associated actions.

This specification fixes these two layout defects while retaining the existing five-step mobile wizard, draft-saving behavior, submission validation, private photo storage boundary, secure crop flow, and desktop workspace layout.

### Explicit non-goals

This work does not add new Profile fields, change Tutor Profile validation, modify public Tutor data, alter photo authorization or S3 storage behavior, change the approval workflow, or redesign the desktop Profile page. It does not turn the Add to Home Screen shortcut into a native Android application.

## 2. Users, permissions, and data boundaries

The only affected persona is an authenticated **Tutor** editing their own Profile. The UI continues to operate through the existing Tutor-only Profile procedures and photo endpoint.

| Data category | Source | Change in this work | Visibility rule |
|---|---|---|---|
| Profile field values | Tutor-entered profile draft | None | Private to the signed-in Tutor and authorized admins |
| Completion percentage | Derived client/server profile state | None | Private workspace data |
| Photo preview URL | Private owner-safe photo reference | Presentation-only layout update | Raw storage keys remain unavailable to the client and public directory |
| Photo binary | Tutor-selected local image | None | Validated and uploaded only through the existing authenticated flow |
| Submit and Save actions | Existing protected mutations | Presentation-only layout update | No permissions or API contracts change |

## 3. Responsive requirements

### 3.1 Completion card action layout

At a viewport width of **430 px or below**, the completion card must render its two primary actions in a vertical, full-width stack. The action order must remain Save Draft first, followed by Submit for Review.

Each action must preserve its full bilingual label without clipping, ellipsis, overflow, or horizontal page scrolling. The visual controls must retain a minimum 44 px touch target height, visible keyboard focus, and disabled/pending feedback while the profile is saving or submitting.

At widths above 430 px, the existing horizontal action arrangement may remain when it can show both full labels without clipping. If the available card width is insufficient at any breakpoint, the stack is the required fallback.

### 3.2 Profile Photo panel layout

At mobile widths, the Profile Photo panel must use a bounded, centred preview region. Whether the Tutor has an existing photo or no photo, the region must not overflow horizontally, overlap the field label, or compress its instructional copy into unreadable fragments.

The preview must retain a stable square crop presentation. The preview dimension may shrink proportionally on narrow screens but must remain at least 112 CSS pixels and no greater than 160 CSS pixels in the panel. The fallback placeholder must use concise, localised copy and must wrap within the same preview boundary.

The Replace Photo and Remove actions must appear as separate full-width mobile touch targets below the preview. The Remove action appears only when an existing photo reference is available. Both actions must remain accessible by keyboard, use their existing semantic labels, and must not expose photo storage keys.

### 3.3 Crop dialog on a portrait mobile viewport

The existing secure photo crop dialog must fit within the visible viewport or permit internal vertical scrolling. The crop canvas must scale to the usable dialog width while retaining the selected square crop. Confirm and Cancel controls must remain visible or reachable without requiring horizontal scrolling.

The dialog must preserve its focus trap, keyboard escape behavior, replacement confirmation behavior, image validation, and cancel-without-upload behavior.

## 4. UI state requirements

| UI state | Required mobile behavior |
|---|---|
| Default unsaved profile | Both actions are visible, clearly labelled, and tappable in a vertical stack at ≤430 px |
| Pending draft save or review submit | Relevant action indicates pending state; duplicate submission is prevented without shifting/collapsing the card |
| Validation errors | Existing inline Bangla error and guided recovery behavior remains available after a Submit attempt |
| No profile photo | A bounded, legible placeholder preview and Replace Photo action are shown |
| Existing profile photo | A bounded image preview plus Replace Photo and Remove actions are shown |
| Image selected for editing | The secure crop dialog is viewport-safe and confirmation remains reachable |
| Photo upload/remove failure | Existing error feedback remains visible inside the Profile workspace and does not corrupt the previous private photo reference |

## 5. Implementation boundaries

The changes will be restricted to responsive classes and focused presentation helpers around the existing completion actions and photo editor usage. Existing APIs, database schema, tRPC procedure shapes, upload endpoint behavior, binary image validation rules, and public Tutor DTO allowlists are out of scope and must remain untouched.

No new secret, external integration, schema migration, persistent data field, or API procedure is required.

## 6. Accessibility requirements

The responsive implementation must preserve source order: Save Draft precedes Submit for Review and the photo actions follow the preview. Controls must remain visually focused when reached with keyboard navigation. The completion controls must have readable labels at 200% browser text zoom without page-level horizontal scrolling. The crop dialog must keep its existing focus containment and accessible Close/Cancel/Confirm labels.

## 7. Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| MR-01 | A signed-in Tutor opens Profile at a 375 px or 430 px viewport | The completion card loads | Save Draft and Submit for Review appear as two full-width, vertically ordered controls with full visible bilingual labels |
| MR-02 | A Tutor opens the same completion card | They tap either action | The action remains fully tappable and the existing pending, draft-save, or submit behavior executes without horizontal overflow |
| MR-03 | A Tutor has no Profile Photo | Section A loads at 375 px | The bounded placeholder is fully readable and centred; the Replace Photo control is visible and tappable |
| MR-04 | A Tutor has an existing Profile Photo | Section A loads at 375 px | The image preview is contained within the photo panel and the Replace/Remove controls are separate, readable touch targets |
| MR-05 | A Tutor chooses to replace a photo | The crop dialog opens on a portrait Android viewport | Crop controls and Confirm/Cancel can be reached without horizontal scrolling and existing upload validation remains intact |
| MR-06 | The public Tutor listing is queried after photo actions | Public data is rendered | The response continues to exclude phone, email, profile/account status, and raw photo storage keys |
| MR-07 | A Tutor opens Profile at a desktop viewport | The workspace loads | Existing desktop layout and action ordering are visually unchanged unless space constraints require the established safe fallback |

## 8. Verification plan

The implementation must add focused Vitest coverage for the responsive action layout and photo panel presentation decisions. The complete Vitest suite, TypeScript check, and production build must pass. Desktop and 375 px/430 px preview captures must be reviewed, followed by an Android Chrome/Add to Home Screen retest by the user.

## 9. Open decision and recommended default

No unresolved business rule remains. The recommended and specified default is **stacked full-width completion actions at 430 px and below**, with a fixed bounded photo preview and vertically separated photo actions. This default is derived directly from the confirmed Android portrait screenshot and does not change the user’s existing Profile data or workflow.
