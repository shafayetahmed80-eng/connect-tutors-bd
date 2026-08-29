# Guardian Request Flow — Simple Decision Tickets

## How these tickets work

These are **decision tickets**, not coding tickets. Each ticket explains one small product decision in simple Bengali. I will ask one question at a time, record the answer, and wait for the final approval before implementation begins.

| Ticket | What will be decided | Why it matters |
|---|---|---|
| GD-01 | After-submit thank-you/disclaimer page contents | Determines what the Guardian sees immediately after a request is submitted. |
| GD-02 | “View My Requests” and “Post Another Request” actions | Confirms navigation from the thank-you page to the two sidebar tabs. |
| PJ-01 | Pending-first Posted Jobs summary | Defines how newly submitted requests appear first in the Guardian dashboard. |
| PJ-02 | Five-step status timeline | Defines the precise meaning of Pending, Live, Appointed, Confirmed, and Cancelled. |
| PJ-03 | Details page visibility | Determines whether request details open in a panel, a dedicated page, or both. |
| UP-01 | Pending-stage update rule | Determines whether a Guardian edits directly or asks the coordinator to change details. |
| UP-02 | Later-stage update rule | Prevents a Live or appointed tuition request from becoming inconsistent. |
| PR-01 | Private data display rules | Confirms that private student and address data never enter public or generic Tutor views. |

## GD-01 — Thank-you and disclaimer page

**What will happen:** After a request is submitted, the Guardian will see a premium acknowledgement page. It will display a thank-you message, the Request ID, a short explanation that the coordinator will review the request, and a privacy reminder.

**Recommendation:** Keep this page short and reassuring. The page should not repeat all private student details; those details should live in the protected Posted Jobs Details view.

| Option | Choice | Advantage | Trade-off |
|---|---|---|---|
| A | Short thank-you + Request ID + review/privacy notice | Premium, clear, quick on mobile. | Full request details are not visible immediately. |
| B | Full submitted-request summary on the thank-you page | Guardian can re-check every field immediately. | Can feel crowded and repeats sensitive information. |
| C | Short thank-you page with an expandable private summary | Balances brevity with optional detail. | More interaction and UI complexity. |

## GD-02 — The two next actions

**What will happen:** The thank-you page will include these two actions exactly as requested.

| Button | Destination | Recommendation |
|---|---|---|
| **View My Requests** | Guardian Dashboard → Posted jobs | Use as the main solid button, because it helps the Guardian verify the submitted request. |
| **Post Another Request** | Guardian Dashboard → Hire a tutor | Use as the secondary outline button, because the first request has just been completed. |

No new product choice is required here unless the button wording should be changed.

## PJ-01 — Pending Jobs summary first

**What will happen:** When a Guardian opens **Posted jobs**, pending requests will appear at the top. Each request card will show Request ID, learning need, tuition type, area label where relevant, submitted date, current status, and a Details button.

**Recommendation:** Put a compact status-count strip at the top, then the Pending list. This makes a new request easy to find without making the page heavy.

| Option | Choice | Advantage | Trade-off |
|---|---|---|---|
| A | Status count strip + Pending section first | Fast overview and clear priority. | Slightly more UI than a single list. |
| B | One list sorted by latest request | Simplest screen. | Pending requests are less clearly separated. |
| C | Separate tabs for each status | Good for many requests. | Adds taps and may be excessive for most Guardians. |

## PJ-02 — Five-step status timeline

**What will happen:** Every request will show the following numbered timeline:

`1. Pending → 2. Live → 3. Appointed → 4. Confirmed → 5. Cancelled`

**Important:** “Live” must only mean that the privacy-safe Job Board opportunity is actually published. “Confirmed” should not mean only that a Guardian previously confirmed a call; it should represent the final appointment/coordination outcome.

**Recommendation:** Display all five stages in every request’s Details view and highlight the active stage. On the list card, show only the current status badge to keep the page clean.

## PJ-03 — Details screen format

**What will happen:** Clicking **Details** will reveal the Guardian’s complete private request summary, including Student Name, Student Gender, Address Details, Additional Notes, learning needs, budget, and status timeline.

| Option | Choice | Advantage | Trade-off |
|---|---|---|---|
| A | Dedicated Details page | Best for mobile, deep linking, and future updates. | One extra navigation step. |
| B | Expandable panel inside Posted jobs | Fast and simple for one request. | Can become crowded on mobile. |
| C | Both: compact expansion + “Open full details” | Flexible experience. | More UI and testing work. |

**Recommendation:** A. A dedicated Details page is safer for private data, mobile readability, and future audit/update controls.

## UP-01 — Update rule while Pending

**What will happen:** The Details screen needs a safe method for correcting submitted information before the request becomes Live.

| Option | Choice | Advantage | Trade-off |
|---|---|---|---|
| A | Guardian edits directly while Pending | Fast correction; best user experience. The system records an audit history. | Requires clear version/audit handling. |
| B | Guardian submits a change request; coordinator updates it | Stronger operational control. | Slower and creates extra coordinator work. |
| C | No update option; Guardian must create another request | Lowest technical risk. | Poor experience and duplicate requests. |

**Recommendation:** A. Allow direct edit only while Pending, record the change, and lock direct edits as soon as the request becomes Live.

## UP-02 — Update rule after the request is Live or appointed

**What will happen:** When a request is Live, Appointed, Confirmed, or Cancelled, changing core fields can conflict with publication or matching.

| Option | Choice | Advantage | Trade-off |
|---|---|---|---|
| A | Direct edit is locked; Guardian can send a change request | Keeps the public job and matching record consistent. | Requires coordinator review. |
| B | Direct edit remains available at all stages | Most flexible for Guardian. | Can create incorrect Live listings or matching records. |
| C | No change is possible after Pending | Simple policy. | Too restrictive when a genuine correction is needed. |

**Recommendation:** A. Lock direct edits after Pending and use a reviewable change-request path.

## PR-01 — Privacy rules

The following rules are not optional and will remain unchanged:

| Data | Guardian Details | Admin | Assigned Tutor | Job Board / generic Tutor / Telegram |
|---|---:|---:|---:|---:|
| Student Name | Yes | Yes | Only when formally assigned | No |
| Student Gender | Yes | Yes | Only when formally assigned | Only through previously approved public projection |
| Address Details | Yes | Yes | Only when formally assigned | No |
| Additional Notes | Yes | Yes | Only when formally assigned | No |

## Decision order

The following order avoids conflicts:

1. **GD-01:** Thank-you page content.
2. **PJ-01:** Posted Jobs summary layout.
3. **PJ-03:** Details screen format.
4. **UP-01:** Pending-stage update rule.
5. **UP-02:** Later-stage update rule.
6. **PJ-02:** Exact definitions for Appointed, Confirmed, and Cancelled.
7. Final review and explicit approval for implementation-ready tickets.
