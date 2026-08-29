# Loading Animation ও Hover Effect UX Audit

**প্রকল্প:** Connect Tutors BD  
**প্রস্তুতকারক:** Manus AI  
**পরিধি:** বর্তমান public homepage, Job Board, shared header, dashboard loading shell এবং global CSS motion rules  
**অবস্থা:** Analysis ও recommendation only; production behavior পরিবর্তন করা হয়নি

## ১. Executive assessment

বর্তমান UI-তে hover interaction ইতোমধ্যে আছে, কিন্তু এগুলো মূলত আলাদা আলাদা component-এ inline বা page-specific CSS হিসেবে ছড়িয়ে আছে। Homepage-এর primary ও secondary button-এ 180ms transform/shadow/background transition, navigation link-এ colour/translate transition, tuition card-এ lift effect, এবং Job Board card-এ subtle lift/shadow effect আছে। এগুলো brand direction-এর সঙ্গে সামঞ্জস্যপূর্ণ এবং অতিরিক্ত ভারী নয়। তবে interaction language একীভূত নয়: কোথাও `translateY`, কোথাও শুধু background change, কোথাও `gap` পরিবর্তন, আবার কিছু button-এ focus state স্পষ্ট হলেও Job Board-এর action buttons-এ visible focus ring অনুপস্থিত।

Loading-এর ক্ষেত্রে shared `DashboardLayoutSkeleton` আছে এবং এটি layout-preserving skeleton blocks ব্যবহার করে। কিন্তু বর্তমান inventory-তে explicit `aria-busy`, live loading announcement, বা shared shimmer/loading token শনাক্ত হয়নি। ফলে visual loading feedback কিছু dashboard surface-এ থাকলেও assistive technology এবং asynchronous list/filter update-এর জন্য state communication অসম্পূর্ণ হতে পারে। সুপারিশ হলো **subtle, token-based motion system**: shared skeleton shimmer, button pending state, list/filter transition এবং reduced-motion fallback—কিন্তু decorative page-wide entrance animation বা aggressive parallax নয়।

## ২. বর্তমান evidence matrix

| Surface | বর্তমান evidence | UX value | প্রধান gap | Priority |
|---|---|---|---|---|
| Global buttons | `.button-*`-এ প্রায় 180ms transform, shadow ও background transition; active অবস্থায় `scale(.97)` | Click acknowledgement ও hierarchy পরিষ্কার করে | Shared token নেই; কিছু page-specific button এই language অনুসরণ করে না | P1 |
| Public header | WhatsApp, nav link ও CTA-তে colour/translate hover; visible header focus styles আছে | Navigation discoverability বাড়ায় | Touch device-এ hover-এর বিকল্প state স্পষ্টভাবে define করা হয়নি | P1 |
| Homepage tuition cards | Hover-এ প্রায় 6px lift ও soft shadow; card arrow-এর colour/background change | Card affordance বোঝায় | Reduced-motion rule নেই; mobile-এ hover প্রাসঙ্গিক নয় | P1 |
| Job Board cards | প্রায় 0.5px lift ও shadow; action buttons-এ hover background/colour | Details action-এর visual feedback দেয় | `View details` ও `Direction` action-এ focus-visible treatment globalভাবে একরকম নয় | P1 |
| Dashboard loading | `DashboardLayoutSkeleton` layout-preserving blocks ব্যবহার করে | Layout shift কমাতে সাহায্য করে | `aria-busy`, status message ও shared motion treatment দেখা যায়নি | P0 |
| Async filter/list updates | Job Board query/filter state আছে; visual transition inventory-তে আলাদা state শনাক্ত হয়নি | User-এর অপেক্ষার সময় বোঝানো যায় | Filter change-এর সময় stale content/loading distinction আরও স্পষ্ট হওয়া দরকার | P0 |
| Mobile navigation | Menu open/close state conditional render; toggle-এ focus-visible আছে | Simple ও predictable | Open/close transition নেই; motion যোগ করলে focus order ও reduced motion যাচাই করতে হবে | P2 |

## ৩. কী যোগ করা উচিত

### ৩.১ Shared loading system

প্রথম release-এ তিনটি reusable pattern যথেষ্ট হবে। প্রথমত, dashboard ও Job Board list-এর জন্য **soft shimmer skeleton**; shimmer background-position বা opacity-ভিত্তিক হবে, বড় scale বা sliding block নয়। দ্বিতীয়ত, mutation বা submit button-এর জন্য **pending state**—button disabled থাকবে, label হবে `Saving…`, `Submitting…` বা নির্দিষ্ট action-এর সমতুল্য factual wording, এবং একটি ছোট spinner বা static progress indicator থাকবে। তৃতীয়ত, asynchronous content region-এ `aria-busy="true"` এবং প্রয়োজন হলে `role="status"` সহ সংক্ষিপ্ত polite status থাকবে। MDN অনুযায়ী `aria-busy` assistive technology-কে জানায় যে content update শেষ না হওয়া পর্যন্ত region-টি পরিবর্তনশীল অবস্থায় আছে [4]।

