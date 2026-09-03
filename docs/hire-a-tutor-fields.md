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

## ধাপ ৩ — Confirmation

লেখার কোনো ঘর নেই। টিউটর প্রোফাইলের **View Profile** প্রিভিউয়ের ধাঁচে — দুটি কার্ড,
গ্রুপ শিরোনাম, দাগ-টানা `লেবেল | মান` সারি।

**রিকোয়েস্ট পাঠানো হয় ধাপ ২ থেকে** — ধাপ ২-এর প্রধান বোতামই **Send request**
(সম্পাদনার সময় **Save changes**)। তাই ধাপ ৩-এ পৌঁছানো মানে রিকোয়েস্ট ইতিমধ্যে জমা
পড়েছে, আর ধাপ ৩ সেটাই ফিরে দেখায় — রসিদ নয়, রিকোয়েস্ট নিজেই।

ধাপ ৩-এ জার্নির নিজের কোনো বোতাম নেই (Back / Continue / Send কিছুই না), শুধু দুটি
পরবর্তী পদক্ষেপ:

- উপরে বাঁয়ে: **Request received securely**, শিরোনাম, আর **Job ID** (রিকোয়েস্ট ১ = জব ৬৮০০)
- উপরে ডানে: **+ Post another request** → জার্নিটা খালি ধাপ ১-এ ফেরে (উত্তরগুলো মুছে দেয়,
  ঠিকানা বদলায় না)
- নিচে মাঝখানে: **View my request** → Posted jobs ট্যাব

যেহেতু ধাপ ৩ আর পাঠানোর আগের রিভিউ নয়, প্রতিটি কার্ডের **Edit learning needs** /
**Edit tuition preferences** লিংক দুটি আর নেই — সংশোধন করতে হলে ধাপ ২-এর **Back**
দিয়ে ফিরতে হয়, পাঠানোর আগেই।

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

## কোথায় খোলে

`/guardian/dashboard/hire` ঠিকানায় তিনটি ধাপ একটি **শিটে** খোলে — মোবাইলে নিচ থেকে ওঠে,
`sm` থেকে বড় পর্দায় মাঝখানে বসা ডায়ালগ। পেছনে **Posted jobs** তালিকাটাই থাকে, তাই
শিট বন্ধ করলে গার্ডিয়ান ঠিক সেই তালিকাতেই নামে যেখানে নতুন রিকোয়েস্টটা গিয়ে বসবে।

- বন্ধ হয়: Escape, উপরের ডানের ✕, বা পেছনের ছায়ায় ক্লিক
- **বন্ধ করলে খসড়া মুছে না** — জার্নি টাইপ করার সাথে সাথেই session storage-এ লেখে,
  তাই মাঝপথে বন্ধ করা শিট আবার খুললে যেখানে ছিল সেখানেই থাকে
- শিটের নিজের কোনো বাটন নেই (✕ ছাড়া) — Back / Continue / Send request জার্নিরই

---

## পাঠানোর পরের পাতা

আলাদা কোনো পাতা নেই — পাঠানোর পরের পর্দাই **ধাপ ৩**। আগে রিভিউ আর নিশ্চিতকরণ দুটো
আলাদা পর্দা ছিল, দুটোই একই সারিগুলো দেখাত; এখন একটাই, `buildGuardianRequestSummary()`
থেকে সারি নেয়। শিটের ভিতরে ফর্ম আর নিশ্চিতকরণ একই ঠিকানায় বসে, তাই পাঠানোর পর
কোথাও নেভিগেট না করে জার্নি ধাপ ৩-এ নামে — শিট খোলা থাকে, পেছনের Posted jobs
তালিকা শুধু refetch করে।

---

## নাম ও গোপনীয়তা

স্যালারির ঘরটা এখন সব পর্দায় **Salary** — গার্ডিয়ান ট্র্যাকিং, এডমিনের দুই পর্দা, টিউটর ড্যাশবোর্ড,
জব বোর্ডের কার্ড ও Details, আর ধাপ ৩-এর নিশ্চিতকরণ। শুধু ধাপ ২-এর ফর্ম লেবেল **Monthly salary**,
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
