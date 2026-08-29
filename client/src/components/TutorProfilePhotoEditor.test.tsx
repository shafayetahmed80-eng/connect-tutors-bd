// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TutorProfilePhotoEditor } from "./TutorProfilePhotoEditor";

vi.mock("react-easy-crop", () => ({
  default: ({ onCropComplete }: { onCropComplete: (_area: unknown, pixels: { x: number; y: number; width: number; height: number }) => void }) => (
    <button
      type="button"
      data-testid="cropper-preview"
      onClick={() => onCropComplete({}, { x: 0, y: 0, width: 120, height: 120 })}
    >
      Crop preview
    </button>
  ),
}));

const originalImage = globalThis.Image;
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToBlob = HTMLCanvasElement.prototype.toBlob;

afterEach(() => {
  cleanup();
  globalThis.Image = originalImage;
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  HTMLCanvasElement.prototype.toBlob = originalToBlob;
});

describe("TutorProfilePhotoEditor", () => {
  it("shows the crop preview and only confirms a prepared JPEG after the crop area is selected", async () => {
    class LoadedImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    globalThis.Image = LoadedImage as unknown as typeof Image;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toBlob = vi.fn(callback => callback(new Blob(["cropped"], { type: "image/jpeg" }))) as unknown as typeof HTMLCanvasElement.prototype.toBlob;

    const onConfirm = vi.fn();
    render(<TutorProfilePhotoEditor imageUrl="blob:source-photo" onCancel={vi.fn()} onConfirm={onConfirm} />);

    expect(screen.getByRole("heading", { name: /crop photo/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /use this photo/i }).hasAttribute("disabled")).toBe(true);

    fireEvent.click(screen.getByTestId("cropper-preview"));
    fireEvent.click(screen.getByRole("button", { name: /use this photo/i }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const preparedFile = onConfirm.mock.calls[0][0] as File;
    expect(preparedFile.name).toBe("tutor-profile-photo.jpg");
    expect(preparedFile.type).toBe("image/jpeg");
  });

  it("allows a Tutor to cancel the crop editor without starting an upload", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<TutorProfilePhotoEditor imageUrl="blob:source-photo" onCancel={onCancel} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: /close photo editor/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("keeps the editor controls reachable within a portrait viewport", () => {
    render(<TutorProfilePhotoEditor imageUrl="blob:source-photo" onCancel={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByTestId("tutor-profile-photo-editor-panel").className).toContain("overflow-y-auto");
    expect(screen.getByTestId("tutor-profile-photo-editor-crop-stage").className).toContain("52dvh");
  });
});
