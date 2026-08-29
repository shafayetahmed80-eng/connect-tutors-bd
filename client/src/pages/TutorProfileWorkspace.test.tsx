// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const trpcMocks = vi.hoisted(() => ({
  invalidate: vi.fn(),
  saveDraft: vi.fn(),
  submitProfile: vi.fn(),
  searchBangladeshLocations: vi.fn<(...args: any[]) => { data: any[] }>(() => ({ data: [] })),
}));

vi.mock("@/lib/trpc", () => {
  const emptyQuery = () => ({ data: [] });
  return {
    trpc: {
      useUtils: () => ({
        tutor: {
          getMyProfile: { invalidate: trpcMocks.invalidate },
          getDashboardStats: { invalidate: trpcMocks.invalidate },
        },
      }),
      tutor: {
        saveProfileDraft: { useMutation: () => ({ mutateAsync: trpcMocks.saveDraft, isPending: false }) },
        submitProfile: { useMutation: () => ({ mutateAsync: trpcMocks.submitProfile, isPending: false }) },
      },
      catalog: {
        searchUniversities: { useQuery: emptyQuery },
        searchAcademicFaculties: { useQuery: emptyQuery },
        searchFacultyDepartments: { useQuery: emptyQuery },
        searchSubjects: { useQuery: emptyQuery },
        searchClassLevels: { useQuery: emptyQuery },
        searchCurricula: { useQuery: emptyQuery },
        searchStudentTypes: { useQuery: emptyQuery },
        searchLanguages: { useQuery: emptyQuery },
        searchBangladeshLocations: { useQuery: trpcMocks.searchBangladeshLocations },
      },
    },
  };
});

vi.mock("@/components/TutorProfilePhotoEditor", () => ({
  TutorProfilePhotoEditor: ({ onConfirm }: { onConfirm: (photo: File) => void }) => (
    <button type="button" onClick={() => onConfirm(new File(["cropped"], "tutor-profile-photo.jpg", { type: "image/jpeg" }))}>
      Confirm cropped photo
    </button>
  ),
}));

import { TutorProfileWorkspace } from "./TutorProfileWorkspace";
import { tutorProfileCopy } from "./TutorProfileUx";

const completeProfile = {
  tutorNumber: 1504,
  registeredAt: "2026-08-19T00:00:00.000Z",
  profileStatus: "draft",
  accountStatus: "active",
  completionPercentage: 100,
  assignedRequestCount: 0,
  lastUpdatedAt: "2026-08-19T00:00:00.000Z",
  profilePhotoUrl: "https://example.test/private-photo.jpg",
  name: "Test Tutor",
  gender: "male" as const,
  dateOfBirth: "1998-02-10",
  headline: "Experienced Mathematics Tutor",
  phone: "+8801712345678",
  contactEmail: "tutor@example.test",
  currentLocationId: "1",
  teachingAreaIds: ["1"],
  availableNationwide: true,
  highestEducation: "BSc",
  universityId: 1,
  facultyId: 1,
  facultyDepartmentId: 1,
  studyStatus: "graduated" as const,
  graduationYear: 2020,
  primarySubjectIds: ["1"],
  additionalSubjectIds: [],
  classLevelIds: ["1"],
  curriculumIds: ["1"],
  teachingExperienceYears: 3,
  studentTypeIds: ["1"],
  tuitionType: "both" as const,
  preferredStudentGender: "both" as const,
  preferredClassSizes: ["one-to-one"],
  preferredTeachingDays: ["saturday"],
  preferredTimeSlots: ["evening"],
  feeMin: 5000,
  feeMax: 7000,
  travelDistanceKm: null,
  teachingLanguageIds: [1],
  communicationPreferences: ["whatsapp"],
  aboutMe: null,
  teachingApproach: null,
  whyChooseMe: null,
  additionalNotes: null,
};

