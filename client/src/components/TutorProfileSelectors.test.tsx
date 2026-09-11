// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  it("filters teaching areas from the field itself and exposes the selection count", async () => {
    // On a desktop the field is the search box: tabbing into it opens the
    // list, and the first keystroke narrows 597 areas without a click.
    const user = userEvent.setup();
    render(<TeachingAreaHarness />);

    await user.tab();
    const field = screen.getByRole("combobox", { name: /teaching areas/i });
    // Focus alone must not open it - see the autofocus test below.
    expect(field.getAttribute("aria-expanded")).toBe("false");
    await user.type(field, "uttara");
    expect(field.getAttribute("aria-expanded")).toBe("true");

    expect(screen.getByRole("option", { name: /uttara, dhaka/i })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /mirpur, dhaka/i })).toBeNull();

    await user.click(screen.getByRole("button", { name: /uttara, dhaka/i }));
    expect(screen.getByRole("combobox", { name: /teaching areas.*1 selected/i })).toBeTruthy();
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

    await user.type(screen.getByRole("combobox", { name: /teaching areas/i }), "uttara");

    expect(onSearchQueryChange).toHaveBeenLastCalledWith("uttara");
  });

  it("does not open itself when something else moves focus into the field", async () => {
    // `useIsMobile` reports false on the first render and corrects itself in
    // an effect, so on a phone this input is what a modal autofocuses. Opening
    // from that focus popped the first field's Sheet the moment the section
    // modal appeared.
    render(<TeachingAreaHarness />);
    const field = screen.getByRole("combobox", { name: /teaching areas/i });

    field.focus();
    expect(field.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(field);
    expect(field.getAttribute("aria-expanded")).toBe("true");
  });

  it("shows the same chip box on a phone, with no sheet to open", async () => {
    // The full-height Sheet is gone: it came with Cancel/Done staging and a
    // list of ticks, and the chip box answers all of that in the field itself.
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    vi.stubGlobal("matchMedia", () => ({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      matches: true,
    }));
    const user = userEvent.setup();
    render(<TeachingAreaHarness />);

    const field = screen.getByRole("combobox", { name: /teaching areas/i });
    await user.click(field);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: /^done$/i })).toBeNull();
    expect(screen.getByRole("listbox", { name: /teaching areas/i })).toBeTruthy();
  });

  it("puts a chosen value in the box and takes it out of the list, on any screen", async () => {
    const user = userEvent.setup();
    render(<TeachingAreaHarness />);

    await user.click(screen.getByRole("combobox", { name: /teaching areas/i }));
    await user.click(screen.getByRole("button", { name: /uttara, dhaka/i }));

    expect(screen.getByRole("button", { name: /^Remove Uttara, Dhaka$/i })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /uttara, dhaka/i })).toBeNull();

    await user.click(screen.getByRole("button", { name: /^Remove Uttara, Dhaka$/i }));
    expect(screen.queryByRole("button", { name: /^Remove Uttara, Dhaka$/i })).toBeNull();
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
