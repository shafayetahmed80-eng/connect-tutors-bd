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

const termsDefaultBody = `Connect Tutors ("we", "us", "the platform") connects Guardians looking for a home, online, package, or group tutor with Tutors offering tutoring services in Bangladesh. By creating an account or using this website, you agree to these Terms.

## Who can use Connect Tutors

- **Guardians** are anyone posting a tuition request on behalf of a student.
- **Tutors** are anyone registering to offer tutoring services, subject to profile approval.
- You must give a genuine mobile number, verified by an SMS code, to register as a Guardian or a Tutor.
- You are responsible for keeping your password private and for everything done from your account.

## What Connect Tutors does

We help Guardians and Tutors find each other: a Guardian posts a tuition request, a Tutor applies or is matched by our Admin team, and once a Guardian and Tutor agree, our Admin team confirms the tuition and issues a Confirmation Letter. Connect Tutors is a matching and coordination service - we are not the Guardian's or the Tutor's employer, and the tuition arrangement itself (schedule, conduct of classes) is between the Guardian and the Tutor.

## Guardian responsibilities

- Post genuine tuition requests with accurate subject, schedule, location, and salary information.
- Treat the assigned Tutor respectfully, and pay the agreed salary on the agreed schedule.
- Report any concern about a Tutor to Connect Tutors rather than resolving it outside the platform.

## Tutor responsibilities

- Provide accurate personal, educational, and identity information when registering; a profile is reviewed by our Admin team before it can be matched with a Guardian.
- Attend confirmed tuitions reliably and conduct yourself professionally with the student and the Guardian.
- Pay the Connect Tutors platform charge on a confirmed tuition, as described below.

## Platform charge for Tutors

There is no fee to create a Tutor account or to apply for tuition. Once a tuition is **confirmed**, the Tutor pays Connect Tutors a share of the agreed monthly salary as a platform charge. The rate depends on the tuition type (Home, Online, Package, or Group Tutoring) and is shown to the Tutor before or at the time of confirmation, along with the payment schedule. Accepted payment methods include bKash, Nagad, Rocket, and bank transfer. Guardians do not pay Connect Tutors any platform charge.

## Cancelling a confirmed tuition

Either side may ask Connect Tutors to cancel a confirmed tuition, stating the reason. Where the Tutor has already paid part or all of the platform charge, a refund is worked out under our cancellation rules, which vary by tuition type and by how much of the platform charge was paid before the cancellation. Contact us for the figures that apply to a specific tuition.

## Acceptable use

You agree not to:

- Give false information about yourself, a tuition request, or a payment.
- Use Connect Tutors to contact a Guardian or a Tutor for anything other than a genuine tutoring arrangement.
- Attempt to bypass our verification, moderation, or payment process.
- Use another person's account, or let someone else use yours.

## Suspension and account closure

We may suspend or close an account that breaks these Terms, provides false information, or is reported for unsafe or dishonest conduct. Where reasonably possible we will tell you why. You may ask us to close your own account at any time through the [Contact page](/contact).

## Confirmation Letters

A Confirmation Letter is issued once Connect Tutors confirms a tuition. It records the Tutor, the subject and schedule, and the agreed salary - never a home address, phone number, or a student's name. Each letter carries a QR code and a printed code that anyone can use to check it is genuine, without creating an account.

## Changes to these Terms

We may update these Terms as the platform changes. The version on this page is the one in effect; continuing to use Connect Tutors after a change means you accept the updated Terms.

## Governing law

These Terms are governed by the laws of Bangladesh.

## Contact

Questions about these Terms can be sent through the [Contact page](/contact), or the phone/WhatsApp number shown at the top of every page.

*Last updated: September 2026.*`;

const privacyDefaultBody = `## What information we collect

- **From every account:** your name, mobile number (verified by an SMS code), and, optionally, an email address.
- **From Guardians:** the tuition request itself - subject, class, schedule, location, and salary range - and, where our verification process asks for it, a National ID image.
- **From Tutors:** education history, teaching subjects and areas, a profile photo, certificates and other supporting documents, and a National ID image, all used to review and approve a Tutor profile before it can be matched with a Guardian.
- **Automatically:** basic technical information, such as your browser and IP address, used to keep sign-in secure and to stop abuse, plus a session cookie that keeps you signed in.

## How we use it

- To match Guardians with suitable Tutors, and to let our Admin team review, approve, and confirm a tuition.
- To verify who you are - SMS codes for mobile numbers, Admin review of a Tutor's documents - before a profile or tuition can go live.
- To send you SMS codes, account notifications, and, if you allow it, browser push notifications about your requests, applications, and confirmed tuitions.
- To issue a Confirmation Letter once a tuition is confirmed, and to answer anyone checking that letter's QR code.
- To look into a reported problem and to keep the platform safe.

## What we do not do

- **We do not publish a public directory of Tutors or Guardians.** A Tutor's profile is shown only to Guardians and our Admin team through the matching process, never as a public listing.
- A Guardian sees an applying Tutor's full profile only once our Admin team has shortlisted or appointed that Tutor - before that, only the number of applicants is shown.
- Identity documents (National ID, certificates) are visible only to Connect Tutors Admin staff for verification, never to the other party or to the public.
- A Confirmation Letter, and the public page that checks its QR code, never shows a home address, phone number, or a student's name.
- We do not sell your information to anyone.

## Who we share information with

- **BulkSMSBD**, our SMS provider, to deliver verification codes and account notifications to your mobile number.
- Our own Admin team, for matching, verification, and support.
- We do not share your personal information with any other outside party, except where the law requires it.

## Security

Passwords are stored as a one-way hash, never as plain text. Admin accounts require a second factor - an authenticator app - to sign in. Identity documents and other private uploads are kept in storage that only Connect Tutors' own systems can read.

## Your choices

- You can review and update most of your profile information yourself, or ask us to correct it, at any time.
- You can turn browser push notifications off in your browser at any time.
- You can ask us to close your account and delete your personal information through the [Contact page](/contact); we keep only what the law requires us to, such as a record of a completed payment.

## Children

Connect Tutors accounts are held by the Guardian - a parent or guardian - not by the student. We ask for only what is needed to arrange tuition, and we never publish a student's name.

## Changes to this Policy

We may update this Privacy Policy as the platform changes. The version on this page is the one in effect.

## Contact

Questions about your data, or a request to correct or delete it, can be sent through the [Contact page](/contact), or the phone/WhatsApp number shown at the top of every page.

*Last updated: September 2026.*`;

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
