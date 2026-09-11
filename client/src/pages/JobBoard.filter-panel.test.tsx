// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const options = {
  countries: ["Bangladesh"],
  tuitionTypes: ["home", "online"],
  daysPerWeek: [3, 4],
  cities: [{ id: "dhaka-city", label: "Dhaka" }],
  locationsByCity: { "dhaka-city": [{ id: "dhaka-adabor", label: "Adabor" }, { id: "dhaka-gulshan", label: "Gulshan" }] },
  classesByCategory: { "Bangla Medium": ["Class 4"], "English Medium": ["O Level"] },
  subjectsByClass: { "Class 4": ["General Maths"], "O Level": ["Physics"] },
};

const mocks = vi.hoisted(() => ({ lastQuery: null as unknown }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("@/lib/siteContent", () => ({
  useSiteContact: () => ({ number: "8801000000000", display: "+8801000000000", tel: "tel:", whatsapp: () => "https://wa.me/x" }),
  useSiteContentResolver: () => (_slot: string, fallback: string) => fallback,
  SiteText: ({ fallback }: { fallback?: string }) => <>{fallback ?? ""}</>,
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ tutor: { myJobInterests: { invalidate: vi.fn() } } }),
    catalog: {
      searchGuardianLocations: { useQuery: () => ({ data: [] }) },
      searchRegistrationLocations: { useQuery: () => ({ data: [] }) },
    },
    jobBoard: {
      filterOptions: { useQuery: () => ({ data: options, isLoading: false }) },
      list: {
        useQuery: (input: unknown) => {
          mocks.lastQuery = input;
          return { data: { items: [], totalCount: 7 }, isLoading: false };
        },
      },
      expressInterest: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      withdrawInterest: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    tutor: {
      myJobInterests: { useQuery: () => ({ data: [] }) },
      getMyProfile: { useQuery: () => ({ data: null }) },
    },
  },
}));

import { JobBoardContent } from "./JobBoard";

afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.lastQuery = null; });

const openPanel = () => fireEvent.click(screen.getByRole("button", { name: /Filter/ }));
// Anchored at both ends: the "Class" field and a "Class 4" option in its own
// list would both answer to a loose prefix.
const chipField = (label: string) => screen.getByRole("combobox", { name: new RegExp(`^${label}(, \\d+ selected)?$`) });
const listFor = (label: string) => screen.getByRole("listbox", { name: label });
// The box opens on click and a list with no limit stays open after a pick, so
// it is only clicked when actually shut.
const openIfShut = (label: string) => {
  if (!screen.queryByRole("listbox", { name: label })) fireEvent.click(chipField(label));
};
const pick = (label: string, option: string) => {
  openIfShut(label);
  fireEvent.click(within(listFor(label)).getByRole("button", { name: option }));
};
const optionsOf = (label: string) => {
  openIfShut(label);
  return within(listFor(label)).getAllByRole("option").map(option => option.textContent);
};

describe("the Job Board filter panel", () => {
  it("stays shut until the Filter button is pressed, then carries the count and a way out", () => {
    render(<JobBoardContent embedded />);
    expect(screen.queryByRole("region", { name: "Job Board filters" })).toBeNull();

    openPanel();
    const panel = within(screen.getByRole("region", { name: "Job Board filters" }));
    expect(panel.getByText(/jobs found/)).toBeTruthy();
    expect(panel.getByRole("button", { name: /Close/ })).toBeTruthy();
    expect(panel.getByRole("button", { name: "Apply" })).toBeTruthy();
    expect(panel.getByRole("button", { name: "Clear" })).toBeTruthy();
  });

  it("holds every choice back until Apply", () => {
    render(<JobBoardContent embedded />);
    openPanel();

    pick("Tuition Type", "Online Tutoring");
    // The board has not moved yet - that is what the Apply button is for.
    expect(mocks.lastQuery).toMatchObject({ page: 1, pageSize: 20 });
    expect(mocks.lastQuery).not.toHaveProperty("tuitionTypes");

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(mocks.lastQuery).toMatchObject({ tuitionTypes: ["online"] });
  });

  it("empties every box and the board together when Clear is pressed", () => {
    render(<JobBoardContent embedded />);
    openPanel();
    pick("Tuition Type", "Online Tutoring");
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(mocks.lastQuery).toMatchObject({ tuitionTypes: ["online"] });

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(mocks.lastQuery).toEqual({ page: 1, pageSize: 20 });
    expect(screen.queryByRole("button", { name: "Remove Online Tutoring" })).toBeNull();
  });

  it("waits for a City before offering areas, and drops them when the City changes", () => {
    render(<JobBoardContent embedded />);
    openPanel();

    expect((chipField("Location") as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("City"), { target: { value: "dhaka-city" } });
    pick("Location", "Adabor");
    expect(screen.getByRole("button", { name: "Remove Adabor" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("City"), { target: { value: "" } });
    expect(screen.queryByRole("button", { name: "Remove Adabor" })).toBeNull();
  });

  it("offers the classes of the chosen categories, and takes them back with the category", () => {
    render(<JobBoardContent embedded />);
    openPanel();

    expect((chipField("Class") as HTMLButtonElement).disabled).toBe(true);

    pick("Category", "Bangla Medium");
    expect(optionsOf("Class")).toEqual(["Class 4"]);

    // A second category adds its own classes, not replaces them.
    pick("Category", "English Medium");
    expect(optionsOf("Class")).toEqual(["Class 4", "O Level"]);

    pick("Class", "Class 4");
    pick("Subject", "General Maths");
    expect(screen.getByRole("button", { name: "Remove General Maths" })).toBeTruthy();

    // Removing the category takes its class, and the subject that class offered.
    fireEvent.click(screen.getByRole("button", { name: "Remove Bangla Medium" }));
    expect(screen.queryByRole("button", { name: "Remove Class 4" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove General Maths" })).toBeNull();
  });

  it("refuses a date range that runs backwards", () => {
    render(<JobBoardContent embedded />);
    openPanel();

    fireEvent.change(screen.getByLabelText("Posted Date From"), { target: { value: "2026-11-20" } });
    fireEvent.change(screen.getByLabelText("Posted Date To"), { target: { value: "2026-11-01" } });

    expect(screen.getByRole("alert").textContent).toMatch(/cannot be later than/);
    expect((screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