describe("TutorProfileWorkspace FP-02 feedback", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    trpcMocks.invalidate.mockReset();
    trpcMocks.saveDraft.mockReset();
    trpcMocks.submitProfile.mockReset();
    trpcMocks.searchBangladeshLocations.mockClear();
  });

  it("renders English-only visible copy for the Tutor Profile interface", () => {
    const { container } = render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    expect(container.querySelector("form")?.textContent).not.toMatch(/[\u0980-\u09FF]/);
  });

  it("starts all Tutor Profile sections collapsed and reveals one section with an accessible click or keyboard action", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    const identitySection = screen.getByText("Section A", { exact: true }).closest("section");
    expect(identitySection).toBeTruthy();
    const toggle = within(identitySection!).getByRole("button", { name: "Show details for Identity and contact" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(within(identitySection!).queryByRole("button", { name: "Edit Information" })).toBeNull();
    expect(screen.queryByDisplayValue("Test Tutor")).toBeNull();

    await user.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(within(identitySection!).getByRole("button", { name: "Edit Information" })).toBeTruthy();
    expect(screen.getByDisplayValue("Test Tutor")).toBeTruthy();

    toggle.focus();
    await user.keyboard("{Enter}");

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByDisplayValue("Test Tutor")).toBeNull();
  });

  it("shows National ID as a security-gated mandatory field without rendering an editable NID value", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    const identitySection = screen.getByText("Section A", { exact: true }).closest("section");
    expect(identitySection).toBeTruthy();
    await user.click(within(identitySection!).getByRole("button", { name: "Show details for Identity and contact" }));
    await user.click(within(identitySection!).getByRole("button", { name: "Edit Information" }));

    expect(within(identitySection!).getByText(/^National ID \(NID\)/)).toBeTruthy();
    expect(within(identitySection!).getByText(/Secure collection is pending activation/i)).toBeTruthy();
    expect(within(identitySection!).queryByLabelText(/^National ID \(NID\)/i)).toBeNull();
  });

  it("keeps the University ID upload private and shows only a safe uploaded status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ universityIdDocumentStatus: "uploaded" }) }));
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    const educationSection = screen.getByText("Section C", { exact: true }).closest("section");
    expect(educationSection).toBeTruthy();
    await user.click(within(educationSection!).getByRole("button", { name: "Show details for Education and teaching expertise" }));
    await user.click(within(educationSection!).getByRole("button", { name: "Edit Information" }));
    const input = screen.getByLabelText("Upload University ID card");
    expect(screen.getByText(/Private verification only/)).toBeTruthy();
    expect(screen.queryByText(/Guardian.*University ID/i)).toBeNull();

    fireEvent.change(input, { target: { files: [new File(["id"], "university-id.png", { type: "image/png" })] } });

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/tutor/university-id-document", expect.objectContaining({ method: "POST", credentials: "same-origin" })));
    expect(await screen.findByText("Uploaded for private review")).toBeTruthy();
  });

  it("shows one state-aware action in the Profile status card", () => {
    const { container } = render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);
    const statusCard = container.querySelector<HTMLElement>("section[aria-label='Profile status']");

    expect(statusCard).toBeTruthy();
    if (!statusCard) throw new Error("Profile status card is missing");
    expect(within(statusCard).getByText("Ready for review")).toBeTruthy();
    expect(within(statusCard).getByRole("button", { name: "Submit for review" })).toBeTruthy();
    expect(within(statusCard).queryByRole("button", { name: /save draft/i })).toBeNull();
  });

  it("uses required markers and inline recovery instead of persistent generic field helper copy", async () => {
    const incompleteProfile = {
      ...completeProfile,
      profilePhotoUrl: null,
      phone: "",
      currentLocationId: "",
      teachingAreaIds: [],
    };
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={incompleteProfile} onboardingFallback={null} />);

    expect(screen.queryByText("Added during registration. Search by name, thana, upazila, or area to change it.")).toBeNull();
    expect(screen.queryByText("Select every area in Bangladesh where you can offer home tuition. Search by name, thana, upazila, or area.")).toBeNull();
    expect(screen.queryByText("Search by the institute's official name.")).toBeNull();
    expect(screen.queryByText("Enter 0 if you have no minimum fee.")).toBeNull();
    expect(screen.queryByText("Select every format you can teach comfortably.")).toBeNull();
    const identitySection = screen.getByText("Section A", { exact: true }).closest("section");
    const locationSection = screen.getByText("Section E", { exact: true }).closest("section");
    expect(identitySection).toBeTruthy();
    expect(locationSection).toBeTruthy();
    await user.click(within(identitySection!).getByRole("button", { name: "Show details for Identity and contact" }));
    await user.click(within(locationSection!).getByRole("button", { name: "Show details for Location, fee and travel preferences" }));
    const phoneField = screen.getByRole("textbox", { name: /Mobile Number/ });
    expect(phoneField.closest("label")?.textContent).toContain("Mobile Number *");
    expect(phoneField.getAttribute("aria-required")).toBe("true");
    const teachingAreas = screen.getByRole("button", { name: /Teaching Areas/ });
    expect(teachingAreas.parentElement?.textContent).toContain("Teaching Areas *");
    expect(teachingAreas.getAttribute("aria-required")).toBe("true");

    await user.click(screen.getByRole("button", { name: "Complete profile" }));

    expect(await screen.findByText("Enter a valid Bangladesh mobile number.")).toBeTruthy();
    expect(screen.getByText("Select your current location.")).toBeTruthy();
    expect(screen.getByText("Select at least one teaching area.")).toBeTruthy();
  });

  it("keeps the draft form usable and shows a safe temporary-failure message without raw server text", async () => {
    trpcMocks.saveDraft.mockRejectedValue({ data: { code: "INTERNAL_SERVER_ERROR" }, message: "SQL duplicate key tutor_profile" });
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    const identitySection = screen.getByText("Section A", { exact: true }).closest("section");
    expect(identitySection).toBeTruthy();
    await user.click(within(identitySection!).getByRole("button", { name: "Show details for Identity and contact" }));
    fireEvent.change(screen.getByDisplayValue("Experienced Mathematics Tutor"), { target: { value: "Updated Mathematics Tutor" } });
    const saveButton = screen.getByRole("button", { name: "Save changes" });
    await user.click(saveButton);

    expect(await screen.findByText("We could not save your profile right now. Check your connection and try again.")).toBeTruthy();
    expect(screen.queryByText(/SQL duplicate key/i)).toBeNull();
    expect(screen.getByDisplayValue("Test Tutor")).toBeTruthy();
    await waitFor(() => expect((saveButton as HTMLButtonElement).disabled).toBe(false));
  });

  it("keeps the profile values and shows the pending-review conflict message after review submission fails", async () => {
    trpcMocks.saveDraft.mockResolvedValue(undefined);
    trpcMocks.submitProfile.mockRejectedValue({ data: { code: "CONFLICT" }, message: "pending_review internal state" });
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    const identitySection = screen.getByText("Section A", { exact: true }).closest("section");
    expect(identitySection).toBeTruthy();
    await user.click(within(identitySection!).getByRole("button", { name: "Show details for Identity and contact" }));
    const submitButton = screen.getAllByRole("button", { name: /submit for review/i })[0];
    await user.click(submitButton);

    expect(await screen.findByText("Your profile is already under review. Wait for change instructions before editing it again.")).toBeTruthy();
    expect(screen.queryByText(/pending_review internal state/i)).toBeNull();
    expect(screen.getByDisplayValue("Test Tutor")).toBeTruthy();
    await waitFor(() => expect((submitButton as HTMLButtonElement).disabled).toBe(false));
  });

  it("uses the status card for selected-tuition feedback and requires an explicit return before Apply Now", async () => {
    const returnToSelectedJob = vi.fn();
    const user = userEvent.setup({ document: window.document });
    const pendingWorkspace = render(<TutorProfileWorkspace profile={{ ...completeProfile, profileStatus: "pending" }} onboardingFallback={null} tutorApplyReturnTo="/job-board?job=CT-JOB-000042" onReturnToSelectedJob={returnToSelectedJob} />);

    const pendingStatusCard = screen.getByRole("region", { name: "Profile status" });
    expect(within(pendingStatusCard).getByText("Profile under review")).toBeTruthy();
    expect(within(pendingStatusCard).getByText("Admin approval is required before you can return to the selected tuition and choose Apply Now yourself.")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Selected tuition application" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Return to selected tuition" })).toBeNull();
    expect(returnToSelectedJob).not.toHaveBeenCalled();

    pendingWorkspace.unmount();
    render(<TutorProfileWorkspace profile={{ ...completeProfile, profileStatus: "approved" }} onboardingFallback={null} tutorApplyReturnTo="/job-board?job=CT-JOB-000042" onReturnToSelectedJob={returnToSelectedJob} />);
    const approvedStatusCard = screen.getByRole("region", { name: "Profile status" });
    expect(within(approvedStatusCard).getByText("Ready to apply")).toBeTruthy();
    expect(within(approvedStatusCard).getByText("Your profile is approved. Return to the selected tuition and click Apply Now yourself.")).toBeTruthy();
    await user.click(within(approvedStatusCard).getByRole("button", { name: "Return to selected tuition" }));
    expect(returnToSelectedJob).toHaveBeenCalledOnce();
  });
});

