// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lastInput: null as unknown,
  data: {
    items: [
      {
        id: "tutor-175",
        tutorNumber: 777,
        name: "Tania Sultana",
        initials: "TS",
        headline: "Physics and Maths for HSC",
        phone: "+8801711111111",
        institution: "Sylhet Agricultural University",
        instituteName: "Sylhet Agricultural University",
        departmentName: "Fisheries",
        education: "BSc Fisheries",
        subjects: JSON.stringify(["Mathematics", "Physics"]),
        levels: JSON.stringify(["HSC"]),
        teachingExperienceYears: 4,
        mode: "both",
        profileStatus: "approved" as const,
        verified: true,
        cityLabel: "Dhaka",
        locationLabel: "Adabor",
        updatedAt: new Date("2026-09-01T00:00:00.000Z"),
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
      },
      {
        id: "tutor-338",
        tutorNumber: null,
        name: "Sojib",
        initials: "S",
        headline: null,
        phone: null,
        institution: null,
        instituteName: null,
        departmentName: null,
        education: null,
        subjects: null,
        levels: null,
        teachingExperienceYears: null,
        mode: "home",
        profileStatus: "draft" as const,
        verified: false,
        cityLabel: null,
        locationLabel: null,
        updatedAt: null,
        createdAt: new Date("2026-08-20T00:00:00.000Z"),
      },
    ],
    total: 2,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      listTutorDirectory: {
        useQuery: (input: unknown) => {
          mocks.lastInput = input;
          return { data: mocks.data, isLoading: false, isError: false };
        },
      },
    },
  },
}));

import { AdminTutorProfilesContent } from "./AdminTutorProfiles";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Admin Tutor Profiles list", () => {
  it("puts every Tutor on one row with the columns an Admin scans", () => {
    render(<AdminTutorProfilesContent />);

    for (const header of ["Tutor ID", "Name", "Mobile", "Institute", "Department", "City", "Location", "Experience", "Status", "Verified"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeTruthy();
    }

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);

    const first = within(rows[0]);
    // Tutor ID is the registered number; the internal key only addresses the detail page.
    expect(first.getByText("777")).toBeTruthy();
    expect(first.queryByText("tutor-175")).toBeNull();
    expect(first.getByText("Tania Sultana")).toBeTruthy();
    expect(first.getByText("+8801711111111")).toBeTruthy();
    expect(first.getByText("Fisheries")).toBeTruthy();
    expect(first.getByText("Dhaka")).toBeTruthy();
    expect(first.getByText("4 yr")).toBeTruthy();
    expect(first.getByText("approved")).toBeTruthy();

    // An empty column reads "Not set" rather than a blank cell.
    expect(within(rows[1]).getAllByText("Not set").length).toBeGreaterThan(2);
  });

  it("keeps the long columns off the row - they belong to the detail view", () => {
    render(<AdminTutorProfilesContent />);

    for (const header of ["Subjects", "Class levels", "Mode"]) {
      expect(screen.queryByRole("columnheader", { name: header })).toBeNull();
    }
    // The professional headline reads under the name on the Tutor's own
    // profile; here it would push the identifying columns off the screen.
    expect(screen.queryByText("Physics and Maths for HSC")).toBeNull();
  });

  it("points the arrow at that Tutor's own detail page", () => {
    render(<AdminTutorProfilesContent />);

    const link = screen.getByRole("link", { name: /Open the full profile of Tania Sultana/i });
    expect(link.getAttribute("href")).toBe("/admin/tutor-profiles/tutor-175");
  });

  it("sends the typed search and the chosen status to the server", () => {
    render(<AdminTutorProfilesContent />);

    expect(mocks.lastInput).toMatchObject({ query: "", profileStatus: "all", page: 1 });

    // The filter set ships collapsed, as it does on the other Admin screens.
    fireEvent.click(screen.getByRole("button", { name: /Filters/i }));

    fireEvent.change(screen.getByPlaceholderText(/Search Tutor name/i), { target: { value: "Tania" } });
    expect(mocks.lastInput).toMatchObject({ query: "Tania", page: 1 });

    fireEvent.change(screen.getByLabelText("Profile status"), { target: { value: "pending" } });
    expect(mocks.lastInput).toMatchObject({ profileStatus: "pending", page: 1 });
  });
});
