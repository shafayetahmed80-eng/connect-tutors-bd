# Tutor Profile Field List — Mandatory `*` and `Optional` Labels

**Status:** Approved Tutor Profile scope implemented. The field inventory records the applied UI, schema, and validation decisions; Admin-panel requirement controls remain out of scope. **Label rule:** `*` means the field must be completed before **Submit for Review**. `Optional` means the Tutor may save the profile without it. Draft saving remains available while required professional information is incomplete.

> **Conditional ****`*`****:** A field is mandatory only when its stated condition applies. For example, Online/Both tuition requires nationwide availability, and a currently studying education record does not require an end date or passing year.

## A. Profile identity and contact

| Field label in the form | Requirement | Guardian CV / public visibility |
| --- | --- | --- |
| Profile Photo * — প্রোফাইল ছবি | Mandatory | Guardian CV may show it; existing public policy remains separate. |
| Full Name * — পূর্ণ নাম | Mandatory | Guardian CV may show it. |
| Gender * — লিঙ্গ | Mandatory | Guardian CV may show it where matching requires it. |
| Date of Birth * — জন্মতারিখ | Mandatory | Not shown as an exact date in Guardian CV. |
| Professional Headline * — পেশাগত শিরোনাম | Mandatory | Guardian CV may show it. |
| Primary Phone Number * — প্রধান ফোন নম্বর | Mandatory | Private: Tutor and Admin only. |
| Contact Email * — যোগাযোগের ইমেইল | Mandatory | Private: Tutor and Admin only. |
| Additional Phone Number — Optional | Optional | Private: Tutor and Admin only. |
| Present Address * — বর্তমান ঠিকানা | Mandatory | Private: Tutor and Admin only. Exact address is never part of Guardian CV. |
| Permanent Address * — স্থায়ী ঠিকানা | Mandatory | Private: Tutor and Admin only. |
| Nationality * — জাতীয়তা | Mandatory | Private: Tutor and Admin only. |
| Religion * — ধর্ম | Mandatory | Private: Tutor and Admin only. |
| National ID (NID) * — জাতীয় পরিচয়পত্র | Mandatory in approved scope | Private: Tutor and Admin only. **Blocked from activation until encrypted server-side storage and retention/access rules are implemented.** |
| Social Profile Links — Optional | Optional | Private: Tutor and Admin only. |

## B. Family and emergency information

| Field label in the form | Requirement | Guardian CV / public visibility |
| --- | --- | --- |
| Father’s Name * — পিতার নাম | Mandatory | Private: Tutor and Admin only. |
| Father’s Phone Number * — পিতার ফোন নম্বর | Mandatory | Private: Tutor and Admin only. |
| Mother’s Name — Optional | Optional | Private: Tutor and Admin only. |
| Mother’s Phone Number — Optional | Optional | Private: Tutor and Admin only. |
| Guardian’s Name | **Removed in the uploaded field-scope workbook** | Not included in the Tutor Profile. |
| Guardian’s Phone Number | **Removed in the uploaded field-scope workbook** | Not included in the Tutor Profile. |
| Emergency Contact Name — Optional | Optional | Private: Tutor and Admin only. |
| Emergency Contact Relation — Optional | Optional | Private: Tutor and Admin only. |
| Emergency Contact Phone Number — Optional | Optional | Private: Tutor and Admin only. |
| Emergency Contact Address — Optional | Optional | Private: Tutor and Admin only. |

## C. Current education and qualification history

| Field label in the form | Requirement | Guardian CV / public visibility |
| --- | --- | --- |
| University / Institute * — বিশ্ববিদ্যালয় বা প্রতিষ্ঠান | Mandatory | Guardian CV may show the professional institution summary. |
| Faculty / School * — ফ্যাকাল্টি বা স্কুল | Mandatory | Guardian CV may show it. |
| Department / Subject * — বিভাগ বা বিষয় | Mandatory | Guardian CV may show it. |
| Degree / Major | **Removed in the uploaded field-scope workbook** | Not included in the Tutor Profile. |
| Study Status * — অধ্যয়নের অবস্থা | Mandatory | Guardian CV may show it. |
| Qualification Level * — শিক্ষাগত স্তর | Mandatory for each education record | Guardian CV may show it. |
| Institute Name * — প্রতিষ্ঠানের নাম | Mandatory for each education record | Guardian CV may show it. |
| Degree / Exam Title * — ডিগ্রি বা পরীক্ষার নাম | Mandatory for each education record | Guardian CV may show it. |
| Major / Group * — বিষয় বা গ্রুপ | Mandatory for each education record | Guardian CV may show it. |
| Result / GPA — Optional | Optional | Guardian CV may show it if provided. |
| Curriculum — Optional | Optional | Guardian CV may show it if provided. |
| Study Start Date * — অধ্যয়ন শুরুর তারিখ | Mandatory for each education record | Guardian CV shows a safe year/range summary only. |
| Study End Date * — অধ্যয়ন শেষের তারিখ | Mandatory unless **Currently Studying** is selected | Guardian CV shows a safe year/range summary only. |
| Passing Year * — পাশের বছর | Mandatory unless **Currently Studying** is selected | Guardian CV may show it. |
| Currently Studying * — বর্তমানে অধ্যয়নরত | Mandatory selection for each education record | Guardian CV may show the current-status summary. |
| Institute ID Card Number — Optional | Optional | Private: Tutor and Admin only. |

**Education record rule:** At least **one completed education record** is mandatory to submit the overall profile. A Tutor may add several qualifications such as SSC, HSC, Bachelor/Honours, Masters, or professional certification.

