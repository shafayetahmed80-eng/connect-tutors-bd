# Connect Tutors — Mobile OTP ও Email Verification সেটআপ গাইড

**তারিখ:** ২৪ সেপ্টেম্বর ২০২৬
**অবস্থা:** এখনো বানানো হয়নি। এই গাইড অনুযায়ী আপনার দিকের সেটআপ শেষ হলে কোড দুই ধাপে বানানো হবে।

> এই গাইড পুরনো `MOBILE_OTP_RBAC_FLOW_AND_CODE_STRUCTURE_BN.md`-এর জায়গা নেয়। ওই ফাইলের প্রস্তাব ছিল password বাদ দিয়ে শুধু OTP দিয়ে লগইন। এখনকার সাইটে লগইন **email বা mobile + password** দিয়েই থাকবে। OTP আর email যাচাই শুধু নিচের কাজগুলোর জন্য ব্যবহার হবে।

---

## ১. কোথায় কাজে লাগবে

| জায়গা | এখন যা হয় | OTP/Email যাচাইয়ের পর |
|---|---|---|
| Tutor রেজিস্ট্রেশন (`/become-tutor`) | নম্বর যাচাই ছাড়াই account তৈরি হয় | নম্বরে ৬ অঙ্কের কোড যাবে; কোড মিললে তবেই account তৈরি |
| Guardian যাত্রার ফোন ধাপ (`/request-tutor`) | "Continue securely" চাপলেই পরের ধাপ | নম্বরে কোড যাবে; কোড মিললে account ধাপে যাবে |
| Password ভুলে গেলে | WhatsApp-এ জানালে Admin reset লিংক পাঠান (#221) | Sign in পেজে "Forgot password?" থেকে নিজে নিজেই mobile-এ কোড বা email-এ লিংক। Admin-এর লিংক ব্যাকআপ হিসেবে থাকবে |
| Email যাচাই | কোনো যাচাই নেই | রেজিস্ট্রেশনের পর email-এ একবার-ব্যবহারযোগ্য লিংক। Account settings-এ email বদলালে নতুন email আবার যাচাই |

---

## ২. আপনার করণীয় (কোড ছাড়া)

### ক. SMS provider নেওয়া

বাংলাদেশে A2P SMS (ওয়েবসাইট থেকে পাঠানো SMS) শুধু **BTRC-লাইসেন্সপ্রাপ্ত aggregator**-এর মাধ্যমে পাঠানো যায়। বিদেশি সার্ভিস (যেমন Twilio) দিয়ে পাঠালে খরচ অনেক বেশি আর delivery অনিশ্চিত।

1. একটা provider বেছে নিন। উদাহরণ: [BulkSMSBD](https://bulksmsbd.com/), [MiMSMS](https://www.mimsms.com/), [sms.bd](https://sms.bd/), [ZAMAN IT](https://zaman-it.com/sms/)। বাছাইয়ের সময় দেখবেন:
   - **HTTP API আছে** (API key দিয়ে একটা URL-এ নম্বর আর লেখা পাঠালে SMS যায়)
   - **Delivery report** দেখা যায়
   - টাকা **bKash/Nagad-এ recharge** করা যায়
   - Balance শেষ হওয়ার আগে সতর্কবার্তা দেয়
2. **দাম (আনুমানিক, provider-এর সাথে মিলিয়ে নেবেন):** non-masking OTP প্রতি SMS প্রায় **০.২৫–০.৩৫ টাকা**। Masking একটু বেশি।
3. **Non-masking দিয়ে শুরু করুন।** SMS একটা সাধারণ নম্বর থেকে যাবে, কাগজপত্র কম লাগে, সাথে সাথে চালু হয়।
4. **পরে masking (নিজের নামে sender):**
   - নাম সর্বোচ্চ **১১ অক্ষর**, শুধু A-Z আর 0-9। যেমন `ConnectTutr`।
   - Provider-এর মাধ্যমে অপারেটরদের কাছে নিবন্ধন হয়। সাধারণত ৩–৭ কর্মদিবস লাগে। ট্রেড লাইসেন্স বা NID চাইতে পারে।
5. Provider-এর dashboard থেকে এই তিনটা জিনিস নিন:
   - **API key** (বা username/password)
   - **Sender ID** (non-masking হলে provider যে নম্বর দেয়)
   - **API-র ঠিকানা আর ডকুমেন্টেশনের লিংক** (আমাকে দেবেন, সেই অনুযায়ী কোড বসাব)
6. Provider যদি **IP whitelist** চায়, তাহলে আপনার cPanel সার্ভারের IP দিন (hosting provider থেকে জানা যাবে)।
7. Dashboard থেকে নিজের নম্বরে একটা **test SMS** পাঠিয়ে দেখুন।

**OTP বার্তার ধরন** (নিয়ম অনুযায়ী ব্র্যান্ডের নাম থাকতে হবে):

```
Connect Tutors code: 482913. Valid for 5 minutes. Do not share it with anyone.
```

ইংরেজি বার্তা এক SMS-এ ১৬০ অক্ষর পর্যন্ত যায়। বাংলা (Unicode) বার্তায় যায় মাত্র ৭০ অক্ষর, তাই দুই-তিন SMS-এর খরচ হতে পারে। OTP-র জন্য ছোট ইংরেজি বার্তাই সস্তা।

### খ. Email পাঠানোর সার্ভিস নেওয়া

| বিকল্প | খরচ | সুবিধা | অসুবিধা |
|---|---|---|---|
| **Brevo** (প্রস্তাবিত শুরু) | দিনে ৩০০ email ফ্রি, সবসময় | ফ্রি সীমা সবচেয়ে বেশি, সহজ dashboard | বেশি পাঠালে প্ল্যান কিনতে হবে |
| **Resend** | মাসে ৩,০০০ ফ্রি | ডেভেলপারদের জন্য সহজ | মাসিক সীমা কম |
| **Amazon SES** | প্রতি ১,০০০ email-এ প্রায় $0.10 | অনেক বেশি পাঠালে সবচেয়ে সস্তা | চালু করা ঝামেলার (sandbox থেকে বের হওয়ার আবেদন লাগে) |
| **cPanel-এর নিজের mailbox (SMTP)** | hosting-এর সাথে ফ্রি | আলাদা অ্যাকাউন্ট লাগে না | Gmail-এ spam-এ যাওয়ার সম্ভাবনা বেশি |

ধাপগুলো:
1. **Brevo**-তে অ্যাকাউন্ট খুলুন। Sender হিসেবে `no-reply@connecttutorsbd.com` যোগ করুন।
2. **Domain যাচাই (সবচেয়ে জরুরি):** Brevo তিনটা DNS রেকর্ড দেবে: **SPF**, **DKIM**, **DMARC**। এগুলো cPanel → **Zone Editor**-এ (বা যেখানে domain-এর DNS আছে) বসান। না বসালে email spam-এ যাবে।
3. Brevo থেকে **SMTP তথ্য** নিন (host, port 587, login, SMTP key), অথবা **API key**।
4. নিজের Gmail-এ একটা test email পাঠিয়ে দেখুন: Inbox-এ গেছে কিনা, spam-এ নয়।

### গ. `.env`-এ যা বসাতে হবে

Localhost-এ রিপোর `.env` ফাইলে বসাবেন। Live সাইটে বসাবেন cPanel → **Setup Node.js App** → **Environment Variables**-এ। `.env` কখনো git-এ commit হবে না।

```
# SMS
SMS_API_URL=            # provider-এর API ঠিকানা
SMS_API_KEY=            # provider-এর API key
SMS_SENDER_ID=          # non-masking নম্বর বা masking নাম

# Email (Brevo SMTP উদাহরণ)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=              # Brevo login
SMTP_PASS=              # Brevo SMTP key
EMAIL_FROM="Connect Tutors <no-reply@connecttutorsbd.com>"

# লিংকে যে ঠিকানা বসবে
APP_BASE_URL=https://connecttutorsbd.com

# শুধু localhost-এ: কোড SMS-এ না গিয়ে terminal-এ দেখাবে, খরচ হবে না
OTP_DEV_LOG=true
```

> **সতর্কতা:** live সাইটে `OTP_DEV_LOG` কখনো বসাবেন না।

---

## ৩. কোড কীভাবে বানানো হবে (আমার কাজ)

### ধাপ ১: ভিত্তি
- **`server/sms.ts`**: `sendSms(নম্বর, লেখা)`। আপনার provider-এর API অনুযায়ী বানানো হবে। `OTP_DEV_LOG` থাকলে শুধু terminal-এ দেখাবে।
- **`server/mailer.ts`**: `sendEmail(to, subject, লেখা)`। SMTP বা provider API দিয়ে পাঠাবে।
- **নতুন টেবিল `verification_codes`**:
  - কোন নম্বরে পাঠানো হয়েছে
  - কাজের ধরন (নম্বর যাচাই / password reset)
  - কোডের hash (কোড নিজে database-এ থাকবে না)
  - মেয়াদ **৫ মিনিট**
  - কতবার ভুল কোড দেওয়া হয়েছে
  - ব্যবহার হয়েছে কিনা
- **নতুন টেবিল `email_verifications`**: একবার-ব্যবহারযোগ্য লিংক, মেয়াদ ২৪ ঘণ্টা। #221-এর reset লিংকের মতোই ব্যবস্থা।
- **`users` টেবিলে দুটো নতুন ঘর:** `phoneVerifiedAt`, `emailVerifiedAt`।
- **নিয়ম:**
  - কোড ৬ অঙ্কের, নিরাপদ random
  - একটা কোডে ৫ বার ভুল দিলে কোড বাতিল
  - নতুন কোড চাওয়া যাবে ৬০ সেকেন্ড পরপর
  - এক নম্বরে ঘণ্টায় সর্বোচ্চ ৫টা SMS, এক IP থেকেও সীমা থাকবে
  - শুধু বাংলাদেশি নম্বরে (`+8801[3-9]…`) SMS যাবে। এতে বিদেশি নম্বরে SMS পাঠিয়ে টাকা নষ্ট করানোর জালিয়াতি ঠেকানো যাবে।
- **Admin → Sign-in report**-এ নতুন কলাম: OTP পাঠানো, সফল, ব্যর্থ, email যাচাই।

### ধাপ ২: ব্যবহারকারীর দিক
1. **Tutor রেজিস্ট্রেশন:** ফর্ম জমা দিলে কোড চাওয়ার ঘর আসবে। কোড মিললে তবেই account তৈরি হবে।
2. **Guardian ফোন ধাপ:** "Continue securely" চাপলে কোড যাবে। কোড মিললে account ধাপে যাবে, যেখানে নম্বর আগের মতোই শুধু দেখার জন্য থাকবে।
3. **Forgot password:**
   - Sign in পেজে "Forgot password?" থাকবে।
   - ব্যবহারকারী email বা mobile দেবেন।
   - Mobile দিলে কোড যাবে, email দিলে লিংক যাবে। তারপর #221-এর `/reset-password` পাতায় নতুন password দেবেন।
   - কোনো account থাকুক বা না থাকুক, উত্তর সবসময় একই রকম হবে। এতে বাইরের কেউ বুঝতে পারবে না কোন নম্বরের account আছে।
4. **Email যাচাই:**
   - রেজিস্ট্রেশনের পর email-এ লিংক যাবে।
   - ড্যাশবোর্ডে "Verify email" বোতাম থাকবে, আবার পাঠানোর সুযোগসহ।
   - Account settings-এ email বদলালে নতুন email যাচাই না হওয়া পর্যন্ত পুরনোটাই চালু থাকবে।

---

## ৪. খরচের আনুমানিক হিসাব

| প্রতি মাসে | SMS | খরচ (০.৩০ টাকা/SMS ধরে) |
|---|---|---|
| ৫০০ নতুন Tutor + ৫০০ নতুন Guardian | ~১,২০০ (কিছু আবার পাঠানোসহ) | ~৩৬০ টাকা |
| ২০০ password reset | ~২৫০ | ~৭৫ টাকা |
| **মোট** | ~১,৪৫০ | **~৪৩৫ টাকা** |

Email Brevo-র ফ্রি সীমার (দিনে ৩০০) মধ্যেই থাকবে।

---

## ৫. নিরাপত্তা চেকলিস্ট

- [ ] OTP কখনো database বা log-এ সরাসরি লেখা থাকবে না (শুধু hash)
- [ ] Live সাইটে `OTP_DEV_LOG` বসানো নেই
- [ ] SMS/Email API key শুধু server-এর env-এ আছে, browser-এ কখনো যায় না
- [ ] "Forgot password" উত্তর দেখে বোঝা যায় না account আছে কিনা
- [ ] SPF, DKIM, DMARC তিনটাই বসানো আর যাচাই করা
- [ ] SMS provider-এর balance শেষের সতর্কবার্তা চালু

---

## ৬. শুরুর আগে আপনার সিদ্ধান্ত

1. কোন SMS provider? (API ডকুমেন্টেশনের লিংকটা আমাকে দেবেন)
2. Email: Brevo নাকি cPanel mailbox?
3. Tutor রেজিস্ট্রেশনে কোড মেলার **আগে** account তৈরি হবে না, এটা ঠিক আছে তো?
4. Guardian যাত্রায়ও কোড বাধ্যতামূলক হবে?

এই চারটা ঠিক হলে, আর API key ও SMTP তথ্য `.env`-এ বসানো হলে, ধাপ ১ থেকে কাজ শুরু করা যাবে।

---

**তথ্যসূত্র:**
[BulkSMSBD](https://bulksmsbd.com/) ·
[MiMSMS — দাম ২০২৬](https://www.mimsms.com/bulk-sms-price-in-bangladesh-2026) ·
[MiMSMS — masking SMS](https://www.mimsms.com/masking-sms) ·
[sms.bd — দাম](https://sms.bd/Pricing/) ·
[ZAMAN IT](https://zaman-it.com/sms/) ·
[Brevo — Amazon SES-এর বিকল্প তুলনা](https://www.brevo.com/blog/amazon-ses-alternatives/) ·
[Mailtrap — transactional email তুলনা](https://mailtrap.io/blog/transactional-email-services/)
