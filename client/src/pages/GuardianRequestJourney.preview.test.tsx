// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  updatePending: vi.fn(),
  invalidate: vi.fn(),
  navigate: vi.fn(),
  createOptions: null as null | { onSuccess?: (result: { id: number }) => void; onError?: (error: { message: string }) => void },
}));

vi.mock("@/components/SiteHeader", () => ({ default: () => <header /> }));
vi.mock("@/components/SiteFooter", () => ({ default: () => <footer /> }));
vi.mock("@/components/JourneyProgress", () => ({ JourneyProgress: () => <div /> }));
vi.mock("@/pages/JoinTutor", () => ({ SearchableLocationSelect: () => <div /> }));
vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return { ...actual, useLocation: () => ["/guardian/dashboard/hire", mocks.navigate] };
});
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ tutorRequests: { mine: { invalidate: mocks.invalidate } } }),
    siteContent: { list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) }, listBlocks: { useQuery: () => ({ data: [], isLoading: false, isError: false }) } },
    siteLimits: { resolved: { useQuery: () => ({ data: undefined, isLoading: false, isError: false }) } },
    auth: { me: { useQuery: () => ({ data: { id: 4, role: "guardian" }, isLoading: false, refetch: vi.fn() }) } },
    catalog: {
      searchGuardianLocations: { useQuery: () => ({ data: [{ id: "dhaka", label: "Dhaka" }] }) },
      searchRegistrationLocations: { useQuery: () => ({ data: [{ id: "mirpur", label: "Mirpur" }] }) },
      searchSchoolColleges: { useQuery: () => ({ data: [], isFetching: false }) },
    },
    guardianIntake: { phoneStatus: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, capturePhone: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, verifyPhone: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
    guardianAuth: { register: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
    tutorRequests: {
      create: { useMutation: (options: typeof mocks.createOptions) => { mocks.createOptions = options; return { mutate: mocks.create, isPending: false }; } },
      mine: { useQuery: () => ({ data: [], isLoading: false }) },
      updatePending: { useMutation: () => ({ mutate: mocks.updatePending, isPending: false }) },
    },
  },
}));

import GuardianRequestJourney, { buildPreviewJobData } from "./GuardianRequestJourney";
import { jobIdForRequest } from "@shared/job-id";

afterEach(() => {
  cleanup();
  mocks.create.mockReset();
  mocks.updatePending.mockReset();
  mocks.invalidate.mockReset();
  mocks.navigate.mockReset();
  mocks.createOptions = null;
  window.sessionStorage.clear();
});

function select(label: string, value: string) {
  fireEvent.change(screen.getByRole("combobox", { name: new RegExp(label) }), { target: { value } });
}

function chooseFirstChip(scope: HTMLElement | Document, label: RegExp) {
  const box = within(scope as HTMLElement).getByRole("combobox", { name: label });
  fireEvent.click(box);
  const option = within(within(scope as HTMLElement).getByRole("listbox")).getAllByRole("option")[0];
  const choice = within(option).getByRole("button");
  const name = choice.textContent?.trim() ?? "";
  fireEvent.click(choice);
  return name;
}

function fillThroughStepOne() {
  select("Tuition type", "online");
  const category = chooseFirstChip(document.body, /Curriculum \/ category/);
  const curriculum = screen.getByRole("group", { name: category });
  const classCourse = chooseFirstChip(curriculum, /Class \/ level/);
  const subject = within(screen.getByRole("group", { name: `Subjects for ${classCourse}` })).getAllByRole("button")[0];
  const subjectName = subject.textContent?.trim() ?? "";
  fireEvent.click(subject);
  fireEvent.click(screen.getByRole("button", { name: "Continue to tuition preferences" }));
  return { category, classCourse, subjectName };
}

function fillStepTwo() {
  fireEvent.change(screen.getByRole("spinbutton", { name: /Number of students/ }), { target: { value: "1" } });
  select("Days per week", "3");
  select("Where Did You Hear About Us", "facebook");
  select("Preferred Tutor gender", "female");
  fireEvent.change(screen.getByRole("textbox", { name: "Monthly salary (Taka)" }), { target: { value: "6500" } });
}

