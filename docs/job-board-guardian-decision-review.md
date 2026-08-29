# Job Board ও Guardian Workspace: তিনটি পণ্য-সিদ্ধান্তের Grill Review

**প্রস্তুতকারক:** Manus AI  
**তারিখ:** ২১ আগস্ট ২০২৬  
**পরিধি:** (১) Job expiry duration, (২) Tutor Job Board apply behavior, এবং (৩) Guardian Posted Jobs ও Attendance tab-এর প্রথম-release scope।

## Executive recommendation

বর্তমান implementation-এ **৩০ দিনের expiry** ইতিমধ্যে একটি নিরাপদ এবং সহজে পরিচালনাযোগ্য baseline। প্রথম release-এ এটিই অপরিবর্তিত রাখা, মেয়াদ শেষ হওয়ার আগে Admin-এর manual Guardian reconfirmation চালু রাখা, এবং পুনঃপ্রকাশে একই Job ID বজায় রাখা সবচেয়ে কম ঝুঁকির সিদ্ধান্ত। Public Job Board-এ সরাসরি phone/email/contact প্রকাশ বা direct application যুক্ত করা উচিত নয়। পরিবর্তে পরবর্তী ticket-এ শুধুমাত্র signed-in, eligible Tutor-এর জন্য **private “Express interest”** workflow আনা উচিত; final matching ও contact coordination Admin-এর হাতে থাকবে। Guardian Dashboard-এ **Posted Jobs** এখন বাস্তবায়নযোগ্য, কিন্তু **Attendance**-কে matching ও confirmed-teaching data contract ছাড়া চালু করা বিভ্রান্তিকর ও অনিরাপদ হবে; তাই সেটি truthful “Coming soon” অবস্থায় থাকা উচিত।

| সিদ্ধান্ত | সুপারিশ | কেন এখন | Release অবস্থান |
|---|---|---|---|
| Job expiry | ৩০ calendar days, early close/unpublish এবং reconfirmed re-publish | বর্তমান contract, expiry filter ও projection refresh-এর সঙ্গে সামঞ্জস্যপূর্ণ | অনুমোদনের জন্য প্রস্তুত |
| Tutor action | Signed-in eligible Tutor-এর private **Express interest**, direct contact নয় | Tutor demand capture হবে; Guardian privacy ও Manual Matching বজায় থাকবে | আলাদা data/workflow ticket প্রয়োজন |
| Posted Jobs | Guardian-owned read-only lifecycle view | প্রয়োজনীয় private request ও published projection foundation ইতিমধ্যে আছে | পরবর্তী Guardian ticket হিসেবে প্রস্তুত |
| Attendance | Matching/teaching contract না হওয়া পর্যন্ত defer | প্রকৃত session, authority ও dispute rules এখনও নেই | এখন implement করা উচিত নয় |

## বর্তমান প্রমাণ ও সীমারেখা

বর্তমান public projection একটি deliberate allow-list ব্যবহার করে। এতে Job ID, category, class/course, subjects, budget, area-level direction, প্রকাশকাল এবং expiry আছে; Guardian phone/email, student name, private notes, exact street address বা coordinates নেই। এটি public ও Tutor Dashboard উভয়ের privacy boundary-এর ভিত্তি। [1]

| বর্তমান সক্ষমতা | প্রমাণ | সিদ্ধান্তে প্রভাব |
|---|---|---|
| ৩০ দিনের default expiry | `DEFAULT_JOB_EXPIRY_DAYS = 30`; publication timestamp থেকে expiry calculate হয় | v1-এ পরিবর্তন না করাই সাশ্রয়ী ও predictable |
| Re-publish refresh | Job ID ও request link immutable, কিন্তু verified data refresh হয় | Guardian reconfirmation-এর পরে fresh public information রাখা সম্ভব |
| Public card action | `View details` এবং area-level `Direction`; apply/contact action নেই | Tutor-interest workflow সম্পূর্ণ নতুন product contract হবে |
| Guardian private history | Guardian কেবল নিজের request, progress এবং contact-consent দেখেন | Posted Jobs-কে private ownership query-তে গড়া সম্ভব |
| Attendance model | কোনো attendance table, session entity, confirmed teaching relationship বা attendance authority নেই | Attendance tab চালু করলে misleading empty feature হবে |

> “Your phone number and email remain private unless you explicitly approve this coordination.” — বর্তমান Guardian request tracking copy [2]

## সিদ্ধান্ত ১ — Job expiry duration

### সুপারিশ: v1-এ ৩০ দিনের calendar expiry রাখুন

