// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  results: [] as Array<{ id: number; name: string; division: string | null }>,
  lastQuery: null as string | null,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    catalog: {
      searchSchoolColleges: {
        useQuery: (input: { query: string }, options: { enabled: boolean }) => {
          if (options.enabled) state.lastQuery = input.query;
          return { data: options.enabled ? state.results : undefined, isFetching: false };
        },
      },
    },
  },
}));

import SchoolAutocompleteInput from "./SchoolAutocompleteInput";

function Harness({ onSelect }: { onSelect?: (name: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <SchoolAutocompleteInput
      value={value}
      onChange={v => {
        setValue(v);
        onSelect?.(v);
      }}
      placeholder="Search school"
      aria-label="School or college"
    />
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  state.results = [];
  state.lastQuery = null;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("SchoolAutocompleteInput", () => {
  it("renders controlled input and calls onChange when typing freely", () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);

    const input = screen.getByRole("combobox", { name: "School or college" });
    fireEvent.change(input, { target: { value: "Custom High School" } });

    expect(onSelect).toHaveBeenCalledWith("Custom High School");
  });

  it("queries suggestions after debounce and allows selecting from dropdown", () => {
    const onSelect = vi.fn();
    state.results = [
      { id: 1, name: "Notre Dame College", division: "dhaka" },
      { id: 2, name: "Notre Dame University Bangladesh", division: "dhaka" },
    ];

    render(<Harness onSelect={onSelect} />);
    const input = screen.getByRole("combobox", { name: "School or college" });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Notre" } });

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(state.lastQuery).toBe("Notre");
    expect(screen.getByRole("listbox")).toBeTruthy();

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0].textContent).toContain("Notre Dame College");

    fireEvent.click(options[0]);
    expect(onSelect).toHaveBeenCalledWith("Notre Dame College");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("navigates suggestions with arrow keys and selects with Enter", () => {
    const onSelect = vi.fn();
    state.results = [
      { id: 1, name: "Viqarunnisa Noon School & College", division: "dhaka" },
      { id: 2, name: "Rajshahi Collegiate School", division: "rajshahi" },
    ];

    render(<Harness onSelect={onSelect} />);
    const input = screen.getByRole("combobox", { name: "School or college" });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "School" } });

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.getByRole("listbox")).toBeTruthy();

    // Arrow down to second option
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith("Rajshahi Collegiate School");
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