Loading overlay পুরো page ঢেকে দেওয়া উচিত নয়, কারণ এতে context হারায় এবং mobile connection-এ অপেক্ষার সময় বেশি মনে হতে পারে। পরিবর্তে যে list বা card region update হচ্ছে, শুধু সেই region-এ skeleton বা inline progress দেখানো উচিত। Existing content সম্পূর্ণ মুছে ফেলার পরিবর্তে filter request চলাকালে previous result-এর সঙ্গে subtle pending treatment ব্যবহার করা যেতে পারে, যদি stale result এবং নতুন result-এর পার্থক্য text/status দিয়ে পরিষ্কার থাকে।

### ৩.২ Hover ও focus interaction system

Hover effect-কে তিনটি semantic level-এ standardise করার সুপারিশ করছি। **Primary action**-এ colour darkening, 1–2px lift এবং soft shadow থাকবে। **Secondary action**-এ background tint বা border emphasis থাকবে, lift নয়। **Content card**-এ সর্বোচ্চ 2–4px lift এবং shadow emphasis থাকবে—বর্তমান tuition card-এর 6px lift mobile-first system-এর জন্য কিছুটা বেশি; desktop-এ রাখা গেলেও reduced-motion অথবা small viewport-এ neutral করা ভালো। Icon বা arrow-এ layout-affecting `gap` animation-এর বদলে transform বা opacity ব্যবহার করা উচিত, যাতে text reflow না হয়।

Hover কখনোই একমাত্র feedback হবে না। Keyboard focus-এর জন্য প্রতিটি actionable element-এ consistent `:focus-visible` ring থাকতে হবে। W3C-এর animation guidance অনুযায়ী interaction-triggered non-essential motion ব্যবহার করলে সেটি বন্ধ করার ব্যবস্থা বা user-এর reduced-motion preference সম্মান করা উচিত [1] [2]। তাই hover, focus এবং active state-এর colour/outline motion ছাড়াও স্থায়ী visual distinction রাখতে হবে।

### ৩.৩ Page ও mobile transitions

Header mobile menu-তে 160–220ms opacity/translate transition যোগ করা যেতে পারে, তবে menu mount হওয়ার পরে focus management ও Escape handling সঠিক না হলে animation না যোগ করাই নিরাপদ। একইভাবে tab বা filter result update-এ content crossfade করা যেতে পারে, কিন্তু height animation এড়িয়ে চলা উচিত; dynamic height animation layout instability তৈরি করতে পারে। Public homepage-এর hero image, family image বা decorative sunburst-এ continuous animation প্রয়োজন নেই। Static visual ইতোমধ্যে brand identity বহন করছে এবং unnecessary motion ছাড়া আরও স্থিতিশীল থাকবে।

## ৪. Accessibility ও performance guardrails

| Guardrail | সিদ্ধান্ত | Verification |
|---|---|---|
| Reduced motion | `@media (prefers-reduced-motion: reduce)`-এ transform/animation বন্ধ বা dissolve/opacity-only fallback | OS reduced-motion চালু করে homepage, Job Board, dashboard ও mobile menu পরীক্ষা |
| Keyboard | Hover effect-এর সমতুল্য focus-visible ring থাকতে হবে; focus যেন layout shift না ঘটায় | Tab-only navigation; primary CTA, card action, filter, mobile menu পরীক্ষা |
| Screen reader | Updating list region-এ `aria-busy`; গুরুত্বপূর্ণ completion/error-এ polite status | NVDA/VoiceOver বা browser accessibility tree-তে state যাচাই |
| Touch | Hover-dependent content নয়; tap state এবং visible action label থাকতে হবে | 375px viewport ও touch emulation পরীক্ষা |
| Motion amount | সাধারণ transition 120–220ms; card lift সর্বোচ্চ 2–4px; infinite decorative animation নয় | Computed style ও manual review |
| Performance | শুধু `transform` ও `opacity` animate; expensive blur/filter/large shadow animation এড়িয়ে চলা | Chrome Performance trace এবং low-end mobile simulation |
| Failure state | Loading শেষে empty/error state অবশ্যই পৃথক; skeleton অনন্তকাল চলবে না | Slow network, failed query, retry flow পরীক্ষা |

