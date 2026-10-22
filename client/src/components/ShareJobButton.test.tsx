// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ShareJobButton from "./ShareJobButton";

let mockIsMobile = false;

vi.mock("@/hooks/useMobile", () => ({
  useIsMobile: () => mockIsMobile,
}));

const mockShareJob = vi.fn();
vi.mock("@/lib/shareJob", () => ({
  shareJob: (...args: unknown[]) => mockShareJob(...args),
}));

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

const sampleJob = {
  jobId: "6801",
  title: "Need a Tutor for Class 8",
  tuitionType: "home",
  category: "Bangla Medium",
  classCourse: "Class 8",
  subjects: ["Math", "Physics"],
  locationLabel: "Dhanmondi, Dhaka",
  budgetAmount: 6000,
  daysPerWeek: 3,
};

describe("ShareJobButton", () => {
  beforeEach(() => {
    mockIsMobile = false;
    mockShareJob.mockResolvedValue("copied");
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders desktop popover when isMobile is false", async () => {
    mockIsMobile = false;
    render(<ShareJobButton job={sampleJob} labelled />);

    const shareBtn = screen.getByRole("button", { name: "Share this tuition" });
    expect(shareBtn).toBeTruthy();

    fireEvent.click(shareBtn);

    const dialog = screen.getByRole("dialog", { name: "Share options" });
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByText("Share Tuition")).toBeTruthy();
    expect(within(dialog).getByText("ID: 6801")).toBeTruthy();
    expect(within(dialog).getByText("Share to WhatsApp")).toBeTruthy();
    expect(within(dialog).getByText("Share on Facebook")).toBeTruthy();
    expect(within(dialog).getByText("Copy Link")).toBeTruthy();
    expect(within(dialog).getByText("Copy Full Details")).toBeTruthy();
  });

  it("renders mobile bottom sheet drawer when isMobile is true", async () => {
    mockIsMobile = true;
    render(<ShareJobButton job={sampleJob} labelled />);

    const shareBtn = screen.getByRole("button", { name: "Share this tuition" });
    expect(shareBtn).toBeTruthy();

    fireEvent.click(shareBtn);

    const sheetDialog = screen.getByRole("dialog", { name: "Share options" });
    expect(sheetDialog).toBeTruthy();

    // Check bottom sheet specific structure
    expect(sheetDialog.getAttribute("data-slot")).toBe("sheet-content");
    expect(within(sheetDialog).getByText("Share Tuition")).toBeTruthy();
    expect(within(sheetDialog).getByText("ID: 6801")).toBeTruthy();
    expect(within(sheetDialog).getByText("Share to WhatsApp")).toBeTruthy();
    expect(within(sheetDialog).getByText("Share on Facebook")).toBeTruthy();
    expect(within(sheetDialog).getByText("Copy Link")).toBeTruthy();
    expect(within(sheetDialog).getByText("Copy Full Details")).toBeTruthy();
  });

  it("copies link and provides feedback in mobile sheet", async () => {
    mockIsMobile = true;
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ShareJobButton job={sampleJob} labelled />);

    fireEvent.click(screen.getByRole("button", { name: "Share this tuition" }));
    const copyLinkBtn = screen.getByRole("button", { name: /Copy Link/ });
    fireEvent.click(copyLinkBtn);

    await waitFor(() => {
      expect(screen.getByText("Link Copied!")).toBeTruthy();
      expect(mockToast.success).toHaveBeenCalledWith("Tuition link copied to clipboard");
    });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/job-board?job=6801"));
  });

  it("closes mobile bottom sheet when clicking WhatsApp", () => {
    mockIsMobile = true;
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<ShareJobButton job={sampleJob} labelled />);

    fireEvent.click(screen.getByRole("button", { name: "Share this tuition" }));
    expect(screen.getByRole("dialog", { name: "Share options" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Share to WhatsApp/ }));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining("whatsapp.com"), "_blank", expect.any(String));

    openSpy.mockRestore();
  });

  it("calls quickShare directly when labelled is false", async () => {
    render(<ShareJobButton job={sampleJob} labelled={false} />);

    const iconBtn = screen.getByRole("button", { name: "Share this tuition" });
    fireEvent.click(iconBtn);

    await waitFor(() => {
      expect(mockShareJob).toHaveBeenCalledWith(sampleJob);
    });
  });
});
