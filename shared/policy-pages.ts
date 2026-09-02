import { MAX_POLICY_BODY_LENGTH } from "./policy-markdown";

/**
 * The legal pages whose body the Owner writes.
 *
 * These are the documents a Guardian and a Tutor tick a box to accept, so both
 * sides must be sent to the *same* page. They used to disagree: the Guardian
 * signup linked to a hardcoded draft at `/terms`, while the footer and the
 * Tutor signup linked to `/terms-conditions`. Only these two keys exist now,
 * and `/terms` and `/privacy` redirect here.
 *
 * The bodies below are what the site ships with - the Bangla draft that lived
 * in `DraftPolicy.tsx`, carried over so nothing was lost when it went. As with
 * every other slot, the database stores only what the Owner changed, so an
 * empty table renders exactly this.
 */
export const policyPageKeys = ["terms-conditions", "privacy-policy"] as const;
export type PolicyPageKey = (typeof policyPageKeys)[number];

export type PolicyPageMeta = {
  key: PolicyPageKey;
  /** The route that renders it. */
  path: string;
  label: string;
  /** Shown above the body until the Owner clears it. */
  defaultBody: string;
};

const termsDefaultBody = `এই পৃষ্ঠাটি বর্তমানে খসড়া। এটি চূড়ান্ত আইনি পরামর্শ বা চূড়ান্ত নীতিমালা হিসেবে উপস্থাপিত নয়।

## সেবার উদ্দেশ্য

Connect Tutors BD Guardian ও Tutor-দের মধ্যে শিক্ষাসেবা সম্পর্কিত অনুরোধ এবং তথ্য ব্যবস্থাপনার জন্য একটি প্ল্যাটফর্ম।

## ব্যবহারকারীর দায়িত্ব

- সঠিক ও সত্য তথ্য দেওয়া
- অনুমোদিত ব্যবহারের মধ্যে সেবা ব্যবহার করা

## সাহায্য

প্রয়োজনে [যোগাযোগ পাতা](/contact) থেকে আমাদের সাথে কথা বলুন।`;

const privacyDefaultBody = `এই পৃষ্ঠাটি বর্তমানে খসড়া। এটি চূড়ান্ত আইনি পরামর্শ বা চূড়ান্ত নীতিমালা হিসেবে উপস্থাপিত নয়।

## কোন তথ্য রাখা হয়

Guardian registration-এ দেওয়া নাম, ফোন, ইমেইল, লোকেশন ও request details account ownership এবং tutor coordination-এর জন্য **private** রাখা হবে।

## কী প্রকাশ করা হয় না

- Guardian-এর তথ্য public Tutor listing-এ দেখানো হয় না
- অন্য Guardian বা Tutor-এর response-এ প্রকাশ করা হয় না

OTP, automatic matching এবং platform messaging এই draft scope-এর অংশ নয়।

## সাহায্য

প্রয়োজনে [যোগাযোগ পাতা](/contact) থেকে আমাদের সাথে কথা বলুন।`;

export const policyPages: PolicyPageMeta[] = [
  { key: "terms-conditions", path: "/terms-conditions", label: "Terms of Use", defaultBody: termsDefaultBody },
  { key: "privacy-policy", path: "/privacy-policy", label: "Privacy Policy", defaultBody: privacyDefaultBody },
];

export function findPolicyPage(key: string): PolicyPageMeta | undefined {
  return policyPages.find(page => page.key === key);
}

export function findPolicyPageByPath(path: string): PolicyPageMeta | undefined {
  return policyPages.find(page => page.path === path);
}

export { MAX_POLICY_BODY_LENGTH };