W3C-এর `prefers-reduced-motion` technique interaction-triggered motion suppress করার জন্য CSS media query ব্যবহারের সুপারিশ করে [2]। MDN-ও এটিকে user device setting থেকে non-essential motion কমানোর signal হিসেবে বর্ণনা করে এবং feature-টি widely available বলে উল্লেখ করে [3]। এই প্রকল্পে তাই default motion রাখা যেতে পারে, কিন্তু reduced-motion user-এর জন্য transition duration শূন্য বা খুব কম এবং transform neutral করতে হবে।

> “Motion animation triggered by interaction can be disabled, unless the animation is essential to the functionality or the information being conveyed.” — W3C, WCAG Understanding SC 2.3.3 [1]

## ৫. প্রস্তাবিত implementation sequence

| Phase | Scope | Acceptance condition |
|---|---|---|
| M-01 | Global motion tokens, button/card/focus conventions, reduced-motion base rule | Existing public actions একই interaction language অনুসরণ করে; reduced-motion-এ movement বন্ধ থাকে |
| M-02 | Shared shimmer skeleton এবং `aria-busy` loading region | Dashboard ও Job Board loading state layout-preserving, labelled এবং finite হয় |
| M-03 | Async filter/list pending state ও empty/error recovery motion | Filter change-এ user বুঝতে পারে request চলছে; stale data misleading হয় না |
| M-04 | Mobile menu transition, submit pending feedback, regression tests | Keyboard, touch, reduced-motion এবং 375px layout checks পাস |

**M-01 আগে করা উচিত**, কারণ এটি পরের loading ও mobile transition-এর visual contract নির্ধারণ করবে। M-02 সবচেয়ে বেশি usability value দেবে, কারণ বর্তমানে loading feedback-এর visual এবং assistive state আলাদা করে সংজ্ঞায়িত নয়। M-03 Job Board-এর practical workflow-এর জন্য গুরুত্বপূর্ণ; M-04 polish হিসেবে শেষে করা নিরাপদ।

## ৬. Rejected বা deferred alternatives

**Full-screen branded loader** এখন সুপারিশ করা হচ্ছে না। এটি প্রতিটি route transition-এ context block করবে এবং fast navigation-এ unnecessary delay তৈরি করতে পারে। **Continuous floating/parallax animation**-ও deferred রাখা উচিত; এতে accessibility risk বাড়ে কিন্তু tutor/guardian workflow-এ কার্যকর information যোগ হয় না। **Hover-only reveal** mobile-first product-এর জন্য গ্রহণযোগ্য নয়, কারণ touch user hover করতে পারে না। **Large animated shadows বা blur** performance cost বাড়াতে পারে এবং visual hierarchy-কে অতিরিক্ত ornamental করে তুলতে পারে।

## ৭. Decision log

| বিষয় | সিদ্ধান্ত | কারণ |
|---|---|---|
| Motion style | Subtle, fast, purposeful | বর্তমান friendly blue brand এবং dashboard utility বজায় থাকে |
| Loading strategy | Local skeleton/inline pending, no blocking overlay by default | Context ও perceived responsiveness বজায় থাকে |
| Accessibility | Reduced-motion, focus-visible, `aria-busy`, factual status | Motion preference ও assistive state উভয়ই কভার হয় [1] [2] [4] |
| Mobile | Hover নয়, tap/focus-visible সমতুল্য feedback | Touch interaction-এ affordance হারায় না |
| Animation properties | Primarily transform ও opacity | Layout reflow ও paint cost কম রাখার জন্য |
| Scope | Audit এখন; implementation আলাদা approved ticket হিসেবে | বর্তমান request analysis-ভিত্তিক; অনিচ্ছাকৃত production change এড়ানো হয়েছে |

## ৮. Approval gate

Implementation শুরু করার আগে নিচের minimum approval যথেষ্ট হবে: **M-01 + M-02 আগে**, M-03 Job Board workflow-এর সঙ্গে একসঙ্গে, এবং M-04 optional polish হিসেবে। Product owner যদি এই sequence অনুমোদন করেন, পরের কাজ হবে approved tickets তৈরি করে TDD coverage, implementation, desktop/mobile screenshot verification এবং reduced-motion regression চালানো।

## References

[1]: https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html "W3C WAI — Understanding SC 2.3.3: Animation from Interactions"

[2]: https://www.w3.org/WAI/WCAG22/Techniques/css/C39 "W3C WAI — Technique C39: Using the CSS prefers-reduced-motion query to prevent motion"

[3]: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion "MDN — prefers-reduced-motion CSS media feature"

[4]: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy "MDN — ARIA: aria-busy attribute"
