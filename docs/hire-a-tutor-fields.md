# Hire a tutor — ধাপভিত্তিক লেবেল তালিকা

গার্ডিয়ান প্যানেলের **Hire a tutor** (`/guardian/dashboard/hire`) ফর্মে তিনটি ধাপে যত ঘর আছে,
ধাপ অনুযায়ী সাজানো। `*` মানে আবশ্যক।

উৎস: [`client/src/pages/GuardianRequestJourney.tsx`](../client/src/pages/GuardianRequestJourney.tsx)

---

## ধাপ ১ — Learning needs

| # | লেবেল | ধরন | আবশ্যক |
|---|---|---|---|
| 1 | Tuition type | ড্রপডাউন — Home / Online / Group / Package Tutoring | ✅ |
| 2 | Tuition City | খোঁজা যায় এমন তালিকা | ✅ |
| 3 | Location | খোঁজা যায় এমন তালিকা | ✅ |
| 4 | Curriculum / category | ড্রপডাউন | ✅ |
| 5 | Curriculum Type | ড্রপডাউন | ✅ |
| 6 | Class / level | ড্রপডাউন | ✅ |
| 7 | Student gender | ড্রপডাউন | — |
| 8 | Address Details | বড় লেখার ঘর | — |
| 9 | Subject selection | বাছাইয়ের বোতাম, সর্বোচ্চ ১২টি | ✅ |

**শর্তসাপেক্ষ:** Tuition type **Online** হলে Tuition City আর Location দেখানো হয় না — অনলাইনে ঠিকানা লাগে না।

---

## ধাপ ২ — Tuition preferences

| # | লেবেল | ধরন | আবশ্যক |
|---|---|---|---|
| 1 | Number of students | সংখ্যা, ১–১০০ | ✅ |
| 2 | Maximum students | সংখ্যা, ২–১০০ | ✅ |
| 3 | Package duration (months) | সংখ্যা, ১–২৪ | ✅ |
| 4 | Days per week | ড্রপডাউন | ✅ |
| 5 | Preferred Tutor gender | ড্রপডাউন — Any / Female / Male | ✅ |
| 6 | Monthly salary | সংখ্যা, প্লেসহোল্ডার `Ex - 5,000` | ✅ |
| 7 | Additional notes | বড় লেখার ঘর | — |

**শর্তসাপেক্ষ:**

- **Maximum students** শুধু **Group Tutoring**-এ।
- **Package duration (months)** শুধু **Package Tutoring**-এ।
- **Number of students** বাকি ধরনগুলোতে।

---

## ধাপ ৩ — Review & submit

লেখার কোনো ঘর নেই — যা ভরা হয়েছে তা একবার দেখে নেওয়ার পাতা। উপরে শিরোনাম
**Review your request**, আর দুটি সম্পাদনার লিংক: **Edit learning needs**, **Edit tuition preferences**।

দেখানো সারিগুলো:

| # | সারি | কোন ধাপ থেকে |
|---|---|---|
| 1 | Category | ধাপ ১ · Curriculum / category |
| 2 | Curriculum Type | ধাপ ১ |
| 3 | Class / level | ধাপ ১ |
| 4 | Subjects | ধাপ ১ · Subject selection |
| 5 | Student gender | ধাপ ১ |
| 6 | Address Details | ধাপ ১ |
| 7 | Tuition type | ধাপ ১ |
| 8 | Maximum students | ধাপ ২ · Group-এ |
| 9 | Number of students | ধাপ ২ · বাকিগুলোতে |
| 10 | Package duration | ধাপ ২ · Package-এ |
| 11 | Location | ধাপ ১ · Tuition City + Location |
| 12 | Days per week | ধাপ ২ |
| 13 | Preferred Tutor gender | ধাপ ২ |
| 14 | Monthly salary | ধাপ ২ |
| 15 | Additional notes | ধাপ ২ |

---

## নামের অসংগতি — এখনো যা আছে

ধাপ ২-এর **Monthly salary** ধাপ ৩-এর রিভিউতে **Budget** লেখা ছিল; সেটি ঠিক করা হয়েছে —
এখন দুই জায়গাতেই **Monthly salary**।

একই সংখ্যাটি আরও যে যে পর্দায় অন্য নামে আছে (বদলানো হয়নি, বললে করে দেওয়া যাবে):

| পর্দা | এখন লেখা | ফাইল |
|---|---|---|
| গার্ডিয়ানের Posted jobs — রিকোয়েস্টের বিস্তারিত | Budget | `client/src/pages/GuardianRequestTracking.tsx` |
| এডমিন — Guardian activity | Budget | `client/src/pages/AdminGuardianActivity.tsx` |
| এডমিন — Matching workspace | Budget | `client/src/pages/AdminMatchingWorkspace.tsx` |
| টিউটর ড্যাশবোর্ড | Budget | `client/src/pages/TutorDashboard.tsx` |
| জব বোর্ডের কার্ড ও Details | Salary | `shared/job-card.ts` |

**Curriculum / category** আর **Curriculum Type** আলাদা দুটি ঘর — এটি অসংগতি নয়, ইচ্ছাকৃত।
