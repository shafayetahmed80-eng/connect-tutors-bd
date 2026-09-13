// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lastInput: null as unknown,
  moderate: vi.fn(),
  profile: {
    tutorId: "tutor-175",
    tutorNumber: 175,
    name: "Tania Sultana",
    gender: "female",
    profileStatus: "approved",
    accountStatus: "active",
    verified: true,
    completionPercentage: 100,
    phone: "+8801711111111",
    contactEmail: "tania@example.test",
    profilePhotoUrl: "/manus-storage/tutors/175/profile-photo.png",
    headline: "Physics and Maths for HSC",
    institution: "Sylhet Agricultural University",
    education: "BSc Fisheries",
    primarySubjectIds: [3],
    additionalSubjectIds: [6],
    classLevelIds: [11],
    curriculumIds: [],
    teachingAreaIds: ["dhaka-thana-gulshan"],
    currentCityId: "dhaka-city",
    currentLocationId: "dhaka-adabor",
    universityId: 56,
    facultyDepartmentId: 4076,
    educationRecords: [],
    uploadedSupportingDocuments: [],
    universityIdDocumentStatus: "uploaded",
    catalogLabels: {
      subjects: { "3": "Mathematics", "6": "Physics" },
      classLevels: { "11": "HSC" },
      curricula: {},
      universities: { "56": "Sylhet Agricultural University" },
      facultyDepartments: { "4076": "Fisheries" },
      locations: { "dhaka-city": "Dhaka", "dhaka-adabor": "Adabor", "dhaka-thana-gulshan": "Gulshan" },
    },
    documents: {
      universityId: "https://signed.example/university-id.png",
      supporting: { nid_card: "https://signed.example/nid.png" } as Record<string, string>,
    },
    fieldConfig: null as unknown,
    createdAt: new Date("2026-08-01T12:00:00.000Z"),
    updatedAt: new Date("2026-11-20T12:00:00.000Z"),
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      getTutorProfile: {
        useQuery: (input: unknown) => {
          mocks.lastInput = input;
          return { data: mocks.profile, isLoading: false, isError: false, error: null };
        },
      },
      moderateTutorProfile: {
        useMutation: () => ({ mutate: mocks.moderate, isPending: false, isError: false, error: null }),
      },
    },
    // The shared workspace module this page borrows `hydrateTeachingProfile`
    // from touches these at import time.
    tutor: { getMyProfile: { useQuery: () => ({ data: null }) } },
    // Site-content overrides are cosmetic here; empty lists keep the shipped copy.
    siteContent: {
      list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
      listBlocks: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
    },
    useUtils: () => ({
      admin: {
        getTutorProfile: { invalidate: vi.fn() },
        listTutorDirectory: { invalidate: vi.fn() },
      },
    }),
  },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { AdminTutorProfileDetailContent } from "./AdminTutorProfileDetail";

afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.profile.profileStatus = "approved"; });

describe("Admin Tutor profile detail", () => {
  it("asks for that Tutor and heads the page with the Admin's own identity strip", () => {
    render(<AdminTutorProfileDetailContent tutorId="tutor-175" />);

    expect(mocks.lastInput).toEqual({ tutorId: "tutor-175" });
    expect(screen.getByRole("heading", { name: "Tania Sultana" })).toBeTruthy();
    expect(screen.getByText("Tutor ID 175")).toBeTruthy();
    // The internal key only addresses the page; it is never shown as the Tutor ID.
    expect(screen.queryByText(/tutor-175/)).toBeNull();
    expect(screen.getByText("approved")).toBeTruthy();
    expect(screen.getByText("Verified")).toBeTruthy();
    expect(screen.getByText("Profile completed: 100%")).toBeTruthy();
    expect(screen.getByText("Created: 01 Aug 2026")).toBeTruthy();
    expect(screen.getByText("Updated: 20 Nov 2026")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Back to Tutor Profiles/i }).getAttribute("href")).toBe("/admin/tutor-profiles");
  });

  it("shows the professional headline here, where the row deliberately does not", () => {
    render(<AdminTutorProfileDetailContent tutorId="tutor-175" />);

    expect(screen.getByText(/Physics and Maths for HSC/)).toBeTruthy();
  });

  it("shows the private documents, and says plainly which are missing", () => {
    render(<AdminTutorProfileDetailContent tutorId="tutor-175" />);

    // The Tutor read-out below carries a "Documents" panel of its own now; the
    // Admin-only tiles are the first.
    const documents = screen.getAllByRole("heading", { name: "Documents" })[0].parentElement!;
    expect(within(documents).getByAltText("University ID").getAttribute("src")).toBe("https://signed.example/university-id.png");
    expect(within(documents).getByAltText("NID Card Image").getAttribute("src")).toBe("https://signed.example/nid.png");
    // The three the Tutor never uploaded.
    expect(within(documents).getAllByText("Not uploaded")).toHaveLength(3);
  });

  it("offers only the decisions the lifecycle allows from the current status", () => {
    render(<AdminTutorProfileDetailContent tutorId="tutor-175" />);

    // Approved: suspension is the one move left.
    fireEvent.click(screen.getByRole("button", { name: /Review & moderate/i }));
    const options = within(screen.getByLabelText(/Next status/i)).getAllByRole("option");
    expect(options.map(option => option.textContent)).toEqual(["Suspend profile"]);
  });

  it("holds the suspension until a reason is written, then sends it", () => {
    render(<AdminTutorProfileDetailContent tutorId="tutor-175" />);

    fireEvent.click(screen.getByRole("button", { name: /Review & moderate/i }));
    const save = screen.getByRole("button", { name: /Save moderation/i }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/Admin reason/i), { target: { value: "  Repeated no-shows  " } });
    expect(save.disabled).toBe(false);

    fireEvent.click(save);
    expect(mocks.moderate).toHaveBeenCalledWith({ tutorId: "tutor-175", nextStatus: "suspended", reason: "Repeated no-shows" });
  });

  it("says plainly when a profile has no Admin action left", () => {
    mocks.profile.profileStatus = "draft";
    render(<AdminTutorProfileDetailContent tutorId="tutor-175" />);

    expect(screen.queryByRole("button", { name: /Review & moderate/i })).toBeNull();
    expect(screen.getByText(/No Admin status action is currently available/i)).toBeTruthy();
  });

  it("renders the Tutor's own read-only view, with the server-resolved labels", () => {
    render(<AdminTutorProfileDetailContent tutorId="tutor-175" />);

    // The shared TutorProfileSummaryView, not a copy.
    expect(screen.getByRole("region", { name: "Profile preview" })).toBeTruthy();
    // Catalog ids arrive already resolved, so no raw number leaks into the view.
    expect(screen.getByText(/Mathematics/)).toBeTruthy();
    expect(screen.getByText(/Sylhet Agricultural University/)).toBeTruthy();
  });
});
