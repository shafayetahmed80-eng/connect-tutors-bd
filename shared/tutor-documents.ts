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
