// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    budgetMode: "discuss",
    budgetMinimum: null,
    budgetMaximum: null,
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
    auth: { me: { useQuery: () => ({ data: { id: 4, role: "guardian" }, isLoading: false, refetch: vi.fn() }) } },
    catalog: {
      searchGuardianLocations: { useQuery: () => ({ data: [{ id: "dhaka", label: "Dhaka" }] }) },
      searchRegistrationLocations: { useQuery: () => ({ data: [] }) },
    },
    guardianIntake: { capturePhone: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
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

    await waitFor(() => expect(screen.getByText("Tell us about the learning needs")).toBeTruthy());
    expect((screen.getByDisplayValue("English Medium") as HTMLSelectElement).value).toBe("English Medium");
    expect((screen.getByDisplayValue("Standard 1") as HTMLSelectElement).value).toBe("Standard 1");
    expect(screen.queryByRole("textbox", { name: /Student first name/ })).toBeNull();
    expect((screen.getByDisplayValue("Private access note") as HTMLTextAreaElement).value).toBe("Private access note");

    fireEvent.click(screen.getByRole("button", { name: "Continue to tuition preferences" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to tuition preferences" }));
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    expect(mocks.updatePending).toHaveBeenCalledWith(expect.objectContaining({
      requestId: 17,
      tuitionType: "online",
      category: "English Medium",
      curriculumType: "Cambridge",
      classCourse: "Standard 1",
      subjects: ["English"],
      studentGender: "female",
      addressDetails: "Private access note",
      notes: "Weekday afternoons",
    }));
  });

  it("does not render a stale non-Pending request as editable", async () => {
    mocks.request.status = "reviewing";
    window.history.pushState({}, "", "/request-tutor?edit=17");
    render(<GuardianRequestJourney />);

    await waitFor(() => expect(window.location.pathname).toBe("/guardian/dashboard/posted-jobs"));
  });
});
