/**
 * What each Dynamic Section screen actually changes, in Bangla.
 *
 * The Owner reads these, not the site's visitors, so they are deliberately
 * outside the site-content registry: they are not copy anyone can reword from
 * the panel, they are the panel explaining itself. English names stay as they
 * are - they match the sidebar, the URL and the headings on screen - and the
 * sentence under each one is the part that has to be plain.
 *
 * `seeAt` is the other half of the answer: the page where a change lands. A
 * screen that edits several places lists several.
 */

export type AdminDynamicDestination = { label: string; path: string };

export type AdminDynamicGuideEntry = {
  /** The Dynamic Section route this describes. */
  path: string;
  /** The English screen name, identical to its sidebar label. */
  label: string;
  /** One Bangla line: what an Owner changes here. */
  summary: string;
  /** Where the change shows up, for the "কোথায় দেখা যাবে" links. */
  seeAt: readonly AdminDynamicDestination[];
};

const TUTOR_PROFILE: AdminDynamicDestination = { label: "টিউটর প্রোফাইল", path: "/tutor/dashboard/profile" };
const GUARDIAN_JOURNEY: AdminDynamicDestination = { label: "টিউটর চেয়ে অনুরোধ", path: "/request-tutor" };
const HOME: AdminDynamicDestination = { label: "হোমপেইজ", path: "/" };
const JOB_BOARD: AdminDynamicDestination = { label: "জব বোর্ড", path: "/job-board" };
const REGISTER: AdminDynamicDestination = { label: "রেজিস্ট্রেশন পেজ", path: "/register" };

export const adminDynamicGuide: readonly AdminDynamicGuideEntry[] = [
  {
    path: "/admin/dynamic/tutor-profile",
    label: "Tutor Profile",
    summary: "টিউটর প্রোফাইলের ট্যাব ও কার্ডের নাম, লেখার আকার, আর প্রতিটা ইনপুট ফিল্ডের নাম, ক্রম, চালু-বন্ধ ও বাধ্যতামূলক কিনা — সবই এখান থেকে।",
    seeAt: [TUTOR_PROFILE],
  },
  {
    path: "/admin/dynamic/guardian-profile",
    label: "Guardian Profile",
    summary: "অভিভাবকের অনুরোধ-যাত্রার ধাপের শিরোনাম ও ২৭টা ফিল্ডের নাম, আর ড্যাশবোর্ডের ছবি কার্ডের লেখা।",
    seeAt: [GUARDIAN_JOURNEY, { label: "অভিভাবক ড্যাশবোর্ড", path: "/guardian/dashboard" }],
  },
  {
    path: "/admin/dynamic/form-options",
    label: "Form options",
    summary: "ড্রপডাউনের ভেতরের তালিকা — Subjects, Class / level, Curricula। নতুন অপশন যোগ করা, নাম বদলানো, ক্রম বদলানো।",
    seeAt: [TUTOR_PROFILE, GUARDIAN_JOURNEY],
  },
  {
    path: "/admin/dynamic/sidebar-tabs",
    label: "Sidebar Tabs",
    summary: "তিনটা প্যানেলের (Admin, Tutor, Guardian) বাঁ পাশের মেনুর নাম ও দলের শিরোনাম, সাথে লেখার আকার, উচ্চতা ও প্যাডিং।",
    seeAt: [{ label: "টিউটর ড্যাশবোর্ড", path: "/tutor/dashboard" }, { label: "অভিভাবক ড্যাশবোর্ড", path: "/guardian/dashboard" }],
  },
  {
    path: "/admin/dynamic/home",
    label: "Home page",
    summary: "হোমপেইজের প্রতিটা অংশের লেখা — হিরো, প্রমাণ-সারি, টিউশনের ধরন, ধাপ, FAQ আর শেষের আহ্বান।",
    seeAt: [HOME],
  },
  {
    path: "/admin/dynamic/public-pages",
    label: "Public pages",
    summary: "সাতটা তথ্য পাতার শিরোনাম ও বর্ণনা — Tuition, For tutors, Blogs, Events, Contact, Privacy, Terms।",
    seeAt: [{ label: "Tuition", path: "/tuition" }, { label: "Contact", path: "/contact" }],
  },
  {
    path: "/admin/dynamic/institutes",
    label: "Institutes & departments",
    summary: "শিক্ষাপ্রতিষ্ঠান আর তাদের ডিপার্টমেন্ট বা সাবজেক্টের তালিকা, যেটা প্রোফাইলের Institute ও Department বাক্সে দেখা যায়।",
    seeAt: [TUTOR_PROFILE],
  },
  {
    path: "/admin/dynamic/locations",
    label: "Cities & locations",
    summary: "শহর ও এলাকার তালিকা। টিউটর প্রোফাইল, অভিভাবকের অনুরোধ আর জব বোর্ডের ফিল্টার — তিন জায়গাতেই এই তালিকাই চলে।",
    seeAt: [TUTOR_PROFILE, GUARDIAN_JOURNEY, JOB_BOARD],
  },
  {
    path: "/admin/dynamic/legal-pages",
    label: "Legal pages",
    summary: "শর্তাবলি ও গোপনীয়তা নীতির পূর্ণ লেখা, অনুচ্ছেদ ধরে ধরে সম্পাদনা করার জন্য।",
    seeAt: [{ label: "শর্তাবলি", path: "/terms-conditions" }, { label: "গোপনীয়তা নীতি", path: "/privacy-policy" }],
  },
  {
    path: "/admin/dynamic/modals",
    label: "Modals",
    summary: "পপআপ জানালার মাপ — প্রস্থ, উচ্চতা, ভেতরের ফাঁক। এগুলো কোনো সীমা নয়; কিছু আটকায় না, শুধু জানালার আকার ঠিক করে।",
    seeAt: [TUTOR_PROFILE],
  },
  {
    path: "/admin/dynamic/input-field-text",
    label: "Input Field Text",
    summary: "ইনপুট বাক্সে টাইপ করা লেখার আকার। বাক্সের নিজের উচ্চতা এখানে নয় — সেটা Modals-এ।",
    seeAt: [TUTOR_PROFILE, GUARDIAN_JOURNEY],
  },
  {
    path: "/admin/dynamic/button-section",
    label: "Button Section",
    summary: "বোতামের লেখা ও তার আকার — অভিভাবকের যাত্রা, রেজিস্ট্রেশন পেজের ট্যাব আর টিউটর প্রোফাইলের পপআপ।",
    seeAt: [REGISTER, GUARDIAN_JOURNEY, TUTOR_PROFILE],
  },
  {
    path: "/admin/dynamic/limits",
    label: "Limits",
    summary: "সংখ্যার সীমা — সর্বোচ্চ কয়টা বাছা যাবে, লেখা কত লম্বা হতে পারে, ফাইল কত বড়। সীমা ছাড়ালে কাজটা আটকে যায়।",
    seeAt: [TUTOR_PROFILE, JOB_BOARD],
  },
];

