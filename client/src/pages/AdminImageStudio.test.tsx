// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ saveBlob: vi.fn(), canvasToImageBlob: vi.fn(async () => new Blob(["x"])), drawTestPlate: vi.fn() }));

vi.mock("@/lib/poster/canvas-kit", () => ({ POSTER_FONT_STACK: "sans-serif", loadPosterFonts: () => Promise.resolve() }));
vi.mock("@/lib/image-studio", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/image-studio")>();
  return { ...actual, saveBlob: mocks.saveBlob, canvasToImageBlob: mocks.canvasToImageBlob, drawTestPlate: mocks.drawTestPlate };
});
vi.mock("@/components/AdminWorkspaceLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { ImageStudioContent } from "./AdminImageStudio";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const pressed = (name: RegExp) => screen.getByRole("button", { name }).getAttribute("aria-pressed");

describe("the Image Section studio", () => {
  it("offers the section's own sizes and starts on the first", () => {
    render(<ImageStudioContent section="banner" />);

    expect(screen.getByRole("button", { name: /Facebook cover/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /YouTube banner/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Story/ })).toBeNull();
    expect(pressed(/Facebook cover/)).toBe("true");
  });

  it("downloads the picked size, file type and sharpness under a name that says so", async () => {
    render(<ImageStudioContent section="poster" />);

    fireEvent.click(screen.getByRole("button", { name: /Portrait post/ }));
    fireEvent.click(screen.getByRole("button", { name: "JPG" }));
    fireEvent.click(screen.getByRole("button", { name: "3×" }));
    fireEvent.click(screen.getByRole("button", { name: /Download JPG · 3240×4050/ }));

    await waitFor(() => expect(mocks.saveBlob).toHaveBeenCalledWith(expect.any(Blob), "connect-tutors-poster-portrait-post-3240x4050.jpg"));
    expect(mocks.canvasToImageBlob).toHaveBeenCalledWith(expect.anything(), "jpg");
    // The export draws its own canvas at full size; the preview keeps drawing at 1×.
    expect(mocks.drawTestPlate).toHaveBeenCalledWith(expect.anything(), "poster", expect.objectContaining({ id: "portrait-post" }), 3);
  });

  it("will not offer a sharpness too large for a phone to make, and falls back to the largest allowed", () => {
    render(<ImageStudioContent section="banner" />);

    fireEvent.click(screen.getByRole("button", { name: "3×" }));
    fireEvent.click(screen.getByRole("button", { name: /YouTube banner/ }));

    expect((screen.getByRole("button", { name: "3×" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /Download PNG · 5120×2880/ })).toBeTruthy();
  });
});