describe("buildPreviewJobData helper", () => {
  it("constructs correct JobCardData with title, formatted salary, and subjects", () => {
    const data = buildPreviewJobData(
      {
        learningNeeds: [
          {
            category: "English Medium",
            curriculumType: "Cambridge",
            classes: [{ classCourse: "Class 8", subjects: ["Mathematics", "Physics"] }],
          },
        ],
        tuitionType: "home",
        groupCapacity: "",
        packageDurationMonths: "",
        studentCount: "1",
        studentGender: "male",
        addressDetails: "Road 4",
        tuitionCityLocationId: "dhaka",
        tuitionLocationId: "dhanmondi",
        daysPerWeek: "4",
        tutoringTime: "17:00",
        preferredGender: "male",
        salaryAmount: "7000",
        instituteName: "Mastermind",
        heardAboutUs: "facebook",
      },
      "Dhaka",
      "Dhanmondi",
      null,
      false
    );

    expect(data.jobId).toBe("CT-PREVIEW");
    expect(data.statusLabel).toBe("Live Preview");
    expect(data.statusTone).toBe("live");
    expect(data.title).toContain("Need English Medium Tutor for Class 8 Student - 4 Days / Week");
    expect(data.budgetAmount).toBe(7000);
    expect(data.preferredTutorGender).toBe("male");
    expect(data.locationLabel).toBe("Dhanmondi, Dhaka");
    expect(data.subjects).toEqual(["Mathematics", "Physics"]);
  });

  it("uses real request Job ID in edit mode", () => {
    const data = buildPreviewJobData(
      {
        learningNeeds: [],
        tuitionType: "online",
        groupCapacity: "",
        packageDurationMonths: "",
        studentCount: "1",
        studentGender: "",
        addressDetails: "",
        tuitionCityLocationId: "",
        tuitionLocationId: "",
        daysPerWeek: "3",
        tutoringTime: "",
        preferredGender: "any",
        salaryAmount: "5000",
        instituteName: "",
        heardAboutUs: "facebook",
      },
      "",
      "",
      42,
      true
    );

    expect(data.jobId).toBe(jobIdForRequest(42));
    expect(data.locationLabel).toBeNull();
  });
});

describe("GuardianRequestJourney preview & confirm interaction", () => {
  it("renders 'Preview & Confirm' button on Step 2", () => {
    render(<GuardianRequestJourney embedded />);
    fillThroughStepOne();

    expect(screen.getByRole("button", { name: "Preview and confirm job post" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Send request" })).not.toBeNull();
  });

  it("blocks preview and shows validation error if Step 2 is incomplete", () => {
    render(<GuardianRequestJourney embedded />);
    fillThroughStepOne();

    // Do not fill Step 2 fields, click Preview & Confirm
    fireEvent.click(screen.getByRole("button", { name: "Preview and confirm job post" }));

    expect(screen.getByRole("alert")).not.toBeNull();
    expect(screen.queryByText("Live Job Post Preview")).toBeNull();
  });

  it("opens live preview screen with JobCard and detailed breakdown when step 2 is valid", () => {
    render(<GuardianRequestJourney embedded />);
    const chosen = fillThroughStepOne();
    fillStepTwo();

    fireEvent.click(screen.getByRole("button", { name: "Preview and confirm job post" }));

    // Preview screen active
    expect(screen.getByText("Live Job Post Preview")).not.toBeNull();
    expect(screen.getByText("Public Job Card")).not.toBeNull();
    expect(screen.getByText("Full Details Breakdown")).not.toBeNull();
    expect(screen.getAllByText("6,500 Taka").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/CT-PREVIEW/)).not.toBeNull();

    // Confirm button ready
    expect(screen.getByRole("button", { name: "Confirm & Send request" })).not.toBeNull();
  });

  it("allows returning to edit form from preview via 'Back to Edit' button", () => {
    render(<GuardianRequestJourney embedded />);
    fillThroughStepOne();
    fillStepTwo();

    fireEvent.click(screen.getByRole("button", { name: "Preview and confirm job post" }));
    expect(screen.getByText("Live Job Post Preview")).not.toBeNull();

    // Click Back to Edit
    fireEvent.click(screen.getByRole("button", { name: "Back to Edit" }));

    // Form fields are visible again
    expect(screen.queryByText("Live Job Post Preview")).toBeNull();
    expect(screen.getByLabelText(/Monthly salary/)).not.toBeNull();
  });

  it("submitting from preview triggers request creation and shows 'Edit this request' in success state", () => {
    render(<GuardianRequestJourney embedded />);
    const chosen = fillThroughStepOne();
    fillStepTwo();

    fireEvent.click(screen.getByRole("button", { name: "Preview and confirm job post" }));
    expect(screen.getByText("Live Job Post Preview")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Confirm & Send request" }));

    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      tuitionType: "online",
      budgetAmount: 6500,
      heardAboutUs: "facebook",
    }));

    act(() => { mocks.createOptions?.onSuccess?.({ id: 108 }); });

    // In success state:
    expect(screen.getByText("Request received securely")).not.toBeNull();
    expect(screen.getByText(new RegExp(jobIdForRequest(108)))).not.toBeNull();

    // Edit this request link is present
    const editLink = screen.getByRole("link", { name: "Edit this request" });
    expect(editLink).not.toBeNull();
    expect(editLink.getAttribute("href")).toBe("/request-tutor?edit=108");
  });
});
