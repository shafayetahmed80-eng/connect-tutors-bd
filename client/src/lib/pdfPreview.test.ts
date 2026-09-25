// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { base64ToBytes, saveFile } from "./pdfPreview";

afterEach(() => vi.restoreAllMocks());

describe("base64ToBytes", () => {
  it("turns the server's base64 back into the file's bytes", () => {
    expect(Array.from(base64ToBytes(btoa("%PDF")))).toEqual([37, 80, 68, 70]);
  });
});

describe("saveFile", () => {
  it("downloads the bytes under the given name, then lets the link go", () => {
    const createObjectURL = vi.fn(() => "blob:letter");
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const clicks: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { clicks.push(this); });

    saveFile(new Uint8Array([37, 80, 68, 70]), "Connect-Tutors-Confirmation-Letter-CTB-1.pdf");

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clicks).toHaveLength(1);
    expect(clicks[0].download).toBe("Connect-Tutors-Confirmation-Letter-CTB-1.pdf");
    expect(clicks[0].href).toBe("blob:letter");
    expect(document.body.contains(clicks[0])).toBe(false);
  });
});
