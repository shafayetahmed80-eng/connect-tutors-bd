// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mutateSave = vi.fn(async () => ({}));
const mutateReset = vi.fn(async () => ({}));
const invalidate = vi.fn(async () => {});

const mockOverrides = [
  { slotId: "home.hero.title.lead", text: "Build your " },
  { slotId: "home.hero.title.accent", text: "learning connection" },
  { slotId: "home.hero.title.tail", text: " with the right tutor." },
  { slotId: "home.hero.fontFamily", text: "anek-bangla" },
  { slotId: "home.hero.mobileSizePx", text: "18" },
  { slotId: "home.hero.desktopSizePx", text: "56" },
  { slotId: "home.hero.letterSpacing", text: "-0.052em" },
  { slotId: "home.hero.hideMobileDesc", text: "true" },
  { slotId: "home.hero.singleLineMobile", text: "true" },
];

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      siteContent: { list: { invalidate } },
    }),
    siteContent: {
      list: {
        useQuery: () => ({
          data: mockOverrides,
        }),
      },
      save: {
        useMutation: () => ({
          mutateAsync: mutateSave,
          isPending: false,
        }),
      },
      reset: {
        useMutation: () => ({
          mutateAsync: mutateReset,
          isPending: false,
        }),
      },
    },
    imageStudio: {
      uploadedFonts: {
        useQuery: () => ({ data: [] }),
      },
    },
  },
}));

vi.mock("@/lib/image-studio-fonts", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/image-studio-fonts")>()),
  loadStudioFont: vi.fn(async () => {}),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import HomeHeroTypographySuite from "./HomeHeroTypographySuite";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("HomeHeroTypographySuite", () => {
  it("renders all typography, size, spacing and mobile display controls", () => {
    render(<HomeHeroTypographySuite />);

    expect(screen.getByText(/হোমপেইজ হিরো টাইপোগ্রাফি ও ডিসপ্লে কন্ট্রোল/)).toBeTruthy();
    expect(screen.getByDisplayValue(/Build your/)).toBeTruthy();
    expect(screen.getByDisplayValue(/learning connection/)).toBeTruthy();
    expect(screen.getByDisplayValue(/with the right tutor/)).toBeTruthy();
    expect(screen.getByText(/২\. ফন্ট ফ্যামিলি/)).toBeTruthy();
    expect(screen.getByText(/৩\. ফন্ট সাইজ/)).toBeTruthy();
    expect(screen.getByText(/৪\. লেটার স্পেসিং/)).toBeTruthy();
    expect(screen.getByText(/৫\. মোবাইল ডিসপ্লে নিয়ন্ত্রণ/)).toBeTruthy();
  });

  it("switches between Desktop and Mobile preview tabs", () => {
    render(<HomeHeroTypographySuite />);

    // Defaults to mobile tab
    expect(screen.getByText(/সাব-শিরোনাম মোবাইলে লুকানো রয়েছে/)).toBeTruthy();

    // Switch to desktop
    fireEvent.click(screen.getByRole("button", { name: /Desktop/ }));
    expect(screen.getByText("Kicker preview")).toBeTruthy();

    // Switch back to mobile
    fireEvent.click(screen.getByRole("button", { name: /Mobile/ }));
    expect(screen.getByText(/সাব-শিরোনাম মোবাইলে লুকানো রয়েছে/)).toBeTruthy();
  });

  it("updates text and letter spacing, marking changes and calling save", async () => {
    render(<HomeHeroTypographySuite />);

    const leadInput = screen.getByDisplayValue(/Build your/);
    fireEvent.change(leadInput, { target: { value: "নতুন শিরোনাম " } });

    // Click a letter spacing preset
    const normalSpacingBtn = screen.getByRole("button", { name: /স্বাভাবিক \/ Normal/ });
    fireEvent.click(normalSpacingBtn);

    const saveButton = screen.getByRole("button", { name: /সংরক্ষণ করুন/ });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mutateSave).toHaveBeenCalled();
      expect(invalidate).toHaveBeenCalledWith({ page: "home" });
    });
  });

  it("toggles mobile single line and hide description options", () => {
    render(<HomeHeroTypographySuite />);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);

    // Toggle hide description
    fireEvent.click(checkboxes[1]);
    // Toggle single line
    fireEvent.click(checkboxes[0]);
  });
});
