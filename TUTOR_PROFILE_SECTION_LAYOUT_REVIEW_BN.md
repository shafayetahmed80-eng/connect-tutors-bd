# Tutor Profile — Section A–H Layout Review

**Scope:** This is a design and interaction review only. It does not change production UI, schema, validation, or stored Tutor data.

## Excel-driven scope reflected in the new preview

| Section | Confirmed change from uploaded workbook |
|---|---|
| A — Personal Information | `Present Address`, `Permanent Address`, `Nationality`, `Religion`, and `National ID (NID)` remain and are marked mandatory. `Secondary Phone` and `Social Profile Links` are removed. |
| B — Parent & Emergency Details | `Father's Name` and `Father's Phone` are mandatory. Mother and emergency-contact fields remain optional. `Guardian Name` and `Guardian Phone` are removed. |
| C — Education | `Degree / Major` is removed. `Passing Year` is mandatory unless the Tutor chooses `Currently Studying`. |

All other retained fields continue to follow the last uploaded workbook’s Keep/Remove and New Requirement decisions.

## Assessment of the proposed layout

The direction is strong: displaying Sections A–H on one continuous profile page helps a Tutor understand the full information model before editing. The repeated **Edit Information** action makes responsibility clear at section level, while a separate section action reduces the risk of losing work in a long profile.

The main usability risk is page length, particularly on mobile. The layout should therefore retain the user-requested **default expanded** state, but pair it with a persistent section navigator and clear save states rather than relying on long unstructured scrolling.

## Recommended interaction model

| Element | Recommendation | Reason |
|---|---|---|
| Default section state | All eight sections start expanded. Each can still be collapsed manually after review. | Meets the requested transparency while giving users control of page length. |
| Edit Information button | Use a pencil icon plus the explicit label `Edit Information`; it switches only that section from read-only summary to editable controls. | Prevents accidental edits and keeps the page scannable. |
| Section action | Use `Save section` as the primary action. Show `Saved` only after server confirmation. | “Submit” can be confused with final profile review submission. |
| Final action | Keep a separate, page-level `Submit profile for review` action that appears only after all required fields are complete. | Preserves a clear workflow boundary. |
| Saved state | Show `Draft saved`, `Needs attention`, or `Submitted` in every section header. | Gives immediate, local feedback. |
| Navigation | Add a sticky A–H quick-jump rail on desktop and a sticky compact section index on mobile. | Avoids long-scroll fatigue without hiding sections. |
| Validation | On section save, validate only that section and return focus to the first invalid field. | Makes correction immediate and understandable. |
| Privacy | Keep NID, University ID, certificates, parent contacts, full addresses, and emergency contacts in Tutor/Admin-only data. | Protects private information from Guardian CV views. |

## Responsive layout guidance

On desktop, use a content column with an adjacent quick-jump rail. Each expanded section should maintain a clear header, two-column field grid where suitable, and its own action row. On mobile, use a one-column grid, retain all sections expanded, make the section action full width, and pin only a compact A–H navigator—never the entire desktop sidebar.

## Preview verification record

The desktop preview shows all Sections A–H expanded, a pencil-icon `Edit Information` control in every header, a per-section action, the seven newly mandatory fields, the three removals, and the Tutor/Admin-only verification disclosure. The privacy-safe mobile overview uses neutral placeholders rather than example private data. A separate mobile edit-state preview shows the Class Levels multi-select with the approved list: Play, Nursery, KG, Class 1–8, SSC, HSC, O Levels, and A Levels.

These assets are visual design artefacts only. No Tutor Profile application code, persistence, validation, workflow, or public/Guardian surface changed.

## Approved Class Levels grouping

The `Class Levels *` field remains a required multi-select. The approved options are `Play`, `Nursery`, `KG`, `Class 1–5`, `Class 6–8`, `SSC`, `HSC`, `O Levels`, and `A Levels`. This replaces the earlier separate `Class 1` through `Class 8` entries in the preview and future implementation scope.

## Pre-implementation decisions to confirm

1. Whether the visible per-section control should be named **Save section** (recommended) or **Submit section**.
2. Whether first-time mandatory fields should open in edit mode automatically, while complete sections remain read-only until `Edit Information` is selected.
3. Whether an Admin may edit Tutor-entered values, or should only review, request changes, and modify field-requirement rules.
