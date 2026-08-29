# Tutor Request and Tutor Registration UI/UX Discovery

## Scope

This discovery covers the public Guardian Tutor Request journey at `/request-tutor` and Tutor Registration at `/join-tutor`. No account, data contract, validation rule, role boundary, or privacy behavior is changed during discovery.

## Current experience observed

| Journey | Existing strengths | Main friction or opportunity |
| --- | --- | --- |
| Guardian Tutor Request | It has a clear phone-first handoff, three visible stages, a step-based request form, location-dependent fields, a review step, and explicit contact-privacy cues. | Stage 1 is visually strong, but the remaining request steps need a more consistent guided-progress system, clearer field grouping, and more supportive validation/review feedback. |
| Tutor Registration | It has Bangladesh phone formatting, password visibility controls, city-scoped location selection, Terms/Privacy consent, and a safe post-registration dashboard handoff. | The single-card form is efficient but dense, especially on mobile; it needs stronger hierarchy, more aspirational Tutor-oriented guidance, and clearer progressive validation. |

## Responsive observations

At the 375 px viewport, both journeys are readable and their primary actions remain tappable. The Guardian page has a well-proportioned trust panel and mobile form card. The Tutor page remains functional but creates a long, visually uniform sequence of inputs; it would benefit from grouped sections, visible progress, and better recovery guidance before submit.

## Privacy and workflow constraints

Tutor phone numbers, email addresses, documents, and approval state must remain private. Guardian phone, email, student identity, notes, and contact-consent data must not become public or appear in Tutor inboxes. Any visual redesign must preserve current server-side validation, mandatory consent, password rules, City-scoped location selection, role boundaries, and Admin-mediated matching.

## Decisions still required

The approved direction is a two-step Tutor Registration journey, an enhanced staged Guardian request journey, Connected Sky with restrained saffron accents, English-first copy, and a conversion-focused public-form header that does not foreground Admin navigation. Implementation tickets are recorded in `docs/tutor-request-registration-ui-ux-tickets.md`.
