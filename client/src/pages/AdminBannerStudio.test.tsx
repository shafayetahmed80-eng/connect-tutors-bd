// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveBlob: vi.fn(),
  canvasToImageBlob: vi.fn(async () => new Blob(["png"])),
  renderBanner: vi.fn(),
}));

vi.mock("@/lib/image-studio", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/image-studio")>()),
  saveBlob: mocks.saveBlob,
  canvasToImageBlob: mocks.canvasToImageBlob,
}));

vi.mock("@/lib/banner-studio", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/banner-studio")>()),
  renderBanner: mocks.renderBanner,
}));

vi.mock("@/lib/siteContent", () => ({
  useSiteContact: () => ({ number: "8801516131411" }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      imageStudio: { marks: { invalidate: vi.fn() }, uploadedFonts: { invalidate: vi.fn() } },
    }),
    imageStudio: {
      marks: { useQuery: () => ({ data: { marks: [], canEdit: false } }) },
      uploadedFonts: { useQuery: () => ({ data: [] }) },
      setMark: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      deleteFont: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { BannerStudioContent } from "./AdminBannerStudio";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const lastRender = () => mocks.renderBanner.mock.calls.at(-1)![1];

describe("BannerStudioContent", () => {
  it("renders default brand-hero banner at 1640×624 for Facebook cover", async () => {
    render(<BannerStudioContent />);

    await waitFor(() => expect(mocks.renderBanner).toHaveBeenCalled());
    expect(lastRender()).toMatchObject({
      width: 1640,
      height: 624,
      scale: 1,
      sizeId: "facebook-cover",
    });
    expect(lastRender().template.id).toBe("brand-hero");
    expect(screen.getByTestId("banner-studio-preview")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Download PNG · 1640×624/ })).toBeTruthy();
  });

  it("toggles the platform safe-zone overlay guide", async () => {
    render(<BannerStudioContent />);
    await waitFor(() => expect(mocks.renderBanner).toHaveBeenCalled());

    expect(lastRender().showSafeZoneOverlay).toBe(false);

    const toggleBtn = screen.getByRole("button", { name: /Show Safe Area/ });
    fireEvent.click(toggleBtn);

    await waitFor(() => expect(lastRender().showSafeZoneOverlay).toBe(true));
    expect(screen.getByText(/Mobile Safe Zone/)).toBeTruthy();
  });

  it("switches templates and themes, and updates render input", async () => {
    render(<BannerStudioContent />);

    // Select Academic services template
    const servicesBtn = screen.getByRole("button", { name: /একাডেমিক ও কারিকুলাম স্পেশাল/ });
    fireEvent.click(servicesBtn);

    await waitFor(() => expect(lastRender().template.id).toBe("services-highlight"));
    expect(lastRender().theme.id).toBe("emerald");

    // Select Crimson theme
    const crimsonBtn = screen.getByRole("button", { name: "Royal Crimson" });
    fireEvent.click(crimsonBtn);

    await waitFor(() => expect(lastRender().theme.id).toBe("crimson"));
  });

  it("edits headline and persists changes to localStorage", async () => {
    render(<BannerStudioContent />);

    const headlineInput = screen.getByPlaceholderText("আপনার সন্তানের জন্য");
    fireEvent.change(headlineInput, { target: { value: "অভিজ্ঞ টিউটর প্রয়োজন" } });

    await waitFor(() => expect(lastRender().content.headlineMain).toBe("অভিজ্ঞ টিউটর প্রয়োজন"));
    const saved = JSON.parse(window.localStorage.getItem("connect-banner-studio-v1")!);
    expect(saved.content.headlineMain).toBe("অভিজ্ঞ টিউটর প্রয়োজন");
  });

  it("adds and updates feature pills", async () => {
    render(<BannerStudioContent />);

    expect(screen.getAllByPlaceholderText("পয়েন্টের বিবরণ...")).toHaveLength(3);

    const addBtn = screen.getByRole("button", { name: "+ Add Point" });
    fireEvent.click(addBtn);

    expect(screen.getAllByPlaceholderText("পয়েন্টের বিবরণ...")).toHaveLength(4);
    await waitFor(() => expect(lastRender().content.pills).toHaveLength(4));
  });

  it("downloads banner with chosen format, size and scale", async () => {
    render(<BannerStudioContent />);

    // Select Link share banner size
    const shareSizeBtn = screen.getByRole("button", { name: /^Link share banner/ });
    fireEvent.click(shareSizeBtn);

    // Select JPG format
    const jpgBtn = screen.getByRole("button", { name: "JPG" });
    fireEvent.click(jpgBtn);

    // Click download
    const downloadBtn = screen.getByRole("button", { name: /Download JPG · 1200×630/ });
    fireEvent.click(downloadBtn);

    await waitFor(() =>
      expect(mocks.saveBlob).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.stringContaining("connect-tutors-banner-share-banner-1200x630.jpg"),
      ),
    );
  });
});