describe("TutorProfileWorkspace photo flow", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    trpcMocks.invalidate.mockReset();
    trpcMocks.saveDraft.mockReset();
    trpcMocks.submitProfile.mockReset();
    trpcMocks.searchBangladeshLocations.mockClear();
  });

  it("uploads a cropped replacement photo through the private endpoint and updates the visible preview", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ profilePhotoUrl: "https://example.test/private-replacement.jpg" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:replacement-source") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    const identitySection = screen.getByText("Section A", { exact: true }).closest("section");
    expect(identitySection).toBeTruthy();
    await user.click(within(identitySection!).getByRole("button", { name: "Show details for Identity and contact" }));
    await user.click(within(identitySection!).getByRole("button", { name: "Edit Information" }));
    fireEvent.change(screen.getByLabelText("Upload Tutor profile photo"), {
      target: { files: [new File(["source"], "replacement.png", { type: "image/png" })] },
    });
    await user.click(screen.getByRole("button", { name: "Confirm cropped photo" }));

    expect(await screen.findByText("Photo uploaded.")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/tutor/profile-photo", expect.objectContaining({ method: "POST", credentials: "same-origin" }));
    expect(screen.getByAltText("Current Tutor profile photo").getAttribute("src")).toBe("https://example.test/private-replacement.jpg");
    expect(screen.getByRole("button", { name: /replace photo/i })).toBeTruthy();
    expect(trpcMocks.invalidate).toHaveBeenCalled();
  });

  it("removes a profile photo only after confirmation and requires a replacement before review", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ profilePhotoUrl: null }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    const identitySection = screen.getByText("Section A", { exact: true }).closest("section");
    expect(identitySection).toBeTruthy();
    await user.click(within(identitySection!).getByRole("button", { name: "Show details for Identity and contact" }));
    await user.click(within(identitySection!).getByRole("button", { name: "Edit Information" }));
    await user.click(screen.getByRole("button", { name: /^remove photo/i }));

    expect(await screen.findByText("Photo removed.")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/tutor/profile-photo", expect.objectContaining({ method: "DELETE", credentials: "same-origin" }));
    expect(screen.queryByAltText("Current Tutor profile photo")).toBeNull();
    expect(screen.getByText("Photo removed. Add a new profile photo before submitting for review.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /upload photo/i })).toBeTruthy();
  });
});

