# Academic Hierarchy Release Review

## Scope

The Tutor Profile academic flow now follows the supplied source hierarchy:

> **Institute → Related Faculty → Department/Subject**

## Review findings

| Area | Finding | Status |
| --- | --- | --- |
| Profile reads and writes | The owner profile DTO persists and returns `facultyId` alongside the Institute and Department/Subject IDs. | Confirmed |
| Referential integrity | Server-side catalog validation verifies the active Institute, the Faculty's Institute parent, and the Department/Subject's Faculty parent before saving. | Confirmed |
| Legacy compatibility | The retired `degreeMajorId` remains optional in the persisted model so existing profiles remain readable while new selections use the three-level chain. | Confirmed |
| Privacy | The public tutor mapper still omits phone, contact email, profile status, and raw photo-storage keys. | Confirmed |
| Delivery guardrails | Full regression suite, TypeScript check, production build, live catalog query verification, and diff-whitespace checks completed successfully. | Confirmed |