## D. Teaching expertise and learner fit

| Field label in the form | Requirement | Guardian CV / public visibility |
| --- | --- | --- |
| Primary Subjects * — প্রধান বিষয়সমূহ | Mandatory | Guardian CV may show it. |
| Additional Subjects — Optional | Optional | Guardian CV may show it. |
| Class Levels * — শ্রেণি/লেভেল | Mandatory multi-select: Play, Nursery, KG, Class 1–5, Class 6–8, SSC, HSC, O Levels, A Levels | Guardian CV may show it. |
| Curriculum * — কারিকুলাম | Mandatory | Guardian CV may show it. |
| Teaching Experience (Years) * — অভিজ্ঞতার বছর | Mandatory | Guardian CV may show it. |
| Prior Teaching Experience Details — Optional | Optional | Guardian CV may show a safe professional summary. |
| Student Types * — পছন্দের শিক্ষার্থী ধরন | Mandatory | Guardian CV may show it where relevant to matching. |
| Special Expertise — Optional | Optional | Guardian CV may show it. |
| Academic Achievement — Optional | Optional | Guardian CV may show it. |
| Teaching Languages * — পড়ানোর ভাষা | Mandatory | Guardian CV may show it. |

## E. Tuition preference, place, availability, and fee

| Field label in the form | Requirement | Guardian CV / public visibility |
| --- | --- | --- |
| Current City / Location * — বর্তমান শহর বা অবস্থান | Mandatory | Guardian CV shows a general location only, never an exact address. |
| Teaching Areas * — পড়ানোর এলাকা | Mandatory | Guardian CV may show general service areas. |
| Available Nationwide * — দেশব্যাপী উপলভ্যতা | Mandatory selection; must be **Yes** for Online or Both tuition | Guardian CV may show it. |
| Tuition Type * — টিউশন ধরন | Mandatory | Guardian CV may show it. |
| Teaching Method * — পড়ানোর পদ্ধতি | Mandatory | Guardian CV may show it. |
| Tuition Place / Style * — টিউশনের স্থান বা ধরন | Mandatory | Guardian CV may show it. |
| Preferred Student Gender * — পছন্দের শিক্ষার্থীর লিঙ্গ | Mandatory | Guardian CV may show it where matching needs it. |
| Preferred Class Size * — পছন্দের ক্লাস সাইজ | Mandatory | Guardian CV may show it. |
| Preferred Teaching Days * — পছন্দের পড়ানোর দিন | Mandatory | Guardian CV may show it. |
| Preferred Time Category * — পছন্দের সময়সীমা | Mandatory | Guardian CV may show it. |
| Weekly Availability Slot(s) * — সাপ্তাহিক নির্দিষ্ট সময় | Mandatory; at least one valid time slot | Guardian CV may show it. |
| Minimum Monthly Fee * — সর্বনিম্ন মাসিক পারিশ্রমিক | Mandatory | Guardian CV may show the fee range. |
| Maximum Monthly Fee * — সর্বোচ্চ মাসিক পারিশ্রমিক | Mandatory | Guardian CV may show the fee range. |
| Travel Distance — Optional | Optional | Guardian CV may show a broad service-distance summary if approved for display. |
| Tuition Experience Details — Optional | Optional | Guardian CV may show a safe professional summary. |

## F. Communication and professional introduction

| Field label in the form | Requirement | Guardian CV / public visibility |
| --- | --- | --- |
| Communication Preference * — যোগাযোগের পছন্দ | Mandatory | The preference may guide the platform; it does not reveal the actual phone/email. |
| About Me — Optional | Optional | Guardian CV may show it after privacy-safe moderation. |
| Teaching Approach — Optional | Optional | Guardian CV may show it. |
| Why Choose Me — Optional | Optional | Guardian CV may show it. |
| Additional Notes — Optional | Optional | Private by default; it must not be automatically copied to the Guardian CV. |

## G. University ID verification

| Field label in the form | Requirement | Guardian CV / public visibility |
| --- | --- | --- |
| University ID Image * — বিশ্ববিদ্যালয়ের আইডি ছবি | Mandatory before profile review submission | Private: Tutor and Admin only. |
| Document Review Status | System-generated | Guardian CV never receives document data or a file URL. |
| Admin Review Reason | System-generated | Private: Tutor and Admin only. |

## H. System-generated information

These values are not Tutor-entry fields, so they do not receive a mandatory/optional form label.

| System value | Purpose | Guardian CV / public visibility |
| --- | --- | --- |
| Tutor ID | Automatically generated profile identifier | Guardian CV may show it. |
| Profile Completion Percentage | Derived from mandatory professional profile units only | Tutor/Admin see it; Guardian CV does not need to show it. |
| Profile Status | Draft, pending, changes requested, approved, or suspended | Tutor/Admin see full status; Guardian exposure follows approved-profile rules only. |
| Verified Status | Set only after profile approval and an approved University ID | Guardian CV may show a verified badge when true. |
| Profile Creation / Update Date | Automatically recorded timestamp | Tutor/Admin only unless a later product decision adds a safe display format. |

## Labeling rules for the future UI

Every editable field label must use exactly one visible marker: an asterisk such as **`Full Name *`** for required information, or the word **`Optional`** such as **`Additional Phone Number — Optional`** for non-required information. A mandatory field must also have programmatic required semantics and server-side validation; a visual star alone is not sufficient. Conditional requirements must show the condition in helper text, for example: **`Study End Date *`** with “Required unless Currently Studying is selected.”

Private fields must carry a short disclosure, such as **“Visible to you and Admin only.”** This label informs the Tutor but never changes the server-side authorization boundary.
