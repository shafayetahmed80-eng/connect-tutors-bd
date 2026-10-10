/**
 * What a search result and a shared link say about each public page: an English
 * line, then the same in Bangla, so both a guardian typing "home tutor in Dhaka"
 * and one typing "হোম টিউটর" meet the page. The paths are the ones in the
 * sitemap; a page that is not listed here (a panel, a sign-in) is not for search.
 */
export const SEO_SITE_NAME = "Connect Tutors";

export type SeoPage = { path: string; title: string; description: string };

export const defaultSeoPage = {
  title: "Connect Tutors | Build your learning connection",
  description: "Connect Tutors — a simple tutor matching platform for students and guardians in Bangladesh.",
} as const;

export const seoPages: readonly SeoPage[] = [
  {
    path: "/",
    title: "Home Tutor in Bangladesh | হোম টিউটর – Connect Tutors",
    description: "Find a trusted home or online tutor anywhere in Bangladesh, or find tuition jobs as a tutor. বাসায় বা অনলাইনে ভালো টিউটর খুঁজুন, অথবা টিউশন জব পান।",
  },
  {
    path: "/job-board",
    title: "Tuition Jobs in Bangladesh | টিউশন জব – Connect Tutors",
    description: "Browse live home and online tuition jobs by area, class and subject, then apply as a tutor. এলাকা, ক্লাস ও বিষয় অনুযায়ী লাইভ টিউশন জব দেখে আবেদন করুন।",
  },
  {
    path: "/request-tutor",
    title: "Request a Tutor | টিউটর রিকোয়েস্ট – Connect Tutors",
    description: "Tell us the class, subject and area, and we help you find a suitable tutor. ক্লাস, বিষয় ও এলাকা জানান, আমরা উপযুক্ত টিউটর খুঁজে পেতে সাহায্য করব।",
  },
  {
    path: "/become-tutor",
    title: "Become a Tutor | টিউটর হিসেবে যুক্ত হোন – Connect Tutors",
    description: "Create your tutor profile and apply to home and online tuition jobs near you. টিউটর প্রোফাইল তৈরি করে কাছের টিউশন জবে আবেদন করুন।",
  },
  {
    path: "/tuition",
    title: "Tuition Types | টিউশনের ধরন – Connect Tutors",
    description: "Find the right tutor by curriculum, subject and class format, at home or online. কারিকুলাম, বিষয় ও ক্লাসের ধরন অনুযায়ী সঠিক টিউটর বেছে নিন।",
  },
  {
    path: "/contact",
    title: "Contact Us | যোগাযোগ – Connect Tutors",
    description: "Questions about tutor matching, profiles or the platform? Send us a message. টিউটর ম্যাচিং, প্রোফাইল বা প্ল্যাটফর্ম নিয়ে প্রশ্ন থাকলে আমাদের জানান।",
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy | গোপনীয়তা নীতি – Connect Tutors",
    description: "What Connect Tutors collects, how it is used, and what is never made public. আমরা কী তথ্য নিই, কীভাবে ব্যবহার করি এবং কী কখনো প্রকাশ করি না।",
  },
  {
    path: "/terms-conditions",
    title: "Terms & Conditions | শর্তাবলি – Connect Tutors",
    description: "The terms every guardian and tutor agrees to when joining Connect Tutors. অভিভাবক ও টিউটর হিসেবে যুক্ত হওয়ার সময় যে শর্তে সম্মত হতে হয়।",
  },
];

export function findSeoPage(path: string): SeoPage | undefined {
  return seoPages.find(page => page.path === path);
}

/** The title a tab shows at this path: the page's own, or the site's for a panel or anything not listed. */
export function seoTitleFor(path: string): string {
  return findSeoPage(path)?.title ?? defaultSeoPage.title;
}

/** The one address a page is known by: no trailing slash (but the home page keeps its "/"), no query. */
export function canonicalUrl(publicSiteUrl: string, path: string): string {
  const clean = path === "/" ? "/" : path.replace(/\/+$/, "");
  return `${publicSiteUrl}${clean}`;
}

/** Tells a search engine what the site is: the organisation behind it and the website itself. Only the home page carries it. */
export function organizationJsonLd(publicSiteUrl: string): Array<Record<string, unknown>> {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SEO_SITE_NAME,
      url: `${publicSiteUrl}/`,
      logo: `${publicSiteUrl}/pwa-512x512.png`,
      description: defaultSeoPage.description,
      areaServed: { "@type": "Country", name: "Bangladesh" },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SEO_SITE_NAME,
      url: `${publicSiteUrl}/`,
      inLanguage: ["en", "bn"],
    },
  ];
}
