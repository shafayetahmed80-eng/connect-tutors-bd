// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchableLocationSelect } from "./JoinTutor";

afterEach(() => cleanup());

const twoPlaces = [
  { id: "mirpur", label: "Mirpur" },
  { id: "mirpur-10", label: "Mirpur-10 — Mirpur" },
];

function renderPlaces(onChange = vi.fn()) {
  render(
    <SearchableLocationSelect
      label="Thana / Upazila / Area / Sub-area"
      required
      value=""
      options={twoPlaces}
      placeholder="Search thana, upazila, area or sub-area"
      searchPlaceholder="Search location or sub-area"
      emptyMessage="No location matches your search."
      onChange={onChange}
    />,
  );
  return { onChange, field: screen.getByRole("combobox") as HTMLInputElement };
}

describe("Tutor registration location combobox", () => {
  it("filters from the field itself, with no second search box to find first", () => {
    const { field } = renderPlaces();

    // Closed and empty: the field invites a search rather than hiding one.
    expect(field.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("listbox")).toBeNull();

    fireEvent.change(field, { target: { value: "10" } });

    expect(field.getAttribute("aria-expanded")).toBe("true");
    const matches = screen.getAllByRole("option");
    expect(matches).toHaveLength(1);
    expect(matches[0].textContent).toContain("Mirpur-10");
    // The old panel carried its own input; the field is the only one now.
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });

  it("opens the whole list on a click and reads the chosen place back when closed", () => {
    const { onChange, field } = renderPlaces();

    fireEvent.click(field);
    expect(screen.getAllByRole("option")).toHaveLength(2);

    fireEvent.click(screen.getByRole("option", { name: "Mirpur-10 — Mirpur" }));
    expect(onChange).toHaveBeenCalledWith("mirpur-10");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("moves through the list with the arrow keys and picks with Enter", () => {
    const { onChange, field } = renderPlaces();

    fireEvent.keyDown(field, { key: "ArrowDown" });
    expect(field.getAttribute("aria-expanded")).toBe("true");
    // The input keeps focus; aria-activedescendant says which option is live.
    const first = screen.getByRole("option", { name: "Mirpur" });
    expect(field.getAttribute("aria-activedescendant")).toBe(first.id);

    fireEvent.keyDown(field, { key: "ArrowDown" });
    expect(field.getAttribute("aria-activedescendant")).toBe(screen.getByRole("option", { name: "Mirpur-10 — Mirpur" }).id);

    fireEvent.keyDown(field, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("mirpur-10");
  });

  it("does not let Enter escape to the surrounding form while the list is open", () => {
    const onSubmit = vi.fn(event => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <SearchableLocationSelect
          label="City"
          required
          value=""
          options={[{ id: "dhaka-city", label: "Dhaka" }]}
          placeholder="Search a city"
          searchPlaceholder="Search city"
          emptyMessage="No city matches your search."
          onChange={vi.fn()}
        />
      </form>,
    );

    const field = screen.getByRole("combobox");
    fireEvent.click(field);
    const enter = fireEvent.keyDown(field, { key: "Enter" });

    // The journey's form spans all three steps, so Enter here picks a place.
    expect(enter).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("abandons the search on Escape and keeps the list above adjacent fields", () => {
    render(
      <div>
        <SearchableLocationSelect
          label="City"
          required
          value=""
          options={[{ id: "dhaka-city", label: "Dhaka" }]}
          placeholder="Search a city"
          searchPlaceholder="Search city"
          emptyMessage="No city matches your search."
          onChange={vi.fn()}
        />
        <div data-testid="adjacent-location-field">Thana / Upazila</div>
      </div>,
    );

    const field = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "dha" } });
    expect(screen.getByRole("listbox", { name: /city options/i }).className).toContain("z-50");

    fireEvent.keyDown(field, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(field.value).toBe("");
  });

  it("says so when nothing matches, and counts nothing at the reader", () => {
    const { field } = renderPlaces();

    fireEvent.change(field, { target: { value: "kakrail" } });

    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("No location matches your search.")).toBeTruthy();
    // Somebody picking their own area does not need the catalogue counted at them.
    expect(screen.queryByText(/locations available in/)).toBeNull();
    expect(screen.queryByText(/locations match your search/)).toBeNull();
  });

  it("closes when the pointer lands outside its boundary", () => {
    render(
      <div>
        <SearchableLocationSelect
          label="City"
          required
          value=""
          options={[{ id: "dhaka-city", label: "Dhaka" }]}
          placeholder="Search a city"
          searchPlaceholder="Search city"
          emptyMessage="No city matches your search."
          onChange={vi.fn()}
        />
        <button type="button">Outside control</button>
      </div>,
    );

    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox", { name: /city options/i })).toBeTruthy();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside control" }));
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
