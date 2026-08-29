# Guardian Request Confirmation, Pending Jobs, and Timeline — Feasibility Assessment

## Scope recorded

This document records the requested Guardian experience only. It does **not** authorize or implement any code changes.

After a Guardian submits a tutor request, the system should show a premium acknowledgement/disclaimer page. The page should thank the Guardian, confirm secure submission, remind them that coordinator review begins next, and expose two actions: **View My Requests** and **Post Another Request**.

The Guardian workspace’s **Posted jobs** section should then present a private pending-job summary first, with a five-step numbered progress timeline: **Pending → Live → Appointed → Confirmed → Cancelled**. A request begins in Pending. Its Details control should open the request’s complete private summary and a controlled way to update request information.

## Feasibility conclusion

The requested experience is feasible. The current project already has the required authenticated Guardian dashboard, request creation route, Guardian-owned request history query, private request details, and the two requested sidebar destinations:

| Requested action | Existing destination | Feasibility |
|---|---|---|
| **View My Requests** | `/guardian/dashboard/posted-jobs` | Direct link to the existing Sidebar Posted jobs tab. |
| **Post Another Request** | `/guardian/dashboard/hire` | Direct link to the existing Sidebar Hire a tutor tab, which leads to the request form. |
| New request appears first as Pending | Existing request `status` begins as `new` | Safe mapping can present `new` as **1. Pending** without changing stored records initially. |
| Private request summary | Existing Guardian-only request query includes name, gender, address, notes, budget, and learning details | Can remain Guardian-only and must not reuse public Job Board data. |

## Recommended delivery design

### 1. Premium post-submission acknowledgement page

The present simple success state would be redesigned as a full acknowledgement page, not a public preview. It would use a refined confirmation card with a clear thank-you heading, Request ID, a short coordinator-review disclaimer, a privacy reassurance, and an estimated next-step explanation. It will not expose the submission fields on this page unless separately approved; the full private summary belongs in Posted jobs Details.

The two actions will be deterministic:

| Control | Destination | Expected result |
|---|---|---|
| **View My Requests** | `/guardian/dashboard/posted-jobs` | Opens the dashboard with the submitted request visible in the private Pending list. |
| **Post Another Request** | `/guardian/dashboard/hire` | Opens the dashboard’s Hire a tutor workspace, where the Guardian can begin a fresh request. |

### 2. Private Pending Jobs summary and Details experience

The existing Posted jobs screen already loads only the authenticated Guardian’s requests. It can be reorganized into a premium dashboard view with status filters/counts and a Pending-first section. Each row will display a limited operational summary—request ID, learning need, tuition type, location label where applicable, submission date, and current stage—without duplicating every private field on the list.

Selecting **Details** should open a full Guardian-only request workspace. That workspace can show all previously approved private fields, including Student Name, Student Gender, Address Details, and Additional Notes, plus the request’s budget and learning preferences. It should be guarded by the request owner check at the server layer; no public Job Board endpoint or generic Tutor read should be used.

### 3. Five-stage Guardian-visible timeline

The requested labels need a presentation layer because the current stored request lifecycle uses the broader technical states `new`, `reviewing`, `matched`, and `closed`. The Admin publication workflow separately tracks `submitted`, `reviewing`, `approved`, `published`, and `closed`. The labels below are therefore a recommended Guardian-facing projection, rather than a premature replacement of the current database state machine.

| Number | Guardian-facing stage | Recommended source of truth | Notes |
|---:|---|---|---|
| 1 | **Pending** | New request / coordinator review not completed | Default immediately after submission. |
| 2 | **Live** | Successfully published job opportunity | Must mean the privacy-safe Job Board entry is actually live, not merely “under review”. |
| 3 | **Appointed** | Admin has selected a tutor for private coordination | Requires a precise new or mapped matching milestone. |
| 4 | **Confirmed** | Guardian has approved the coordination/contact step and the appointment is finalized | Must not be reached just because a Guardian call was logged for publication. |
| 5 | **Cancelled** | Request is formally closed without a completed appointment | Existing closed state can map here, but the closure reason should be recorded. |

The current system has a protected contact-consent action when a request is matched. That makes **Appointed** and **Confirmed** technically feasible, but their exact transition rule must be confirmed before implementation. It is important not to label a request “Confirmed” merely because the Guardian confirmed publication; publication confirmation and tutor appointment confirmation are different events.

### 4. Controlled request updates

The current system lets a Guardian read their own request and decide contact consent, but does not currently have a Guardian-owned request-update procedure. A secure update feature would need a dedicated server mutation, ownership enforcement, input validation equal to the original form, audit/history data, and cache invalidation.

The safest base policy is to allow information updates only while the request is **Pending**. Once it is Live, Appointed, Confirmed, or Cancelled, a direct edit could contradict an active public job or matching decision. Later-stage changes should therefore use a change-request path or a new request, depending on the policy selected below.

## Privacy and integrity rules that must remain unchanged

| Area | Required protection |
|---|---|
| Address Details | Guardian, Admin, and formally assigned Tutor only; never on Job Board, generic Tutor views, directions, title, map links, or Telegram. |
| Student Name, Student Gender, and Additional Notes | Private in the Guardian Details workspace; public use remains restricted to the separately approved public projection rules. |
| Posted jobs list | Guardian-owned data only; queries must remain scoped to the signed-in Guardian’s user ID. |
| Timeline | Must derive from server-controlled status/progression; a user must not be able to advance a stage from the browser. |
| Request updates | Must retain the original validation rules, be owner-scoped, record a timestamp/history, and never mutate a public job silently. |

## Implementation sequence after approval

1. Confirm the timeline semantics and update policy one decision at a time.
2. Write the approved specification and small implementation tickets.
3. Add the required database fields/migration only if the approved timeline needs new durable milestones or audit history.
4. Add secure Guardian APIs and server-side authorization tests.
5. Build the acknowledgement page, Posted jobs summary, timeline, and Details/update workspace.
6. Run privacy regressions, full test suite, type check, production build, and mobile/desktop verification before release.

## First decision required

The first blocking decision is whether the Guardian may directly edit a request while it is Pending, or must send any requested correction for coordinator review. The answer determines the update API, audit trail, and the meaning of the Details action.