প্রকাশিত Job একটি সময়সীমাবদ্ধ opportunity, স্থায়ী বিজ্ঞাপন নয়। বর্তমান ৩০ দিনের default একটি বাস্তবসম্মত upper bound: Admin ও Guardian-কে নতুন request তৈরি না করেই matching review করার সময় দেয়, আবার listing অনির্দিষ্টকাল live থাকার ঝুঁকিও কমায়। বর্তমান projection-এ online job-এর physical location null করা এবং expired record public query থেকে বাদ দেওয়ার নকশাও এই policy-এর সঙ্গে সামঞ্জস্যপূর্ণ। [1]

প্রস্তাবিত operational rule হলো: Job প্রকাশের ১৪–২১ দিনের মধ্যে Admin status review করবেন; প্রয়োজন পূরণ হয়ে গেলে বা Guardian আর আগ্রহী না থাকলে সঙ্গে সঙ্গে **close/unpublish** করবেন; ৩০ দিন পূর্ণ হলে Job public board থেকে নিজে থেকে অদৃশ্য হবে; renewed need হলে Admin Guardian-এর নতুন confirmation নিয়ে **re-publish** করবেন। Re-publish public Job ID বদলাবে না, তবে verified field ও নতুন expiry refresh হবে।

| বিকল্প | সুবিধা | ঝুঁকি | সিদ্ধান্ত |
|---|---|---|---|
| ৭–১৪ দিন | খুব fresh board | ঘনঘন Admin follow-up, genuine slow match হারানোর সম্ভাবনা | এখন নয় |
| **৩০ দিন** | বর্তমান contract; কম operational churn; predictable | proactive review না হলে stale need কিছুদিন থাকে | **v1 recommendation** |
| ৬০–৯০ দিন | কম republish work | stale jobs, Tutor frustration, privacy/accuracy risk | প্রত্যাখ্যাত |
| Auto-renew | কম manual work | Guardian reconfirmation ছাড়া stale job public থাকে | প্রত্যাখ্যাত |

**Acceptance criteria:** public query-তে `expiresAt <= now` record কখনো আসবে না; early close/unpublish তাৎক্ষণিকভাবে board থেকে সরাবে; expired/closed listing পুনঃপ্রকাশের আগে Guardian confirmation-এর audit evidence থাকবে; re-publish-এর ফলে old Job ID এবং source-request ownership অপরিবর্তিত থাকবে।

## সিদ্ধান্ত ২ — Tutor Job Board apply behavior

### সুপারিশ: direct apply নয়; eligible Tutor-এর private “Express interest”

Job Board-এর কাজ হলো available tuition দেখানো; এটি Guardian contact directory নয়। Public user বা signed-in Tutor কেউই Guardian-এর phone, email, exact address, student identity অথবা private note পাবেন না। তাই “Call Guardian”, WhatsApp deep-link, Tutor-to-Guardian chat, অথবা public application list—সবই rejected alternative। এগুলো existing privacy promise ও Admin-mediated matching process ভেঙে দেবে। [1] [2]

পরবর্তী implementation-এ Tutor Dashboard থেকে একটি **Express interest** action যুক্ত করা যেতে পারে, তবে নিম্নের সীমারেখায়:

| নীতি | প্রয়োজনীয় আচরণ |
|---|---|
| Eligibility | শুধুমাত্র signed-in, active/verified Tutor profile action দেখতে ও submit করতে পারবেন |
| Data minimisation | `jobId`, `tutorId`, timestamp, optional concise availability note ও lifecycle status; Guardian PII নয় |
| Idempotency | একই Tutor একই active Job-এ একবারই interest দিতে পারবেন; repeated click duplicate row তৈরি করবে না |
| Routing | Interest কেবল Admin matching queue-তে যাবে; Guardian interest list দেখবেন না |
| Contact | Admin match decision এবং Guardian contact-consent ছাড়া phone/email release হবে না |
| Lifecycle | `submitted → under_review → shortlisted / declined / withdrawn / closed`; Job expiry বা unpublish হলে open interests closed হবে |
| Public visitors | “Sign in as Tutor to express interest” দেখাবে; public submission নয় |

এটি **automatic matching নয়**। Subject, class, distance/online preference এবং Tutor profile দেখে final selection Human Admin করবেন। এই design Tutor-এর real interest capture করে, কিন্তু Guardian-এর উপর unsolicited contact-এর চাপ দেয় না এবং platform-এর Manual Matching policy বজায় রাখে।

**বর্তমান gap:** `tutor_jobs` public projection ইচ্ছাকৃতভাবে application field বহন করে না এবং current card/detail surface-এ `View details` ও optional area-level direction ছাড়া কোনো apply action নেই। [1] [3] ফলে এই recommendation আলাদা schema, authorization, audit এবং UI ticket ছাড়া release করা যাবে না।

