import { describe, expect, it, vi } from "vitest";

vi.mock("./tutor-profile-photo", () => ({
  TutorProfilePhotoError: class TutorProfilePhotoError extends Error {},
  validateTutorProfilePhoto: vi.fn(() => ({ extension: "png", contentType: "image/png" })),
}));

import { TutorProfilePhotoError, validateTutorProfilePhoto } from "./tutor-profile-photo";
import { uploadTutorSupportingDocument } from "./tutor-supporting-document";

const file = { buffer: Buffer.from("valid-image-bytes"), mimetype: "image/png", originalname: "nid.png", size: 32 };
const tutor = { id: 42, role: "tutor" as const, accountStatus: "active" as const };

describe("uploadTutorSupportingDocument", () => {
  it("rejects a non-Tutor before accepting an image", async () => {
    await expect(uploadTutorSupportingDocument({
      user: { id: 12, role: "guardian", accountStatus: "active" },
      documentType: "nid_card",
      file,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses a document type that is not in the shared catalog", async () => {
    const put = vi.fn();
    await expect(uploadTutorSupportingDocument({
      user: tutor,
      documentType: "passport_scan",
      file,
      storagePut: put,
      saveTutorSupportingDocument: vi.fn(),
    })).rejects.toThrow(/Unknown verification document type/);
    expect(put).not.toHaveBeenCalled();
  });

  it("stores each type under its own Tutor-private key and returns a safe status only", async () => {
    const put = vi.fn().mockResolvedValue({ key: "tutors/42/documents/ssc_certificate.png", url: "https://private.example/signed-url" });
    const save = vi.fn().mockResolvedValue(undefined);

    const result = await uploadTutorSupportingDocument({
      user: tutor,
      documentType: "ssc_certificate",
      file,
      storagePut: put,
      saveTutorSupportingDocument: save,
    });

    expect(put).toHaveBeenCalledWith("tutors/42/documents/ssc_certificate.png", file.buffer, "image/png");
    expect(save).toHaveBeenCalledWith(42, "ssc_certificate", "tutors/42/documents/ssc_certificate.png");
    expect(result).toEqual({ documentType: "ssc_certificate", status: "uploaded" });
    expect(result).not.toHaveProperty("url");
    expect(result).not.toHaveProperty("key");
  });

  it("rewords image validation failures to name the document being uploaded", async () => {
    vi.mocked(validateTutorProfilePhoto).mockImplementationOnce(() => {
      throw new TutorProfilePhotoError("Profile photos must be 5 MB or smaller.");
    });

    await expect(uploadTutorSupportingDocument({
      user: tutor,
      documentType: "hons_ms_certificate",
      file,
      storagePut: vi.fn(),
      saveTutorSupportingDocument: vi.fn(),
    })).rejects.toThrow("Hons/MS Certificate images must be 5 MB or smaller.");
  });
});
