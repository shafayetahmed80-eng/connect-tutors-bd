// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PRESET_GROUPS,
  FB_SAVED_GROUPS_STORAGE_KEY,
  FacebookGroupHelperModal,
  loadSavedFacebookGroups,
  saveFacebookGroupsToStorage,
} from "./FacebookGroupHelperModal";

describe("FacebookGroupHelperModal", () => {
  beforeEach(() => {
    localStorage.clear();
    window.open = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("loads default presets when local storage is empty", () => {
    const groups = loadSavedFacebookGroups();
    expect(groups.length).toBe(DEFAULT_PRESET_GROUPS.length);
    expect(groups[0].name).toBe("Connect Tutors Official Page");
  });

  it("saves and reloads groups from local storage", () => {
    const custom = [
      {
        id: "custom-1",
        name: "Test Group",
        url: "https://facebook.com/groups/test",
        category: "Test",
      },
    ];
    saveFacebookGroupsToStorage(custom);
    const loaded = loadSavedFacebookGroups();
    expect(loaded.length).toBe(1);
    expect(loaded[0].name).toBe("Test Group");
  });

  it("renders modal with default groups and allows searching", () => {
    render(
      <FacebookGroupHelperModal
        isOpen={true}
        onClose={vi.fn()}
        postTextToCopy="Test post text"
        activeLocation="Dhanmondi"
        activeCategory="English Medium"
      />
    );

    expect(screen.getByText(/Facebook Group Helper/i)).toBeDefined();
    expect(screen.getByText("Connect Tutors Official Page")).toBeDefined();
    expect(screen.getByText("Dhanmondi & Mohammadpur Tuition Community")).toBeDefined();

    // Search filter
    const searchInput = screen.getByPlaceholderText(/গ্রুপের নাম বা ক্যাটাগরি দিয়ে খুঁজুন/i);
    fireEvent.change(searchInput, { target: { value: "English Medium" } });

    expect(screen.getByText("English Medium & Cambridge Tutors Dhaka")).toBeDefined();
    expect(screen.queryByText("Dhanmondi & Mohammadpur Tuition Community")).toBeNull();
  });

  it("allows adding a new custom group", () => {
    render(
      <FacebookGroupHelperModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    // Click "নতুন গ্রুপ যোগ করুন"
    const toggleBtn = screen.getByRole("button", { name: /নতুন গ্রুপ যোগ করুন/i });
    fireEvent.click(toggleBtn);

    const nameInput = screen.getByPlaceholderText(/যেমন: Dhanmondi Tutors/i);
    const urlInput = screen.getByPlaceholderText(/গ্রুপের লিংক/i);
    const catInput = screen.getByPlaceholderText(/ক্যাটাগরি বা এলাকা/i);

    fireEvent.change(nameInput, { target: { value: "Gulshan Tuition Circle" } });
    fireEvent.change(urlInput, { target: { value: "facebook.com/groups/gulshantuition" } });
    fireEvent.change(catInput, { target: { value: "Gulshan" } });

    const submitBtn = screen.getByRole("button", { name: /সংরক্ষণ করুন/i });
    fireEvent.submit(submitBtn.closest("form")!);

    expect(screen.getByText("Gulshan Tuition Circle")).toBeDefined();
    expect(screen.getAllByText("Gulshan").length).toBeGreaterThanOrEqual(1);

    // Verify localStorage updated
    const saved = JSON.parse(localStorage.getItem(FB_SAVED_GROUPS_STORAGE_KEY) || "[]");
    expect(saved.some((g: any) => g.name === "Gulshan Tuition Circle")).toBe(true);
  });

  it("copies post text and opens group in new tab on Copy & Open click", async () => {
    render(
      <FacebookGroupHelperModal
        isOpen={true}
        onClose={vi.fn()}
        postTextToCopy="Sample Job Post Text with #ConnectTutors"
      />
    );

    const copyBtns = screen.getAllByRole("button", { name: /Copy & Open Group/i });
    expect(copyBtns.length).toBeGreaterThan(0);

    fireEvent.click(copyBtns[0]);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Sample Job Post Text with #ConnectTutors");
      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining("facebook.com"),
        "_blank",
        "noopener,noreferrer"
      );
    });
  });
});
