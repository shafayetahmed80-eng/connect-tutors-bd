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
| 5 | Institute Name | লেখার ঘর, প্লেসহোল্ডার `Ex. Dhaka College`, 🏫 আইকন | — |
| 6 | Where Did You Hear About Us | ড্রপডাউন — Friends & Family / Facebook / Websites / Others, বাছাই অনুযায়ী আইকন বদলায় | ✅ |
| 7 | Preferred Tutor gender | ড্রপডাউন — Any / Female / Male | ✅ |
| 8 | Monthly salary | সংখ্যা, প্লেসহোল্ডার `Ex - 5,000` | ✅ |
| 9 | Additional notes | বড় লেখার ঘর | — |

**শর্তসাপেক্ষ:**

- **Maximum students** শুধু **Group Tutoring**-এ।
- **Package duration (months)** শুধু **Package Tutoring**-এ।
- **Number of students** বাকি ধরনগুলোতে।

---

## ধাপ ৩ — Review & submit

লেখার কোনো ঘর নেই। টিউটর প্রোফাইলের **View Profile** প্রিভিউয়ের ধাঁচে — দুটি কার্ড,
গ্রুপ শিরোনাম, দাগ-টানা `লেবেল | মান` সারি। প্রতিটি কার্ডের ডানে সম্পাদনার লিংক
(**Edit learning needs**, **Edit tuition preferences**)। ধাপের নাম স্টেপ ট্র্যাকারেই আছে,
তাই আলাদা "Review your request" শিরোনাম নেই।

ঐচ্ছিক ঘর খালি থাকলে সারিটা লুকায় না — ধূসর **Not set** দেখায়, যাতে বোঝা যায়
প্রশ্নটা করা হয়েছিল, উত্তর দেওয়া হয়নি।

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
| 13 | Institute Name | ধাপ ২ |
| 14 | Where Did You Hear About Us | ধাপ ২ |
| 15 | Preferred Tutor gender | ধাপ ২ |
| 16 | Salary | ধাপ ২ · Monthly salary |
| 17 | Additional notes | ধাপ ২ |

---

## পাঠানোর পরের পাতা

Send request চাপার পর পুরো রিকোয়েস্টটাই একই রেকর্ড-ধাঁচে ফিরে দেখায় — রসিদ নয়, রিকোয়েস্ট নিজেই।

- উপরে বাঁয়ে: **Request received securely**, শিরোনাম, আর **Job ID** (রিকোয়েস্ট ১ = জব ৬৮০০)
- উপরে ডানে: **+ Post another request** → হায়ার টিউটরের ধাপ ১
- নিচে মাঝখানে: **View my request** → Posted jobs ট্যাব

সারিগুলো ধাপ ৩-এর রিভিউয়ের সাথে হুবহু এক — দুই পর্দা একই
 থেকে সারি নেয়, তাই আলাদা হয়ে যাওয়ার সুযোগ নেই।

---

## নাম ও গোপনীয়তা

স্যালারির ঘরটা এখন সব পর্দায় **Salary** — গার্ডিয়ান ট্র্যাকিং, এডমিনের দুই পর্দা, টিউটর ড্যাশবোর্ড,
জব বোর্ডের কার্ড ও Details, আর ধাপ ৩-এর রিভিউ। শুধু ধাপ ২-এর ফর্ম লেবেল **Monthly salary**,
কারণ ওখানেই বলা দরকার টাকাটা কত দিন পরপর।

**Institute Name** আর **Where Did You Hear About Us** জব বোর্ডে যায় না — গার্ডিয়ান, এডমিন আর
সংরক্ষিত রেকর্ডেই সীমাবদ্ধ। রেফারেলের উত্তরটা আমাদের গোনার জিনিস, টিউটরের পড়ার নয়; আর ছাত্রের
প্রতিষ্ঠানের নাম শহর ও এলাকার পাশে বসলে ঠিকানা আন্দাজ করা সহজ হয়ে যায়। এটা
`server/job-board-projection.test.ts`-এ টেস্ট দিয়ে বাঁধা।

---

## স্থাপনার সময় যা লাগবে

`npm run db:migrate` — মাইগ্রেশন `0057_request_institute_source.sql` দুটি কলাম যোগ করে
(`instituteName`, `heardAboutUs`), দুটোই nullable, কারণ আগের রিকোয়েস্টগুলোকে প্রশ্নই করা হয়নি।
`0051`–`0057` এখনো শুধু স্থানীয়ভাবে চলেছে।