describe("TutorProfileWorkspace Bangladesh hierarchy search", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    trpcMocks.searchBangladeshLocations.mockClear();
  });

  it("forwards current-location and teaching-area queries to the Bangladesh hierarchy catalog", async () => {
    trpcMocks.searchBangladeshLocations.mockImplementation(({ query }: { query: string }) => ({
      data: query ? [{ id: "dhaka-thana-uttara", label: "Uttara", type: "thana" }] : [],
    }));
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    const locationSection = screen.getByText("Section E", { exact: true }).closest("section");
    expect(locationSection).toBeTruthy();
    await user.click(within(locationSection!).getByRole("button", { name: "Show details for Location, fee and travel preferences" }));
    await user.click(within(locationSection!).getByRole("button", { name: "Edit Information" }));
    const currentLocationSearch = within(locationSection!).getByRole("combobox", { hidden: true });
    await user.type(currentLocationSearch, "Uttara");
    await waitFor(() => expect(trpcMocks.searchBangladeshLocations).toHaveBeenCalledWith(expect.objectContaining({ query: "Uttara" })));

    fireEvent.click(screen.getAllByRole("button", { name: /Teaching Areas/, hidden: true })[0]);
    fireEvent.change(screen.getByRole("searchbox", { name: `Search ${tutorProfileCopy.fields.teachingAreas}`, hidden: true }), { target: { value: "Uttara" } });
    await waitFor(() => expect(trpcMocks.searchBangladeshLocations).toHaveBeenCalledWith(expect.objectContaining({ query: "Uttara" })));
  });

  it("hydrates persisted hierarchy identifiers through the catalog before a draft is saved", async () => {
    const hierarchyProfile = {
      ...completeProfile,
      currentLocationId: "dhaka-thana-uttara",
      teachingAreaIds: ["dhaka-uttara-sector-1"],
    };
    trpcMocks.searchBangladeshLocations.mockImplementation(({ ids }: { ids?: string[] }) => ({
      data: ids?.includes("dhaka-thana-uttara")
        ? [{ id: "dhaka-thana-uttara", label: "Uttara", type: "thana" }]
        : ids?.includes("dhaka-uttara-sector-1")
          ? [{ id: "dhaka-uttara-sector-1", label: "Uttara Sector 1", type: "subdivision" }]
          : [],
    }));
    trpcMocks.saveDraft.mockResolvedValue(undefined);

    render(<TutorProfileWorkspace profile={hierarchyProfile} onboardingFallback={null} />);

    const locationSection = screen.getByText("Section E", { exact: true }).closest("section");
    expect(locationSection).toBeTruthy();
    fireEvent.click(within(locationSection!).getByRole("button", { name: "Show details for Location, fee and travel preferences" }));

    await waitFor(() => expect(trpcMocks.searchBangladeshLocations).toHaveBeenCalledWith(expect.objectContaining({
      query: "",
      ids: ["dhaka-thana-uttara"],
    })));
    await waitFor(() => expect(trpcMocks.searchBangladeshLocations).toHaveBeenCalledWith(expect.objectContaining({
      query: "",
      ids: ["dhaka-uttara-sector-1"],
    })));
    expect(screen.getByDisplayValue("Uttara · thana")).toBeTruthy();
    expect(screen.getByText("Uttara Sector 1 · subdivision")).toBeTruthy();

    const identitySection = screen.getByText("Section A", { exact: true }).closest("section");
    expect(identitySection).toBeTruthy();
    fireEvent.click(within(identitySection!).getByRole("button", { name: "Show details for Identity and contact" }));
    fireEvent.change(screen.getByDisplayValue("Experienced Mathematics Tutor"), { target: { value: "Updated Mathematics Tutor" } });
    await userEvent.setup({ document: window.document }).click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(trpcMocks.saveDraft).toHaveBeenCalledWith(expect.objectContaining({
      currentLocationId: "dhaka-thana-uttara",
      teachingAreaIds: ["dhaka-uttara-sector-1"],
    })));
  });
});


  it("scopes teaching-area catalog requests to a selected city parent", async () => {
    const cityProfile = { ...completeProfile, currentLocationId: "dhaka-city" };
    trpcMocks.searchBangladeshLocations.mockImplementation(({ ids, parentId }: { ids?: string[]; parentId?: string }) => ({
      data: ids?.includes("dhaka-city")
        ? [{ id: "dhaka-city", label: "Dhaka", type: "city" }]
        : parentId === "dhaka-city"
          ? [{ id: "mirpur-1", label: "Mirpur 1", type: "subdivision" }]
          : [],
    }));

    render(<TutorProfileWorkspace profile={cityProfile} onboardingFallback={null} />);

    await waitFor(() => expect(trpcMocks.searchBangladeshLocations).toHaveBeenCalledWith(expect.objectContaining({
      parentId: "dhaka-city",
    })));
  });
