// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchableLocationSelect } from "./JoinTutor";

afterEach(() => cleanup());

describe("Tutor registration location dropdown", () => {
  it("keeps the open city menu above adjacent location fields and selects an option", () => {
    const onChange = vi.fn();
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
          onChange={onChange}
        />
        <div data-testid="adjacent-location-field">Thana / Upazila</div>
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: /search a city/i }));
    const menu = screen.getByRole("listbox", { name: /city options/i }).parentElement;
    expect(menu?.className).toContain("z-50");
    expect(screen.getByRole("option", { name: "Dhaka" })).toBeTruthy();

    fireEvent.click(screen.getByRole("option", { name: "Dhaka" }));
    expect(onChange).toHaveBeenCalledWith("dhaka-city");
  });

  it("keeps parent locations and qualified sub-areas together in the City-scoped searchable selector", () => {
    const onChange = vi.fn();
    render(
      <SearchableLocationSelect
        label="Thana / Upazila / Area / Sub-area"
        required
        value=""
        options={[
          { id: "mirpur", label: "Mirpur" },
          { id: "mirpur-10", label: "Mirpur-10 — Mirpur" },
        ]}
        placeholder="Search thana, upazila, area or sub-area"
        searchPlaceholder="Search location or sub-area"
        emptyMessage="No location matches your search."
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /search thana/i }));
    fireEvent.change(screen.getByPlaceholderText("Search location or sub-area"), { target: { value: "mirpur" } });
    expect(screen.getByRole("option", { name: "Mirpur" })).toBeTruthy();
    fireEvent.click(screen.getByRole("option", { name: "Mirpur-10 — Mirpur" }));
    expect(onChange).toHaveBeenCalledWith("mirpur-10");
  });

  it("shows the selected City total and filtered location counts", () => {
    render(
      <SearchableLocationSelect
        label="Thana / Upazila / Area / Sub-area"
        required
        value=""
        options={[
          { id: "mirpur", label: "Mirpur" },
          { id: "mirpur-10", label: "Mirpur-10 — Mirpur" },
        ]}
        placeholder="Search thana, upazila, area or sub-area"
        searchPlaceholder="Search location or sub-area"
        emptyMessage="No location matches your search."
        countContext="Dhaka"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("2 locations available in Dhaka")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /search thana/i }));
    fireEvent.change(screen.getByPlaceholderText("Search location or sub-area"), { target: { value: "10" } });
    expect(screen.getByText("1 of 2 locations match your search")).toBeTruthy();
  });

  it("closes an open dropdown when the user clicks outside its boundary", () => {
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

    fireEvent.click(screen.getByRole("button", { name: /search a city/i }));
    expect(screen.getByRole("listbox", { name: /city options/i })).toBeTruthy();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside control" }));
    expect(screen.queryByRole("listbox", { name: /city options/i })).toBeNull();
  });
});
