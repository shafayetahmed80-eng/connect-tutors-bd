import { describe, expect, it, vi } from "vitest";
import { compressImage } from "./compressImage";

describe("compressImage", () => {
  it("leaves non-image files completely untouched", async () => {
    const pdfFile = new File(["dummy pdf content"], "doc.pdf", { type: "application/pdf" });
    const result = await compressImage(pdfFile);
    expect(result).toBe(pdfFile);
    expect(result.name).toBe("doc.pdf");
  });

  it("leaves audio files completely untouched", async () => {
    const audioFile = new File(["dummy audio"], "voice.webm", { type: "audio/webm" });
    const result = await compressImage(audioFile);
    expect(result).toBe(audioFile);
  });

  it("leaves small image files under minSizeToCompressBytes untouched", async () => {
    const smallJpg = new File(["small jpg bytes"], "avatar.jpg", { type: "image/jpeg" });
    const result = await compressImage(smallJpg, { minSizeToCompressBytes: 100000 });
    expect(result).toBe(smallJpg);
  });

  it("returns original file safely if image loading fails", async () => {
    const largeJpg = new File([new Uint8Array(300 * 1024)], "photo.jpg", { type: "image/jpeg" });
    // In node/happy-dom/jsdom, Image might not decode binary dummy data, so it gracefully falls back
    const result = await compressImage(largeJpg, { minSizeToCompressBytes: 1000 });
    expect(result).toBeInstanceOf(File);
  });
});
