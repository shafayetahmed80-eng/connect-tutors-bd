# Tutor Registration: City Dropdown Repair and Combined Location Selector

## Scope confirmation

This ticket set implements the requested registration flow: the **City** dropdown must load active Bangladesh city records, and after City selection the existing separate **Thana/Upazila** and **Area/Sub-area** controls will be replaced by one city-scoped searchable selector named **Thana / Upazila / Area / Sub-area**. The selector will include both parent locations and their child sub-areas. Child labels will identify their parent, such as `Mirpur-10 — Mirpur`.

> **Privacy boundary:** This work changes only public, non-sensitive location metadata. Tutor phone, email, approval state, and documents must never be returned by catalog procedures or displayed in this selector.

## Implementation tickets

### LOC-REG-01 — Repair the City catalog response and loading state

**Purpose:** Identify and correct the contract or client-state defect causing the City dropdown to render `No city matches your search` when active city records exist.

| Item | Detail |
|---|---|
| Likely surfaces | `client/src/pages/JoinTutor.tsx`, `server/routers.ts`, `server/db.ts`, location catalog tests |
| Dependencies | Existing active Bangladesh location seed and public catalog endpoint |
| Risk | Do not loosen active-record filtering or expose non-location Tutor data |
| Acceptance criteria | The open City selector lists active city records without requiring a search term; search is case-insensitive; loading, empty, and failure states are distinguishable; the selected city ID is preserved as the form value. |
| Verification | Focused City catalog/UI regression, `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build` |

### LOC-REG-02 — Define the city-scoped combined location result contract

**Purpose:** Add a deterministic, searchable result model containing both Thana/Upazila parent records and Area/Sub-area descendants for one selected City.

| Item | Detail |
|---|---|
| Likely surfaces | `shared/*`, `server/db.ts`, `server/routers.ts`, catalog tests |
| Dependencies | LOC-REG-01 |
| Risk | Parent traversal must be bounded to the selected City; no cross-city records or duplicate options may appear. |
| Acceptance criteria | Given a City ID, the response includes direct Thana/Upazila records and nested Area/Sub-area records; every child has a non-ambiguous display label including its parent; results are stable, deduplicated, and searchable by both child and parent name. |
| Verification | Contract regressions covering Dhaka City, Mirpur/Uttara-style sub-areas, cross-city exclusion, duplicate suppression, and empty-city handling. |

### LOC-REG-03 — Replace the two registration location controls with one combined selector

**Purpose:** Render one accessible selector under City that permits choosing either a parent location or a sub-area.

| Item | Detail |
|---|---|
| Likely surfaces | `client/src/pages/JoinTutor.tsx`, component/UI regressions |
| Dependencies | LOC-REG-01 and LOC-REG-02 |
| Risk | The selector must remain above adjacent form fields on mobile and must not lose values during open/search/select interactions. |
| Acceptance criteria | The new label is `Thana / Upazila / Area / Sub-area`; it is disabled until City is selected; it shows all City-scoped parent and sub-area options in one searchable menu; changing City clears the previously selected combined location; keyboard focus, arrow selection, Enter, Escape, outside-click, loading, and no-result states work correctly. |
| Verification | Rendered UI regressions plus 375px mobile visual review with the virtual keyboard open. |

### LOC-REG-04 — Preserve profile-compatible IDs and registration validation

**Purpose:** Persist the selected combined location in a schema-compatible form without breaking existing profile hydration or server-side location-chain validation.

| Item | Detail |
|---|---|
| Likely surfaces | `client/src/pages/JoinTutor.tsx`, `server/routers.ts`, `server/db.ts`, existing profile location contracts |
| Dependencies | LOC-REG-02 and LOC-REG-03 |
| Risk | This may require a compatibility mapping for existing separate `thana/upazila` and `area/sub-area` IDs; no destructive migration is approved. |
| Acceptance criteria | Selecting a parent location stores the parent-compatible identifier; selecting a sub-area stores the sub-area identifier and retains enough parent lineage for validation; existing saved profile locations still hydrate visibly; invalid or cross-city IDs are rejected server-side. |
| Verification | Regression coverage for new registration, sub-area selection, parent-only selection, City change reset, existing profile hydration, and forged hierarchy IDs. |

### LOC-REG-05 — Complete release validation and audit

**Purpose:** Confirm the fixed flow is usable and that no privacy or responsive regression was introduced.

| Item | Detail |
|---|---|
| Likely surfaces | `todo.md`, relevant test files, release review |
| Dependencies | LOC-REG-01 through LOC-REG-04 |
| Acceptance criteria | Full Vitest suite, TypeScript, production build, database integrity checks, desktop/mobile route verification, and code review pass. The public catalog contains only non-sensitive location metadata. |
| Verification | `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`, `git diff --check`, responsive screenshots, and catalog integrity queries. |

## Recommended implementation order

1. **LOC-REG-01** establishes a reliably populated City selector.
2. **LOC-REG-02** creates the bounded combined catalog contract.
3. **LOC-REG-03** replaces the two client controls.
4. **LOC-REG-04** locks in persistence, hydration, and forged-ID protection.
5. **LOC-REG-05** completes release verification.

## Approval point

Implementation should begin only after confirmation that both a parent location (for example, `Mirpur`) and a sub-area (for example, `Mirpur-10 — Mirpur`) may be selected from the same combined dropdown.