/** The guide row for a Dynamic Section route, or undefined for any other page. */
export function findAdminDynamicGuide(path: string): AdminDynamicGuideEntry | undefined {
  return adminDynamicGuide.find(entry => entry.path === path);
}

/**
 * Where a site-content surface is published.
 *
 * A surface heading in the copy editor names a screen ("Guardian journey",
 * "Hero"), and an Owner's next question is always the same one: where do I
 * look to see this? The map is keyed by page first because the same surface
 * name means two different screens on two pages - "Tuition types" is a home
 * page band and also the `/tuition` info page. A surface with no entry simply
 * shows no link.
 */
const surfacePathsByPage: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "tutor-profile": {
    "Tutor dashboard": "/tutor/dashboard/profile",
    "Public tutor profile": "/tutors",
  },
  "guardian-profile": {
    "Guardian dashboard": "/guardian/dashboard",
    "Request a tutor": "/request-tutor",
  },
  "button-section": {
    "Guardian journey": "/request-tutor",
    "Registration page": "/register",
    "Tutor profile editor": "/tutor/dashboard/profile",
  },
  "sidebar-tabs": {
    "Admin panel": "/admin/dashboard",
    "Tutor dashboard": "/tutor/dashboard",
    "Guardian dashboard": "/guardian/dashboard",
  },
  home: {
    Hero: "/",
    "Proof strip": "/",
    "Tuition types": "/",
    "Belief banner": "/",
    "How it works": "/",
    "Room to learn": "/",
    FAQ: "/",
    "Final call to action": "/",
  },
  "info-pages": {
    "Tuition types": "/tuition",
    "For tutors": "/tutors",
    "Learning notes": "/blogs",
    Events: "/events",
    Contact: "/contact",
    Privacy: "/privacy-policy",
    Terms: "/terms-conditions",
  },
};

export function siteContentSurfacePath(page: string, surface: string): string | undefined {
  return surfacePathsByPage[page]?.[surface];
}
