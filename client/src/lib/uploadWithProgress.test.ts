// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadFileWithProgress } from "./uploadWithProgress";

class FakeXhr {
  static instances: FakeXhr[] = [];
  status = 0;
  responseText = "";
  upload = { onprogress: null as ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  withCredentials = false;
  open = vi.fn();
  send = vi.fn();

  constructor() {
    FakeXhr.instances.push(this);
  }
}

afterEach(() => {
  FakeXhr.instances = [];
  vi.unstubAllGlobals();
});

describe("uploadFileWithProgress", () => {
  it("reports progress as the upload advances, and resolves with the parsed body", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr as unknown as typeof XMLHttpRequest);
    const progress: number[] = [];

    const promise = uploadFileWithProgress("/api/chat/attachment", new FormData(), value => progress.push(value));
    const xhr = FakeXhr.instances[0]!;
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 200 });
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 200, total: 200 });
    xhr.status = 201;
    xhr.responseText = JSON.stringify({ key: "chat/x/1.png", url: "https://example.test/1.png", contentType: "image/png" });
    xhr.onload?.();

    await expect(promise).resolves.toEqual({ key: "chat/x/1.png", url: "https://example.test/1.png", contentType: "image/png" });
    expect(progress).toEqual([25, 100]);
    expect(xhr.open).toHaveBeenCalledWith("POST", "/api/chat/attachment");
  });

  it("rejects with the server's own error message on a failed upload", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr as unknown as typeof XMLHttpRequest);
    const promise = uploadFileWithProgress("/api/chat/attachment", new FormData(), () => {});
    const xhr = FakeXhr.instances[0]!;
    xhr.status = 400;
    xhr.responseText = JSON.stringify({ error: "Attachments must be 20 MB or smaller." });
    xhr.onload?.();

    await expect(promise).rejects.toThrow("Attachments must be 20 MB or smaller.");
  });
});
