// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveBlob: vi.fn(),
  canvasToImageBlob: vi.fn(async () => new Blob(["png"])),
  renderPoster: vi.fn(),
}));

vi.mock("@/lib/image-studio", async importOriginal => ({ ...(await importOriginal<typeof import("@/lib/image-studio")>()), saveBlob: mocks.saveBlob, canvasToImageBlob: mocks.canvasToImageBlob }));
vi.mock("@/lib/poster-studio", async importOriginal => ({ ...(await importOriginal<typeof import("@/lib/poster-studio")>()), renderPoster: mocks.renderPoster }));
vi.mock("@/lib/siteContent", () => ({ useSiteContact: () => ({ number: "8801516131411" }) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ imageStudio: { marks: { invalidate: vi.fn() }, uploadedFonts: { invalidate: vi.fn() } } }),
    imageStudio: {
      marks: { useQuery: () => ({ data: { marks: [], canEdit: false } }) },
      uploadedFonts: { useQuery: () => ({ data: [] }) },
      setMark: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      deleteFont: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { PosterStudioContent } from "./AdminPosterStudio";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const lastRender = () => mocks.renderPoster.mock.calls.at(-1)![1];

describe("the poster studio", () => {
  it("draws the female-tutor poster at 1080×1350 with the site WhatsApp and a Request a Tutor QR", async () => {
    render(<PosterStudioContent />);

    await waitFor(() => expect(mocks.renderPoster).toHaveBeenCalled());
    expect(lastRender()).toMatchObject({ width: 1080, height: 1350, scale: 1, whatsapp: "+880 1516-131411", qrUrl: `${window.location.origin}/request-tutor` });
    expect(lastRender().template.id).toBe("female-tutor");
    expect(screen.getByRole("button", { name: /Download PNG · 2160×2700/ })).toBeTruthy();
  });

  it("redraws with edited words and line colours, and remembers them", async () => {
    render(<PosterStudioContent />);
    fireEvent.change(screen.getByLabelText("Headline line 1"), { target: { value: "নতুন শিরোনাম" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Accent" })[0]);

    await waitFor(() => expect(lastRender().content.headline[0]).toEqual({ text: "নতুন শিরোনাম", tone: "accent" }));
    expect(JSON.parse(window.localStorage.getItem("connect-poster-studio-v1")!).content.headline[0].text).toBe("নতুন শিরোনাম");

    fireEvent.click(screen.getByRole("button", { name: /Template text/ }));
    await waitFor(() => expect(lastRender().content.headline[0].tone).toBe("navy"));
  });

  it("adds up to four points and removes them", async () => {
    render(<PosterStudioContent />);
    expect(screen.getAllByLabelText(/^Point \d$/)).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "+ Add point" }));
    expect(screen.getAllByLabelText(/^Point \d$/)).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "+ Add point" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Remove point 1" }));
    await waitFor(() => expect(lastRender().content.features).toHaveLength(3));
  });

  it("turns the QR off and changes the accent colour", async () => {
    render(<PosterStudioContent />);
    fireEvent.click(screen.getByRole("checkbox", { name: /QR code/ }));
    fireEvent.click(screen.getByRole("button", { name: "Accent #00897b" }));
    await waitFor(() => expect(lastRender()).toMatchObject({ content: { showQr: false }, accent: "#00897b" }));
  });

  it("downloads at the chosen size, format and scale", async () => {
    render(<PosterStudioContent />);
    fireEvent.click(screen.getByRole("button", { name: /^Facebook \/ Instagram post/ }));
    fireEvent.click(screen.getByRole("button", { name: "JPG" }));
    fireEvent.click(screen.getByRole("button", { name: "1×" }));
    fireEvent.click(screen.getByRole("button", { name: /Download JPG · 1080×1080/ }));

    await waitFor(() => expect(mocks.saveBlob).toHaveBeenCalledWith(expect.any(Blob), "connect-tutors-poster-female-tutor-square-post-1080x1080.jpg"));
    expect(mocks.canvasToImageBlob).toHaveBeenCalledWith(expect.anything(), "jpg");
  });
});
