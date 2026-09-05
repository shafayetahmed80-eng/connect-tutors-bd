// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchableMultiSelect, SearchableSingleSelect } from "./TutorProfileSelectors";

function TeachingAreaHarness() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  return <SearchableMultiSelect
    label="Teaching areas"
    emptyMessage="No matching Bangladesh areas found."
    options={[
      { id: "dhaka-uttara", label: "Uttara, Dhaka" },
      { id: "dhaka-mirpur", label: "Mirpur, Dhaka" },
      { id: "ctg-panchlaish", label: "Panchlaish, Chattogram" },
    ]}
    selectedIds={selectedIds}
    onChange={setSelectedIds}
  />;
}

describe("Tutor Profile selector controls", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("filters teaching areas with the keyboard and exposes the selection count", async () => {
    const user = userEvent.setup();
    render(<TeachingAreaHarness />);

    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: /teaching areas/i }).getAttribute("aria-expanded")).toBe("true");
    await user.type(screen.getByRole("searchbox", { name: /search teaching areas/i }), "uttara");

    expect(screen.getByRole("checkbox", { name: /uttara, dhaka/i })).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: /mirpur, dhaka/i })).toBeNull();

    await user.click(screen.getByRole("checkbox", { name: /uttara, dhaka/i }));
    expect(screen.getByRole("button", { name: /teaching areas.*1 selected/i })).toBeTruthy();
  });

  it("forwards teaching-area search text so the supplied Bangladesh hierarchy can be searched server-side", async () => {
    const user = userEvent.setup();
    const onSearchQueryChange = vi.fn();
    render(<SearchableMultiSelect
      label="Teaching areas"
      emptyMessage="No matching Bangladesh areas found."
      options={[{ id: "dhaka-uttara-sector-1", label: "Dhaka › Uttara › Sector 1" }]}
      selectedIds={[]}
      onChange={vi.fn()}
      onSearchQueryChange={onSearchQueryChange}
    />);

    await user.click(screen.getByRole("button", { name: /teaching areas/i }));
    await user.type(screen.getByRole("searchbox", { name: /search teaching areas/i }), "uttara");

    expect(onSearchQueryChange).toHaveBeenLastCalledWith("uttara");
  });

  it("opens a focus-contained, touch-friendly selector sheet on a mobile viewport", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    vi.stubGlobal("matchMedia", () => ({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      matches: true,
    }));
    const user = userEvent.setup();
    render(<TeachingAreaHarness />);

    await user.click(screen.getByRole("button", { name: /teaching areas/i }));

    expect(await screen.findByRole("dialog", { name: /teaching areas/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /done/i })).toBeTruthy();
    expect(screen.getByText(/0 selected/i)).toBeTruthy();
  });

  it("stages mobile selections until Done and discards them on Cancel", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    vi.stubGlobal("matchMedia", () => ({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      matches: true,
    }));
    const user = userEvent.setup();
    render(<TeachingAreaHarness />);

    const trigger = screen.getByRole("button", { name: /teaching areas/i });
    await user.click(trigger);
    await user.click(screen.getByRole("checkbox", { name: /uttara, dhaka/i }));
    // Staged-but-uncommitted picks must not show on the closed trigger.
    expect(trigger.textContent).toMatch(/^Select teaching areas$/i);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    // Staged-but-uncommitted picks must not show on the closed trigger.
    expect(trigger.textContent).toMatch(/^Select teaching areas$/i);

    await user.click(trigger);
    await user.click(screen.getByRole("checkbox", { name: /uttara, dhaka/i }));
    await user.click(screen.getByRole("button", { name: /done/i }));
    expect(trigger.textContent).toMatch(/1 selected/i);
  });

  it("single-select: opens the desktop popover, filters, and picks one value", async () => {
    const user = userEvent.setup();
    function ReligionHarness() {
      const [value, setValue] = useState("");
      return <SearchableSingleSelect
        label="Religion"
        options={[
          { id: "Islam", label: "Islam" },
          { id: "Hinduism", label: "Hinduism" },
          { id: "Christianity", label: "Christianity" },
        ]}
        value={value}
        onChange={setValue}
        emptyMessage="No religion found."
      />;
    }
    render(<ReligionHarness />);

    const trigger = screen.getByRole("button", { name: /religion/i });
    await user.click(trigger);
    // The list is portalled out of any scroll container, so screen finds it.
    await user.type(screen.getByRole("searchbox", { name: /search religion/i }), "hind");
    expect(screen.queryByRole("option", { name: /islam/i })).toBeNull();

    await user.click(screen.getByRole("option", { name: /hinduism/i }));
    expect(screen.getByRole("button", { name: /religion.*hinduism/i })).toBeTruthy();
  });
});
