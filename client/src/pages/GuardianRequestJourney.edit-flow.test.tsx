// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updatePending: vi.fn(),
  invalidate: vi.fn(),
  updateOptions: null as null | { onSuccess?: () => void; onError?: (error: { message: string; data?: { code?: string } }) => void },
  request: {
    id: 17,
    status: "new",
    publicationState: "submitted",
    tuitionType: "online",
    category: "English Medium",
    curriculumType: "Cambridge",
    classCourse: "Standard 1",
    subjects: "[\"English\"]",
    learningNeeds: [{ category: "English Medium", curriculumType: "Cambridge", classes: [{ classCourse: "Standard 1", subjects: ["English"] }] }],
    daysPerWeek: 3,
    preferredGender: "female",
    studentFirstName: "Amina",
    studentGender: "female",
    addressDetails: "Private access note",
    groupCapacity: null,
    packageDurationMonths: null,
    studentCount: 1,
    tuitionCityLocationId: null,
    tuitionLocationId: null,
    // A saved request carries its salary; the amount is required now, so an
    // edit cannot get past step two without one.
    budgetAmount: 8000,
    // A referral answer is required too, so an edit stalls on step two
    // without one - the same way it stalls without a salary.
    instituteName: "Dhaka College",
    heardAboutUs: "websites",
    notes: "Weekday afternoons",
  } as Record<string, unknown>,
}));

vi.mock("@/components/SiteHeader", () => ({ default: () => <header /> }));
vi.mock("@/components/SiteFooter", () => ({ default: () => <footer /> }));
vi.mock("@/components/JourneyProgress", () => ({ JourneyProgress: () => <div /> }));
vi.mock("@/pages/JoinTutor", () => ({ SearchableLocationSelect: () => <div /> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ tutorRequests: { mine: { invalidate: mocks.invalidate } } }),
    // Content overrides are cosmetic; an empty list keeps the code defaults.
    siteContent: { list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) }, listBlocks: { useQuery: () => ({ data: [], isLoading: false, isError: false }) } },
    // The Owner-tunable limits; undefined data leaves the form on the shipped numbers.
    siteLimits: { resolved: { useQuery: () => ({ data: undefined, isLoading: false, isError: false }) } },
    auth: { me: { useQuery: () => ({ data: { id: 4, role: "guardian" }, isLoading: false, refetch: vi.fn() }) } },
    catalog: {
      searchGuardianLocations: { useQuery: () => ({ data: [{ id: "dhaka", label: "Dhaka" }] }) },
      searchRegistrationLocations: { useQuery: () => ({ data: [] }) },
    },
    guardianIntake: { phoneStatus: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, capturePhone: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, verifyPhone: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
    guardianAuth: { register: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
    tutorRequests: {
      create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      mine: { useQuery: () => ({ data: [mocks.request], isLoading: false }) },
      updatePending: { useMutation: (options: typeof mocks.updateOptions) => { mocks.updateOptions = options; return { mutate: mocks.updatePending, isPending: false }; } },
    },
  },
}));

import GuardianRequestJourney from "./GuardianRequestJourney";

afterEach(() => {
  cleanup();
  mocks.updatePending.mockReset();
  mocks.invalidate.mockReset();
  mocks.updateOptions = null;
  mocks.request.status = "new";
  mocks.request.publicationState = "submitted";
  window.history.pushState({}, "", "/request-tutor");
});

describe("GuardianRequestJourney Pending edit flow", () => {
  it("prefills the Guardian-owned Pending request and submits updatePending rather than create", async () => {
    window.history.pushState({}, "", "/request-tutor?edit=17");
    render(<GuardianRequestJourney />);

    await waitFor(() => expect(screen.getByRole("list", { name: "Tutor request details progress" })).toBeTruthy());
    // The curriculum, its type, the class and the subject come back chosen, each in its own block.
    const english = screen.getByRole("group", { name: "English Medium" });
    expect((within(english).getByRole("combobox", { name: /Curriculum Type/ }) as HTMLSelectElement).value).toBe("Cambridge");
    expect(within(english).getByRole("button", { name: "Remove Standard 1" })).toBeTruthy();
    expect(within(screen.getByRole("group", { name: "Subjects for Standard 1" })).getByRole("button", { name: "English" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("textbox", { name: /Student first name/ })).toBeNull();
    expect((screen.getByDisplayValue("Private access note") as HTMLTextAreaElement).value).toBe("Private access note");

    // Step 2 carries the submit, and an edit saves rather than sends.
    fireEvent.click(screen.getByRole("button", { name: "Continue to tuition preferences" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(mocks.updatePending).toHaveBeenCalledWith(expect.objectContaining({
      requestId: 17,
      instituteName: "Dhaka College",
      heardAboutUs: "websites",
      tuitionType: "online",
      learningNeeds: [{ category: "English Medium", curriculumType: "Cambridge", classes: [{ classCourse: "Standard 1", subjects: ["English"] }] }],
      studentGender: "female",
      addressDetails: "Private access note",
      notes: "Weekday afternoons",
    }));
  });

  it("opens a request listed without the list of needs as a list of one, from its category, class and subjects", async () => {
    const { learningNeeds, ...withoutList } = mocks.request;
    mocks.request = withoutList;
    try {
      window.history.pushState({}, "", "/request-tutor?edit=17");
      render(<GuardianRequestJourney />);

      await waitFor(() => expect(screen.getByRole("list", { name: "Tutor request details progress" })).toBeTruthy());
      const english = screen.getByRole("group", { name: "English Medium" });
      expect(within(english).getByRole("button", { name: "Remove Standard 1" })).toBeTruthy();
      expect(within(screen.getByRole("group", { name: "Subjects for Standard 1" })).getByRole("button", { name: "English" }).getAttribute("aria-pressed")).toBe("true");
    } finally {
      mocks.request = { ...withoutList, learningNeeds };
    }
  });

  it("does not render a stale non-Pending request as editable", async () => {
    mocks.request.status = "reviewing";
    window.history.pushState({}, "", "/request-tutor?edit=17");
    render(<GuardianRequestJourney />);

    await waitFor(() => expect(window.location.pathname).toBe("/guardian/dashboard/posted-jobs"));
  });
});
