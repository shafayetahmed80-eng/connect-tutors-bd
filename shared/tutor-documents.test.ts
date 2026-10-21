import { describe, expect, it } from "vitest";
import {
  buildTutorDocumentReuploadWhatsAppMessage,
  isTutorSupportingDocumentType,
  tutorDocumentVerificationStatusLabels,
  tutorDocumentVerificationStatuses,
  tutorSupportingDocumentLabels,
  tutorSupportingDocumentTypes,
  TUTOR_DOCUMENT_REUPLOAD_REASONS,
} from "./tutor-documents";

describe("shared/tutor-documents", () => {
  it("identifies valid tutor supporting document types", () => {
    expect(isTutorSupportingDocumentType("nid_card")).toBe(true);
    expect(isTutorSupportingDocumentType("ssc_certificate")).toBe(true);
    expect(isTutorSupportingDocumentType("hsc_certificate")).toBe(true);
    expect(isTutorSupportingDocumentType("hons_ms_certificate")).toBe(true);
    expect(isTutorSupportingDocumentType("passport")).toBe(false);
    expect(isTutorSupportingDocumentType("")).toBe(false);
    expect(isTutorSupportingDocumentType(null)).toBe(false);
  });

  it("contains readable labels for all document types", () => {
    for (const type of tutorSupportingDocumentTypes) {
      expect(tutorSupportingDocumentLabels[type]).toBeTruthy();
      expect(typeof tutorSupportingDocumentLabels[type]).toBe("string");
    }
  });

  it("provides labels for all document verification statuses", () => {
    for (const status of tutorDocumentVerificationStatuses) {
      expect(tutorDocumentVerificationStatusLabels[status]).toBeTruthy();
    }
  });

  it("has quick reason chips for Bengali re-upload requests", () => {
    expect(TUTOR_DOCUMENT_REUPLOAD_REASONS.length).toBeGreaterThanOrEqual(4);
    expect(TUTOR_DOCUMENT_REUPLOAD_REASONS[0]).toContain("ঝাপসা");
  });

  it("constructs personalized WhatsApp message template for document re-upload", () => {
    const message = buildTutorDocumentReuploadWhatsAppMessage({
      tutorName: "রাকিবুল হাসান",
      documentLabel: "University ID Card",
      reason: "ছবিটি ঝাপসা বা স্পষ্ট নয়",
    });

    expect(message).toContain("আসসালামু আলাইকুম রাকিবুল হাসান");
    expect(message).toContain("University ID Card");
    expect(message).toContain("ছবিটি ঝাপসা বা স্পষ্ট নয়");
    expect(message).toContain("https://connecttutorsbd.com/tutor/dashboard/profile");
  });
});
