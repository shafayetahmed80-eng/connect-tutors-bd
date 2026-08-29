# Guardian Request Flow Assessment Notes

## Supplied visual references

- The submission reference at `https://prnt.sc/WztcGH0uTD4b` uses a central success card with a prominent green confirmation mark, a short thank-you/submission heading, a coordinator-contact expectation, and an optional urgent-contact line. The requested product implementation should use this hierarchy as inspiration rather than copy the source layout.
- The Posted Jobs reference at `https://prnt.sc/kb2ij4AvRJbF` uses the Guardian sidebar, a horizontal status-category row with per-status counts, a primary "Post new tutor request" action, and a compact pending-request card that surfaces a title, job ID, date, tuition type, salary, subjects, location, tutor preference, and a Details action.

## Guardrails already requested by the Guardian

- The confirmation screen and every request summary remain Guardian-only.
- Address Details, Student Name, Student Gender, and Additional Notes must remain excluded from public Job Board cards, generic Tutor views, directions/map data, and Telegram alerts.
- Detailed state transitions, updates, and appointment actions require an explicit authorization model before implementation.
