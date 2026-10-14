// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  DRAFT_STORAGE_KEYS,
  readStorageDraft,
  removeStorageDraft,
  saveStorageDraft,
} from "./formDraftStorage";

describe("formDraftStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("saves and reads draft data from localStorage", () => {
    const data = { name: "Rahim", phone: "1712345678", cityId: "dhaka" };
    const saved = saveStorageDraft(DRAFT_STORAGE_KEYS.TUTOR_REGISTRATION, data);
    expect(saved).toBe(true);

    const read = readStorageDraft<typeof data>(DRAFT_STORAGE_KEYS.TUTOR_REGISTRATION);
    expect(read).toEqual(data);
  });

  it("removes draft from both localStorage and sessionStorage", () => {
    saveStorageDraft("test-draft-key", { test: true });
    expect(readStorageDraft("test-draft-key")).toEqual({ test: true });

    removeStorageDraft("test-draft-key");
    expect(readStorageDraft("test-draft-key")).toBeNull();
  });

  it("handles backward-compatible unnested json drafts", () => {
    const raw = JSON.stringify({ oldKey: "oldValue" });
    window.localStorage.setItem("old-draft", raw);

    const read = readStorageDraft<{ oldKey: string }>("old-draft");
    expect(read).toEqual({ oldKey: "oldValue" });
  });

  it("returns null when key does not exist or JSON is corrupt", () => {
    expect(readStorageDraft("non-existent")).toBeNull();

    window.localStorage.setItem("bad-json", "{invalid-json");
    expect(readStorageDraft("bad-json")).toBeNull();
  });
});