## সিদ্ধান্ত ৩ — Guardian Posted Jobs ও Attendance

### Posted Jobs: এখন implement করুন, কিন্তু private lifecycle view হিসেবে

Guardian-এর ইতিমধ্যে private request history আছে, যেখানে New, Reviewing, Matched এবং Closed status, submitted date, learning need, budget, approximate location, এবং match হওয়ার পরে consent decision দেখা যায়। [2] `Posted Jobs` tab-কে এর duplicate না বানিয়ে **request-to-publication lifecycle view** হিসেবে তৈরি করা উচিত।

প্রথম release-এর Posted Jobs view-এ Guardian কেবল নিজের request/job দেখতে পারবেন। প্রত্যেক row/card-এ request ID, published Job ID (যদি থাকে), private workflow status, public visibility (`Not published`, `Live`, `Expired`, `Unpublished`, `Closed`), published/expiry date, এবং clear next step থাকবে। Public listing-এর exact address বা contact details এখানেও অনাবশ্যক; Guardian তাঁদের নিজের accountে থাকলেও সেই data read-only neutral detail হিসেবে না দেখানোই ভালো। Guardian public Job edit করবেন না; পরিবর্তন বা closure-এর জন্য **Request an update / Contact coordinator** action থাকবে, কারণ Admin verification এবং Guardian reconfirmation বর্তমান control boundary।

| Posted Jobs v1 | অন্তর্ভুক্ত | বাদ |
|---|---|---|
| Ownership | authenticated Guardian-এর নিজের request/job only | অন্য Guardian-এর job বা public moderation queue |
| Lifecycle | request, review, publish, expire, unpublish, close | self-service publish/edit |
| Transparency | Job ID, visibility, dates, Admin-coordinated next step | Tutor applicant identity/contacts |
| Privacy | public-safe listing summary link (যদি live) | exact address, Guardian contact, student private notes |

### Attendance: defer করুন; placeholder সত্যভিত্তিক রাখুন

Attendance একটি simple UI tab নয়। এটি চালু করার আগে চারটি unresolved domain contract দরকার: (১) কোন confirmed Tutor–Guardian pairing attendance-এর অধিকার দেয়, (২) কে উপস্থিতি mark করবেন, (৩) Guardian কখন verify/dispute করবেন, এবং (৪) cancellation, make-up class ও historical correction কিভাবে audit হবে। এখনকার database ও workflow-এ confirmed teaching assignment বা session record নেই; Guardian history-র post-match step শুধু contact-coordination consent। [2] তাই এই মুহূর্তে Attendance implementation করলে বাস্তব learning activity-এর বদলে অনুমানভিত্তিক data দেখাবে।

> **প্রস্তাবিত v1 posture:** Attendance tab-এ “Attendance becomes available after a confirmed tutor placement” লিখে truthful placeholder রাখুন। কোনো count, percentage, sample class বা demo attendance hardcode করা যাবে না।

Attendance-এর ভবিষ্যৎ specification-এ অন্তত `tutor_assignment`, `teaching_session`, `attendance_record`, `guardian_confirmation/dispute`, immutable audit log, timezone policy এবং access-control matrix থাকতে হবে। Tutor interest feature, Admin match confirmation এবং Guardian contact coordination-এর পরে এটি নকশা করা নিরাপদ।

## Approval set এবং পরবর্তী tickets

নিচের তিনটি সিদ্ধান্তের approval পেলেই implementation scope অস্পষ্টতা ছাড়া এগোবে।

| অনুমোদন | প্রস্তাবিত decision | পরবর্তী implementation work |
|---|---|---|
| D-01 | ৩০ দিন expiry; Admin early close; reconfirmed re-publish | Optional reminder/reporting ticket, কোনো v1 policy change প্রয়োজন নেই |
| D-02 | Verified Tutor-only Express interest; Admin-mediated matching; direct contact নিষিদ্ধ | Job interest schema, private APIs, Admin queue, Tutor UI, lifecycle/audit tests |
| D-03 | Posted Jobs v1 private lifecycle view; Attendance deferred with truthful placeholder | Guardian-owned job query/UI ticket; Attendance specification পরে |

## References

[1]: ../server/job-board-projection.ts "Published Job Board projection contract"
[2]: ../client/src/pages/GuardianRequestTracking.tsx "Guardian private request tracking implementation"
[3]: ../client/src/pages/JobBoard.tsx "Current public and Tutor Job Board UI"
