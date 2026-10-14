// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { copyToClipboard } from "./copyToClipboard";

describe("copyToClipboard", () => {
  it("copies text using navigator.clipboard when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    const success = await copyToClipboard("6804");
    expect(success).toBe(true);
    expect(writeText).toHaveBeenCalledWith("6804");
  });

  it("returns false for empty text without calling clipboard", async () => {
    const writeText = vi.fn();
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    const success = await copyToClipboard("");
    expect(success).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to document.execCommand when navigator.clipboard fails", async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("Permission denied")),
      },
    });
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;

    const success = await copyToClipboard("01712345678");
    expect(success).toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
  });
});
