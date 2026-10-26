/**
 * Optional supporting documents a Tutor can attach to the Education section,
 * alongside the mandatory University ID card.
 *
 * Every one of these is private verification material: the API only ever
 * reports which types have been uploaded, never a storage key or an image URL.
 * The type list is stored as `varchar` rather than a MySQL enum so a new
 * document can be added without a schema migration.
 */

export const tutorSupportingDocumentTypes = [
  "nid_card",
  "ssc_certificate",
  "hsc_certificate",
  "hons_ms_certificate",
] as const;

export type TutorSupportingDocumentType = (typeof tutorSupportingDocumentTypes)[number];

export const tutorSupportingDocumentLabels: Record<TutorSupportingDocumentType, string> = {
  nid_card: "NID Card Image",
  ssc_certificate: "SSC Certificate",
  hsc_certificate: "HSC Certificate",
  hons_ms_certificate: "Hons/MS Certificate",
};

export function isTutorSupportingDocumentType(value: unknown): value is TutorSupportingDocumentType {
  return typeof value === "string" && (tutorSupportingDocumentTypes as readonly string[]).includes(value);
}

/** Matches the University ID card limits so every upload behaves the same. */
export const MAX_TUTOR_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const TUTOR_DOCUMENT_ACCEPT_ATTRIBUTE = "image/jpeg,image/jpg,image/pjpeg,image/png,image/webp";

/** Per-document verification statuses supported across Admin and Tutor portal */
export const tutorDocumentVerificationStatuses = [
  "not_uploaded",
  "uploaded",
  "pending",
  "approved",
  "changes_requested",
] as const;

export type TutorDocumentVerificationStatus = (typeof tutorDocumentVerificationStatuses)[number];

export const tutorDocumentVerificationStatusLabels: Record<TutorDocumentVerificationStatus, string> = {
  not_uploaded: "Not Uploaded",
  uploaded: "Uploaded",
  pending: "Pending Review",
  approved: "Approved",
  changes_requested: "Changes Requested",
};

/** Quick reason presets for requesting document re-upload in Bengali */
export const TUTOR_DOCUMENT_REUPLOAD_REASONS = [
  "ছবিটি ঝাপসা বা স্পষ্ট নয়",
  "ভুল ডকুমেন্ট আপলোড করা হয়েছে",
  "উভয় পিঠ প্রয়োজন / সম্পূর্ণ ডকুমেন্ট দেখা যাচ্ছে না",
  "মেয়াদোত্তীর্ণ আইডি / তথ্যে অসামঞ্জস্য রয়েছে",
] as const;

/** Quick reason presets for requesting profile corrections during Admin Review & Moderate */
export const TUTOR_PROFILE_CORRECTION_PRESETS = [
  "প্রোফাইল ছবি অস্পষ্ট / স্পষ্ট ও পেশাদার ছবি আপলোড করুন",
  "শিক্ষাগত তথ্যের বিবরণ অসম্পূর্ণ (শিক্ষা প্রতিষ্ঠান বা বিভাগ উল্লেখ করুন)",
  "আইডি কার্ড বা সার্টিফিকেটের তথ্যের সাথে প্রোফাইলের তথ্যের অমিল",
  "বর্তমান বা স্থায়ী ঠিকানা আরও বিস্তারিত লিখুন (বাসা/রোড/এলাকা)",
  "পরিচিতি বিবরণী (About Me / Teaching Approach) আরও অর্থবহ ও বিস্তারিত করুন",
  "মাসিক টিউশন ফি বা অভিজ্ঞতার তথ্যে অসামঞ্জস্য রয়েছে",
] as const;

export function buildTutorDocumentReuploadWhatsAppMessage(input: {
  tutorName: string;
  documentLabel: string;
  reason: string;
  dashboardUrl?: string;
}): string {
  const url = input.dashboardUrl || "https://connecttutorsbd.com/tutor/dashboard/profile";
  return `আসসালামু আলাইকুম ${input.tutorName}, কানেক্ট টিউটরস (Connect Tutors BD) থেকে আপনার "${input.documentLabel}" পর্যালোচনায় কিছু সংশোধনের প্রয়োজন হয়েছে।\n\nকারণ: ${input.reason}\n\nঅনুগ্রহ করে প্রোফাইল ড্যাশবোর্ডে গিয়ে নতুন করে স্পষ্ট ডকুমেন্টটি আপলোড করুন:\n${url}`;
}
