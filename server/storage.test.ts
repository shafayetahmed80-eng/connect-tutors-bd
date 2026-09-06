import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  isLocalStorageBackend,
  resolveLocalStoragePath,
  storageGetSignedUrl,
  storagePut,
} from "./storage";

// The test runner has no BUILT_IN_FORGE_* env vars, so every helper is on the
// on-disk fallback here. These tests pin that path down.

let storageDir: string;

beforeAll(async () => {
  storageDir = await mkdtemp(path.join(tmpdir(), "ct-storage-"));
  process.env.LOCAL_STORAGE_DIR = storageDir;
});

afterAll(async () => {
  delete process.env.LOCAL_STORAGE_DIR;
  await rm(storageDir, { recursive: true, force: true });
});

describe("storage local fallback", () => {
  it("reports the on-disk backend when no Forge credentials are set", () => {
    expect(isLocalStorageBackend()).toBe(true);
  });

  it("writes an uploaded file to disk and returns a hashed proxy key and URL", async () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
    const result = await storagePut("tutors/42/profile-photo.png", bytes, "image/png");

    expect(result.key).toMatch(/^tutors\/42\/profile-photo_[0-9a-f]{8}\.png$/);
    expect(result.url).toBe(`/manus-storage/${result.key}`);
    expect(await readFile(path.join(storageDir, result.key))).toEqual(bytes);
  });

  it("hands back the proxy path itself as the 'signed' URL", async () => {
    await expect(storageGetSignedUrl("tutors/42/profile-photo_abcd1234.png")).resolves.toBe(
      "/manus-storage/tutors/42/profile-photo_abcd1234.png",
    );
  });

  it("refuses a key that would escape the storage root", () => {
    expect(() => resolveLocalStoragePath("../../etc/passwd")).toThrow(/Invalid storage key/);
    expect(() => resolveLocalStoragePath("tutors/../../outside.png")).toThrow(/Invalid storage key/);
  });
});
