import { describe, expect, it, vi } from "vitest";
import {
  GuardianNidDocumentError,
  getGuardianNidDocumentUrls,
  removeGuardianNidDocument,
  uploadGuardianNidDocument,
} from "./guardian-nid-document";

function pngFixture(width = 600, height = 400) {
  const buffer = Buffer.alloc(24);
  buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

const activeGuardian = { id: 501, role: "guardian" as const, accountStatus: "active" as const };
const file = { buffer: pngFixture(), mimetype: "image/png", originalname: "nid-front.png" };

describe("Guardian NID document upload", () => {
  it("stores one side under a Guardian-private key and returns only a safe status", async () => {
    const storagePut = vi.fn().mockResolvedValue({
      key: "guardians/501/nid-front_a1b2c3d4.png",
      url: "/manus-storage/guardians/501/nid-front_a1b2c3d4.png",
    });
    const saveGuardianNidDocumentKey = vi.fn().mockResolvedValue(undefined);

    await expect(
      uploadGuardianNidDocument({ user: activeGuardian, side: "front", file, storagePut, saveGuardianNidDocumentKey }),
    ).resolves.toEqual({ side: "front", nidDocumentStatus: "uploaded" });

    expect(storagePut).toHaveBeenCalledWith("guardians/501/nid-front.png", expect.any(Buffer), "image/png");
    expect(saveGuardianNidDocumentKey).toHaveBeenCalledWith(501, "front", "guardians/501/nid-front_a1b2c3d4.png");
  });

  it("denies non-Guardian or inactive callers before storage", async () => {
    const storagePut = vi.fn();
    const saveGuardianNidDocumentKey = vi.fn();

    await expect(
      uploadGuardianNidDocument({ user: null, side: "front", file, storagePut, saveGuardianNidDocumentKey }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      uploadGuardianNidDocument({ user: { ...activeGuardian, role: "tutor" }, side: "back", file, storagePut, saveGuardianNidDocumentKey }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      uploadGuardianNidDocument({ user: { ...activeGuardian, accountStatus: "suspended" }, side: "front", file, storagePut, saveGuardianNidDocumentKey }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(storagePut).not.toHaveBeenCalled();
    expect(saveGuardianNidDocumentKey).not.toHaveBeenCalled();
  });

  it("rejects a file that is not a real image, wording the error for a NID card", async () => {
    await expect(
      uploadGuardianNidDocument({
        user: activeGuardian,
        side: "front",
        file: { buffer: Buffer.from("not an image"), mimetype: "image/png", originalname: "x.png" },
        storagePut: vi.fn(),
        saveGuardianNidDocumentKey: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(GuardianNidDocumentError);
  });

  it("clears one side without returning a raw key", async () => {
    const clearGuardianNidDocumentKey = vi.fn().mockResolvedValue(undefined);
    await expect(
      removeGuardianNidDocument({ user: activeGuardian, side: "back", clearGuardianNidDocumentKey }),
    ).resolves.toEqual({ side: "back", nidDocumentStatus: "not_uploaded" });
    expect(clearGuardianNidDocumentKey).toHaveBeenCalledWith(501, "back");
  });

  it("signs a preview URL only for a side that has an image", async () => {
    const urls = await getGuardianNidDocumentUrls({
      userId: 501,
      getKeys: vi.fn().mockResolvedValue({ frontKey: "guardians/501/nid-front_x.png", backKey: null }),
      getSignedUrl: vi.fn().mockResolvedValue("https://signed.example/front"),
    });
    expect(urls).toEqual({ front: "https://signed.example/front", back: null });
  });
});
