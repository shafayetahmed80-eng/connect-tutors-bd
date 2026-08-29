# Guardian Dashboard Reference Findings

## Visual evidence reviewed

The supplied Lightshot references show a left, persistent blue Guardian workspace sidebar with a branded logo area, circular profile image, Guardian name, email, Guardian/Student ID, and account creation date. The sidebar uses a compact vertical navigation with Dashboard, Hire Tutor, Profile, Attendance, Posted Job, Confirmation Letter, Settings, and lower-priority informational/community destinations.

The main dashboard reference shows a help banner near the top, a notice board, summary counters for pending, live, appointed, confirmed, and cancelled jobs, and lower dashboard cards for profile completion and verification. The reference includes phone-based help content; the implementation should use the platform's approved factual support channel rather than copy unverified source contact details.

## Design decisions for the plan

The new Guardian workspace should reuse the existing protected `DashboardLayout` shell and its mobile sidebar behavior rather than introduce a second layout system. Guardian-specific identity data should be rendered from authenticated user/profile data only. Student/Guardian ID must be sourced from a persisted, role-safe identifier or clearly labeled as unavailable until the identifier contract exists; it must not be fabricated in the UI.

The dashboard should present truthful counts from server data, with explicit loading, empty, and error states. Any notice board or community content must be real platform content or a clearly marked empty/upcoming state; fabricated testimonials, awards, notices, or activity summaries must not be introduced.

## Hire Tutor references

The supplied intro reference shows a three-step educational panel with `Skip` and `Get Started`, so the proposed journey should make the guidance optional and remember dismissal per Guardian account or browser session without blocking the request.

The first-page reference shows a `Hire Tutor / New Request` heading, a visible three-step progress indicator, two-column desktop form grouping, required fields for tuition type, category, class/course, subjects, city, location, and student gender, plus a clear `Next` action. On mobile, the same fields should collapse to one column while preserving order, labels, required markers, and progress context. Location must remain dependent on city and must reuse the existing Bangladesh location selector contract.

## Remaining Hire Tutor pages

The second-page reference is explicitly a draft-job state and collects student count, Tutor gender preference, days per week, salary/budget, hire date, and address details. The plan should distinguish required inputs from optional address detail, preserve the Previous action, and avoid treating a draft as an Admin-visible published job before Guardian submission.

The third-page reference collects institute name, tutoring time, a required `How did you hear about us?` value, and free-text requirements, then advances to Preview. This attribution field should be modeled as controlled values plus an explicit `Other` path when needed; free text must be bounded and sanitized server-side. The journey must preserve entered data across Previous/Next and provide a reviewable Preview before submission.

## Preview and submission

The Preview reference presents the full request as a read-only summary with field/value rows. The implementation should include section-level or page-level edit actions that return to the correct step without losing data, while keeping the final submit action explicit and protected from accidental double submission.

The submission reference promises that the request is received and will be verified before becoming live on the job board. This directly supports an explicit lifecycle: Guardian draft → submitted/new → Admin verification/review → approved/published or changes requested/closed. The UI must not promise that a request is immediately public, and any support phone or time window must use the platform's approved factual contact configuration rather than copying an unverified screenshot value.

## Shared Job Board references

The public reference clearly centers on tuition-job cards rather than tutor profiles. Each card includes a dynamic need statement, Job ID, posted date, tuition type, salary/budget, location, subjects, student/tutor gender preference, and Details/Share actions. The requested dynamic title should be generated from normalized fields such as curriculum/category, subjects, class/course, student count, and days per week; it must be server-derived or consistently shared, not assembled differently in each client.

The advanced-filter reference includes posted-date range, tuition type, country, city, tutoring days per week, category, location, student gender, class, tutor gender, and Job ID, with Clear and Apply controls. The plan should preserve the existing Tutor Listing filter interaction only where semantics match, but use a separate tuition-job query and result count. City/location filters must be dependent and deduplicated using the existing canonical location hierarchy.
