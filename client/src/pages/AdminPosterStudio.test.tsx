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

  it("switches to the picture-free layout, hides the photo controls and remembers the choice", async () => {
    render(<PosterStudioContent />);
    expect(screen.getByLabelText("Poster photo")).toBeTruthy();
    expect(lastRender().layout).toBe("photo");

    fireEvent.click(screen.getByRole("button", { name: "Without photo" }));
    await waitFor(() => expect(lastRender().layout).toBe("plain"));
    expect(screen.queryByLabelText("Poster photo")).toBeNull();
    expect(JSON.parse(window.localStorage.getItem("connect-poster-studio-v1")!).layout).toBe("plain");

    cleanup();
    render(<PosterStudioContent />);
    expect(screen.getByRole("button", { name: "Without photo" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("picks WhatsApp, the website or no contact line, one at a time", async () => {
    render(<PosterStudioContent />);
    expect(lastRender().content).toMatchObject({ contact: "whatsapp", website: "connecttutorsbd.com" });

    fireEvent.click(screen.getByRole("button", { name: "Website" }));
    await waitFor(() => expect(lastRender().content.contact).toBe("website"));
    expect(screen.getByRole("button", { name: "WhatsApp" }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.change(screen.getByLabelText("Website address"), { target: { value: "www.example.test" } });
    await waitFor(() => expect(lastRender().content.website).toBe("www.example.test"));

    fireEvent.click(screen.getByRole("button", { name: "Website" }));
    await waitFor(() => expect(lastRender().content.contact).toBe("none"));
    expect(screen.queryByLabelText("Website address")).toBeNull();
  });

  it("scales the text with one size step and one slider per part, and remembers them", async () => {
    render(<PosterStudioContent />);
    fireEvent.click(screen.getByRole("button", { name: "Large" }));
    fireEvent.change(screen.getByLabelText("Headline"), { target: { value: "1.2" } });

    await waitFor(() => expect(lastRender().textSize).toMatchObject({ all: 1.12, headline: 1.2, points: 1 }));
    expect(JSON.parse(window.localStorage.getItem("connect-poster-studio-v1")!).textSize.all).toBe(1.12);
  });

  it("switches across the new templates and updates the render input", async () => {
    render(<PosterStudioContent />);

    // Switch to urgent-tuition
    fireEvent.click(screen.getByRole("button", { name: "জরুরি টিউটর" }));
    await waitFor(() => expect(lastRender().template.id).toBe("urgent-tuition"));
    expect(lastRender().content.headline[1].text).toBe("জরুরি অভিজ্ঞ শিক্ষক");

    // Switch to board-admission
    fireEvent.click(screen.getByRole("button", { name: "ভর্তি ও এসএসসি/এইচএসসি" }));
    await waitFor(() => expect(lastRender().template.id).toBe("board-admission"));

    // Switch to english-medium
    fireEvent.click(screen.getByRole("button", { name: "ইংলিশ মিডিয়াম" }));
    await waitFor(() => expect(lastRender().template.id).toBe("english-medium"));

    // Switch to quran-islamic
    fireEvent.click(screen.getByRole("button", { name: "কুরআন শিক্ষা" }));
    await waitFor(() => expect(lastRender().template.id).toBe("quran-islamic"));

    // Switch to tutor-recruitment
    fireEvent.click(screen.getByRole("button", { name: "টিউটর নিয়োগ" }));
    await waitFor(() => expect(lastRender().template.id).toBe("tutor-recruitment"));
  });

  it("copies poster image to clipboard when Copy Image is clicked", async () => {
    const clipboardWrite = vi.fn(async () => {});
    Object.assign(navigator, {
      clipboard: {
        write: clipboardWrite,
      },
    });
    (globalThis as unknown as { ClipboardItem: unknown }).ClipboardItem = vi.fn((items: unknown) => items);

    render(<PosterStudioContent />);
    fireEvent.click(screen.getByRole("button", { name: "Copy Image" }));

    await waitFor(() => expect(mocks.canvasToImageBlob).toHaveBeenCalledWith(expect.anything(), "png"));
    expect(clipboardWrite).toHaveBeenCalled();
  });
});
