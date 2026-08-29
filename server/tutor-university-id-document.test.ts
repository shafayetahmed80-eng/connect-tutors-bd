import { describe, expect, it, vi } from "vitest";

vi.mock("./tutor-profile-photo", () => ({
  TutorProfilePhotoError: class TutorProfilePhotoError extends Error {},
  validateTutorProfilePhoto: vi.fn(() => ({ extension: "png", contentType: "image/png" })),
}));

import { uploadTutorUniversityIdDocument } from "./tutor-university-id-document";

const file = { buffer: Buffer.from("valid-image-bytes"), mimetype: "image/png", originalname: "university-id.png", size: 32 };

describe("uploadTutorUniversityIdDocument", () => {
  it("rejects a non-Tutor before accepting an image", async () => {
    await expect(uploadTutorUniversityIdDocument({ user: { id: 12, role: "guardian", accountStatus: "active" }, file })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("stores a Tutor-private key and returns a safe status only", async () => {
    const put = vi.fn().mockResolvedValue({ key: "tutors/42/university-id.png", url: "https://private.example/signed-url" });
    const save = vi.fn().mockResolvedValue(undefined);
    const result = await uploadTutorUniversityIdDocument({ user: { id: 42, role: "tutor", accountStatus: "active" }, file, storagePut: put, saveTutorUniversityIdDocument: save });

    expect(put).toHaveBeenCalledWith("tutors/42/university-id.png", file.buffer, "image/png");
    expect(save).toHaveBeenCalledWith(42, "tutors/42/university-id.png");
    expect(result).toEqual({ universityIdDocumentStatus: "uploaded" });
    expect(result).not.toHaveProperty("url");
    expect(result).not.toHaveProperty("key");
  });
});
