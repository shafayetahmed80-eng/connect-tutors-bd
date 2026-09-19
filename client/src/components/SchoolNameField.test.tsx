// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  results: [] as Array<{ id: number; name: string; division: string | null; own: boolean }>,
  lastQuery: null as string | null,
  create: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ catalog: { searchSchoolColleges: { invalidate: vi.fn() } } }),
    catalog: {
      searchSchoolColleges: {
        useQuery: (input: { query: string }, options: { enabled: boolean }) => {
          if (options.enabled) state.lastQuery = input.query;
          return { data: options.enabled ? state.results : undefined, isFetching: false };
        },
      },
      createSchoolCollege: { useMutation: () => ({ mutate: state.create, isPending: false }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import SchoolNameField from "./SchoolNameField";

function Harness({ onSaved }: { onSaved: (name: string) => void }) {
  const [value, setValue] = useState("Dhaka College");
  return <SchoolNameField label="Institute Name" required value={value} onChange={name => { setValue(name); onSaved(name); }} />;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
  state.results = [];
  state.lastQuery = null;
});

function type(text: string) {
  const box = screen.getByRole("combobox", { name: /Institute Name/ });
  fireEvent.focus(box);
  fireEvent.change(box, { target: { value: text } });
  act(() => { vi.advanceTimersByTime(250); });
  return box;
}

describe("the school and college box", () => {
  it("lists matches with their division, and saves the one chosen", () => {
    const saved = vi.fn();
    state.results = [{ id: 4, name: "Madhupur Shahid Smrity Higher Secondary School", division: "mymensingh", own: false }];
    render(<Harness onSaved={saved} />);
    type("Madhupur Shahid Smrity");
    expect(state.lastQuery).toBe("Madhupur Shahid Smrity");
    expect(screen.getByRole("option", { name: /Madhupur Shahid Smrity Higher Secondary School/ }).textContent).toContain("Mymensingh");
    fireEvent.click(screen.getByRole("option", { name: /Higher Secondary School/ }));
    expect(saved).toHaveBeenCalledWith("Madhupur Shahid Smrity Higher Secondary School");
  });

  it("offers Create for a name the list does not have, and not for one it has", () => {
    state.results = [{ id: 4, name: "Madhupur Shahid Smrity Higher Secondary School", division: "mymensingh", own: false }];
    render(<Harness onSaved={vi.fn()} />);
    type("Madhupur Shahid Smrity");
    fireEvent.click(screen.getByRole("option", { name: 'Create "Madhupur Shahid Smrity"' }));
    expect(state.create).toHaveBeenCalledWith({ name: "Madhupur Shahid Smrity" }, expect.anything());

    type("madhupur shahid smrity higher secondary school");
    expect(screen.queryByRole("option", { name: /^Create/ })).toBeNull();
  });

  it("puts the saved name back when the box is left without choosing", () => {
    const saved = vi.fn();
    render(<Harness onSaved={saved} />);
    const box = type("Something half typed") as HTMLInputElement;
    fireEvent.blur(box);
    expect(box.value).toBe("Dhaka College");
    expect(saved).not.toHaveBeenCalled();
  });
});
