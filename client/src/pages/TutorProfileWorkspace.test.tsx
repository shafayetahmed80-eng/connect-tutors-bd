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
  searchRegistrationLocations: vi.fn<(...args: any[]) => { data: any[] }>(() => ({ data: [] })),
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
      // Content overrides are cosmetic; an empty list keeps the code defaults.
      siteContent: { list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) }, listBlocks: { useQuery: () => ({ data: [], isLoading: false, isError: false }) } },
      // The Owner-set caps the profile reads to bound its multi-selects.
      siteLimits: { resolved: { useQuery: () => ({ data: undefined }) } },
      // No data means the shipped field defaults, which is what these tests expect.
      tutorProfileFieldConfig: { resolved: { useQuery: () => ({ data: undefined }) } },
      catalog: {
        searchUniversities: { useQuery: emptyQuery },
        searchFacultyDepartments: { useQuery: emptyQuery },
        searchSubjects: { useQuery: emptyQuery },
        searchClassLevels: { useQuery: emptyQuery },
        searchCurricula: { useQuery: emptyQuery },
        searchStudentTypes: { useQuery: emptyQuery },
        searchLanguages: { useQuery: emptyQuery },
        searchBangladeshLocations: { useQuery: trpcMocks.searchBangladeshLocations },
        searchRegistrationLocations: { useQuery: trpcMocks.searchRegistrationLocations },
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
  currentCityId: "dhaka-city",
  currentLocationId: "1",
  teachingAreaIds: ["1"],
  availableNationwide: true,
  highestEducation: "Honours",
  universityId: 1,
  facultyDepartmentId: 1,
  degreeExamTitle: "BSc",
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

  it("shows a read-only overview and opens one section's editor in a popup card", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    expect(screen.getByRole("tab", { name: /Personal/ })).toBeTruthy();
    expect(screen.getByText("Identity and contact")).toBeTruthy();
    expect(screen.getByText("Family and emergency contact")).toBeTruthy();
    expect(within(screen.getByRole("tabpanel")).getByText(/Test Tutor/)).toBeTruthy();
    expect(screen.queryByDisplayValue("Test Tutor")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Edit Identity and contact" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Edit Identity and contact" })).toBeTruthy();
    expect(within(dialog).getByDisplayValue("Test Tutor")).toBeTruthy();

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows only the selected section's read-out and switches on tab click", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    // Personal Information is the default tab; other sections' rows are not rendered.
    expect(screen.getByRole("tabpanel").getAttribute("aria-label")).toBe("Personal Information");
    expect(screen.queryByText("Education level")).toBeNull();

    await user.click(screen.getByRole("tab", { name: /Education/ }));

    expect(screen.getByText("Education level")).toBeTruthy();
    expect(screen.queryByText("Present address")).toBeNull();
  });

  it("discards unsaved popup edits when the section editor is closed without saving", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    expect(screen.getByText(/Experienced Mathematics Tutor/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Edit Identity and contact" }));
    let dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByDisplayValue("Experienced Mathematics Tutor"), { target: { value: "Discarded headline" } });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    // The typed value must not survive Cancel into the shared form / read view.
    expect(screen.queryByText(/Discarded headline/)).toBeNull();
    expect(screen.getByText(/Experienced Mathematics Tutor/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Edit Identity and contact" }));
    dialog = screen.getByRole("dialog");
    expect(within(dialog).getByDisplayValue("Experienced Mathematics Tutor")).toBeTruthy();
    expect(within(dialog).queryByDisplayValue("Discarded headline")).toBeNull();
  });

  it("asks for no National ID at all while encrypted storage is not in place", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    await user.click(screen.getByRole("button", { name: "Edit Identity and contact" }));
    const dialog = screen.getByRole("dialog");

    // The form used to show NID as a mandatory-but-disabled placeholder. It is
    // gone entirely instead: nothing invites a tutor to type a government ID
    // number into storage that has no encryption or access controls yet.
    expect(within(dialog).queryByText(/National ID/i)).toBeNull();
    expect(within(dialog).queryByLabelText(/NID/i)).toBeNull();
  });

  it("collapses a completed qualification to a one-line summary and expands it on demand", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace
      profile={{
        ...completeProfile,
        educationRecords: [
          { qualificationLevel: "Honours" as const, instituteName: "Dhaka University", degreeExamTitle: "BSc Physics", majorGroup: "Physics", resultGpa: "", curriculum: "English Version" as const, studyStartYear: "2016", studyEndYear: "2020", currentlyStudying: false, instituteIdCardNumber: "" },
          { qualificationLevel: "" as const, instituteName: "", degreeExamTitle: "", majorGroup: "", resultGpa: "", curriculum: "" as const, studyStartYear: "", studyEndYear: "", currentlyStudying: false, instituteIdCardNumber: "" },
        ],
      }}
      onboardingFallback={null}
    />);

    await user.click(screen.getByRole("tab", { name: /Education/ }));
    await user.click(screen.getByRole("button", { name: "Edit Education" }));
    const dialog = screen.getByRole("dialog");

    // The completed qualification is collapsed to its summary; its fields are not rendered.
    expect(within(dialog).getByText("BSc Physics · Dhaka University · 2020")).toBeTruthy();
    expect(within(dialog).queryByDisplayValue("BSc Physics")).toBeNull();
    // The empty one stays open for editing.
    expect(within(dialog).getAllByLabelText(/Institute Name/).length).toBe(1);

    // Collapsed cards are titled by their education level, so they stay scannable.
    await user.click(within(dialog).getByRole("button", { name: /Honours/ }));
    expect(within(dialog).getByDisplayValue("BSc Physics")).toBeTruthy();
  });

  it("keeps the University ID upload private and shows only a safe uploaded status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ universityIdDocumentStatus: "uploaded" }) }));
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    await user.click(screen.getByRole("tab", { name: /Education/ }));
    await user.click(screen.getByRole("button", { name: "Edit Education" }));
    const dialog = screen.getByRole("dialog");
    const input = within(dialog).getByLabelText("Upload University ID card");
    expect(within(dialog).getByRole("button", { name: /Upload Both Side/ })).toBeTruthy();
    expect(screen.queryByText(/Guardian.*University ID/i)).toBeNull();

    fireEvent.change(input, { target: { files: [new File(["id"], "university-id.png", { type: "image/png" })] } });

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/tutor/university-id-document", expect.objectContaining({ method: "POST", credentials: "same-origin" })));
    // Only a safe status is shown - never the storage key or an image URL.
    expect(await within(dialog).findAllByText("Uploaded")).not.toHaveLength(0);
    expect(within(dialog).queryByText(/tutors\/|university-id\./)).toBeNull();
  });

  it("offers the four optional certificates and uploads each to its own endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ documentType: "hsc_certificate", status: "uploaded" }) }));
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    await user.click(screen.getByRole("tab", { name: /Education/ }));
    await user.click(screen.getByRole("button", { name: "Edit Education" }));
    const dialog = screen.getByRole("dialog");

    // All four are offered, and all four are clearly optional.
    for (const label of ["NID Card Image", "SSC Certificate", "HSC Certificate", "Hons/MS Certificate"]) {
      expect(within(dialog).getByLabelText(`Upload ${label}`)).toBeTruthy();
      expect(within(dialog).getByText(label)).toBeTruthy();
    }
    expect(within(dialog).getAllByText("(Optional)")).toHaveLength(4);

    fireEvent.change(within(dialog).getByLabelText("Upload HSC Certificate"), {
      target: { files: [new File(["cert"], "hsc.png", { type: "image/png" })] },
    });

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/tutor/supporting-document/hsc_certificate", expect.objectContaining({ method: "POST", credentials: "same-origin" })));
    expect(await within(dialog).findByText("Uploaded")).toBeTruthy();
  });

  it("rejects an oversized or wrong-typed certificate without calling the upload endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    await user.click(screen.getByRole("tab", { name: /Education/ }));
    await user.click(screen.getByRole("button", { name: "Edit Education" }));
    const dialog = screen.getByRole("dialog");

    fireEvent.change(within(dialog).getByLabelText("Upload NID Card Image"), {
      target: { files: [new File(["pdf"], "nid.pdf", { type: "application/pdf" })] },
    });

    expect(await screen.findByText("NID Card Image must be a JPEG, PNG, or WebP file.")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows identity in the rail and keeps the submit action at the page end", () => {
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);
    const rail = screen.getByRole("region", { name: "Profile summary" });

    expect(within(rail).getByRole("heading", { name: "Test Tutor" })).toBeTruthy();
    expect(within(rail).getByText("Tutor ID: 1504")).toBeTruthy();
    expect(within(rail).getByText("Profile completed: 100%")).toBeTruthy();
    // The rail carries no completion CTA; the sole submit lives at the page end.
    expect(within(rail).queryByRole("button", { name: /submit|complete profile|save/i })).toBeNull();
    expect(screen.getByRole("button", { name: "Submit profile for review" })).toBeTruthy();
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

    await user.click(screen.getByRole("button", { name: "Edit Identity and contact" }));
    let dialog = screen.getByRole("dialog");
    const phoneField = within(dialog).getByRole("textbox", { name: /Mobile Number/ });
    expect(phoneField.closest("label")?.textContent).toContain("Mobile Number *");
    expect(phoneField.getAttribute("aria-required")).toBe("true");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("tab", { name: /Tuition/ }));
    await user.click(screen.getByRole("button", { name: "Edit Location and fee" }));
    dialog = screen.getByRole("dialog");
    const teachingAreas = within(dialog).getByRole("button", { name: /Teaching Areas/ });
    expect(teachingAreas.parentElement?.textContent).toContain("Teaching Areas *");
    expect(teachingAreas.getAttribute("aria-required")).toBe("true");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "Submit profile for review" }));

    // The first incomplete section opens in its popup card with the inline error.
    const identityDialog = await screen.findByRole("dialog");
    expect(within(identityDialog).getByRole("heading", { name: "Edit Personal Information" })).toBeTruthy();
    expect(within(identityDialog).getByText("Enter a valid Bangladesh mobile number.")).toBeTruthy();
    await user.click(within(identityDialog).getByRole("button", { name: "Cancel" }));

    // The remaining incomplete section surfaces its errors when opened from its tab.
    await user.click(screen.getByRole("tab", { name: /Tuition/ }));
    await user.click(screen.getByRole("button", { name: "Edit Location and fee" }));
    const teachingDialog = screen.getByRole("dialog");
    expect(within(teachingDialog).getByText("Select your current location.")).toBeTruthy();
    expect(within(teachingDialog).getByText("Select at least one teaching area.")).toBeTruthy();
  });

  it("keeps the popup card open and shows a safe temporary-failure message without raw server text", async () => {
    trpcMocks.saveDraft.mockRejectedValue({ data: { code: "INTERNAL_SERVER_ERROR" }, message: "SQL duplicate key tutor_profile" });
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    await user.click(screen.getByRole("button", { name: "Edit Identity and contact" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByDisplayValue("Experienced Mathematics Tutor"), { target: { value: "Updated Mathematics Tutor" } });
    await user.click(within(dialog).getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("We could not save your profile right now. Check your connection and try again.")).toBeTruthy();
    expect(screen.queryByText(/SQL duplicate key/i)).toBeNull();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(within(screen.getByRole("dialog")).getByDisplayValue("Updated Mathematics Tutor")).toBeTruthy();
  });

  it("keeps the profile values and shows the pending-review conflict message after review submission fails", async () => {
    trpcMocks.saveDraft.mockResolvedValue(undefined);
    trpcMocks.submitProfile.mockRejectedValue({ data: { code: "CONFLICT" }, message: "pending_review internal state" });
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    const submitButton = screen.getByRole("button", { name: "Submit profile for review" });
    await user.click(submitButton);

    expect(await screen.findByText("Your profile is already under review. Wait for change instructions before editing it again.")).toBeTruthy();
    expect(screen.queryByText(/pending_review internal state/i)).toBeNull();
    expect(within(screen.getByRole("tabpanel")).getByText(/Test Tutor/)).toBeTruthy();
    await waitFor(() => expect((submitButton as HTMLButtonElement).disabled).toBe(false));
  });

  it("requires an explicit return before Apply Now and offers it only once approved", async () => {
    const returnToSelectedJob = vi.fn();
    const user = userEvent.setup({ document: window.document });
    const pendingWorkspace = render(<TutorProfileWorkspace profile={{ ...completeProfile, profileStatus: "pending" }} onboardingFallback={null} tutorApplyReturnTo="/job-board?job=CT-JOB-000042" onReturnToSelectedJob={returnToSelectedJob} />);

    // Under review there is no shortcut back to the job anywhere on the page.
    expect(screen.getByRole("region", { name: "Profile summary" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Selected tuition application" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Return to selected tuition" })).toBeNull();
    expect(returnToSelectedJob).not.toHaveBeenCalled();

    pendingWorkspace.unmount();
    render(<TutorProfileWorkspace profile={{ ...completeProfile, profileStatus: "approved" }} onboardingFallback={null} tutorApplyReturnTo="/job-board?job=CT-JOB-000042" onReturnToSelectedJob={returnToSelectedJob} />);
    const approvedRail = screen.getByRole("region", { name: "Profile summary" });
    await user.click(within(approvedRail).getByRole("button", { name: "Return to selected tuition" }));
    expect(returnToSelectedJob).toHaveBeenCalledOnce();
  });

  it("previews the whole profile from the rail and returns to the tabbed editor", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    expect(screen.getByRole("tablist", { name: "Profile sections" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Profile preview" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "View Profile" }));

    const preview = screen.getByRole("region", { name: "Profile preview" });
    expect(within(preview).getByRole("heading", { name: "Personal Information" })).toBeTruthy();
    expect(within(preview).getByRole("heading", { name: "Introduction and review" })).toBeTruthy();
    expect(screen.queryByRole("tablist", { name: "Profile sections" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Edit Information" }));
    expect(screen.getByRole("tablist", { name: "Profile sections" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Profile preview" })).toBeNull();
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

    fireEvent.change(screen.getByLabelText("Upload Tutor profile photo"), {
      target: { files: [new File(["source"], "replacement.png", { type: "image/png" })] },
    });
    await user.click(screen.getByRole("button", { name: "Confirm cropped photo" }));

    expect(await screen.findByText("Photo uploaded.")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/tutor/profile-photo", expect.objectContaining({ method: "POST", credentials: "same-origin" }));
    expect(screen.getByAltText("Current Tutor profile photo").getAttribute("src")).toBe("https://example.test/private-replacement.jpg");
    expect(screen.getAllByRole("button", { name: /replace photo/i }).length).toBeGreaterThan(0);
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
    trpcMocks.searchRegistrationLocations.mockClear();
  });

  it("forwards current-location and teaching-area queries to the Bangladesh hierarchy catalog", async () => {
    trpcMocks.searchRegistrationLocations.mockImplementation(({ query }: { query: string }) => ({
      data: query ? [{ id: "dhaka-thana-uttara", label: "Uttara", type: "thana" }] : [],
    }));
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    await user.click(screen.getByRole("tab", { name: /Tuition/ }));
    await user.click(screen.getByRole("button", { name: "Edit Location and fee" }));
    const dialog = screen.getByRole("dialog");
    // Current City is the first combobox, Current Location the second.
    const currentLocationSearch = within(dialog).getAllByRole("combobox")[1];
    await user.type(currentLocationSearch, "Uttara");
    await waitFor(() => expect(trpcMocks.searchRegistrationLocations).toHaveBeenCalledWith(expect.objectContaining({ cityId: "dhaka-city", query: "Uttara" }), expect.anything()));

    fireEvent.click(within(dialog).getAllByRole("button", { name: /Teaching Areas/ })[0]);
    // The options list is a Radix Popover portalled to document.body, so it is
    // outside the modal's own subtree - query it from `screen`, not `dialog`.
    fireEvent.change(screen.getByRole("searchbox", { name: `Search ${tutorProfileCopy.fields.teachingAreas}` }), { target: { value: "Uttara" } });
    await waitFor(() => expect(trpcMocks.searchBangladeshLocations).toHaveBeenCalledWith(expect.objectContaining({ query: "Uttara" })));
  });

  it("hydrates persisted hierarchy identifiers through the catalog before a draft is saved", async () => {
    const hierarchyProfile = {
      ...completeProfile,
      currentCityId: "dhaka-city",
      currentLocationId: "dhaka-thana-uttara",
      teachingAreaIds: ["dhaka-uttara-sector-1"],
    };
    trpcMocks.searchBangladeshLocations.mockImplementation(({ ids, types }: { ids?: string[]; types?: string[] }) => ({
      data: types?.includes("city") && ids?.includes("dhaka-city")
        ? [{ id: "dhaka-city", label: "Dhaka", type: "city" }]
        : ids?.includes("dhaka-uttara-sector-1")
          ? [{ id: "dhaka-uttara-sector-1", label: "Uttara Sector 1", type: "subdivision" }]
          : [],
    }));
    trpcMocks.searchRegistrationLocations.mockImplementation(({ cityId }: { cityId?: string }) => ({
      data: cityId === "dhaka-city" ? [{ id: "dhaka-thana-uttara", label: "Uttara", type: "thana" }] : [],
    }));
    trpcMocks.saveDraft.mockResolvedValue(undefined);

    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={hierarchyProfile} onboardingFallback={null} />);

    await waitFor(() => expect(trpcMocks.searchBangladeshLocations).toHaveBeenCalledWith(expect.objectContaining({
      query: "",
      ids: ["dhaka-city"],
      types: ["city"],
    })));
    await waitFor(() => expect(trpcMocks.searchRegistrationLocations).toHaveBeenCalledWith(expect.objectContaining({
      cityId: "dhaka-city",
      query: "",
    }), expect.anything()));
    await waitFor(() => expect(trpcMocks.searchBangladeshLocations).toHaveBeenCalledWith(expect.objectContaining({
      query: "",
      ids: ["dhaka-uttara-sector-1"],
    })));

    await user.click(screen.getByRole("tab", { name: /Tuition/ }));
    await user.click(screen.getByRole("button", { name: "Edit Location and fee" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByDisplayValue("Dhaka · city")).toBeTruthy();
    expect(within(dialog).getByDisplayValue("Uttara · thana")).toBeTruthy();
    expect(within(dialog).getByText("Uttara Sector 1 · subdivision")).toBeTruthy();

    await user.click(within(dialog).getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(trpcMocks.saveDraft).toHaveBeenCalledWith(expect.objectContaining({
      currentCityId: "dhaka-city",
      currentLocationId: "dhaka-thana-uttara",
      teachingAreaIds: ["dhaka-uttara-sector-1"],
    })));
  });

  it("keeps a resolved City's read-out label once its own search box seeds a query the catalog cannot match", async () => {
    const hierarchyProfile = { ...completeProfile, currentCityId: "dhaka-city" };
    trpcMocks.searchBangladeshLocations.mockImplementation(({ ids, types }: { ids?: string[]; types?: string[] }) => ({
      // Only the id-hydration lookup resolves "Dhaka" - every other search,
      // including the box seeding itself with "Dhaka · city", finds nothing,
      // the same way a real label never literally contains " · city".
      data: types?.includes("city") && ids?.includes("dhaka-city") ? [{ id: "dhaka-city", label: "Dhaka", type: "city" }] : [],
    }));

    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={hierarchyProfile} onboardingFallback={null} />);

    await user.click(screen.getByRole("tab", { name: /Tuition/ }));
    const tabPanel = screen.getByRole("tabpanel");
    expect(await within(tabPanel).findByText("Dhaka")).toBeTruthy();

    // Opening the editor mounts the City box, which seeds its own text from
    // the resolved label and re-searches the catalog with that literal text.
    await user.click(screen.getByRole("button", { name: "Edit Location and fee" }));
    await waitFor(() => expect(trpcMocks.searchBangladeshLocations).toHaveBeenCalledWith(expect.objectContaining({ query: "Dhaka · city" })));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));

    // The read view must keep showing the label, not fall back to "Not given".
    expect(within(tabPanel).getByText("Dhaka")).toBeTruthy();
  });

  it("scopes teaching-area catalog requests to a selected city parent", async () => {
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    await waitFor(() => expect(trpcMocks.searchBangladeshLocations).toHaveBeenCalledWith(expect.objectContaining({
      parentId: "dhaka-city",
    })));
  });
});

describe("the Tutor Profile phone boxes", () => {
  afterEach(() => {
    cleanup();
    trpcMocks.saveDraft.mockReset();
  });

  it("saves Family and emergency contact when the number is typed the way Bangladeshis write it", async () => {
    // This section used to refuse to save. Its placeholder read `Ex- 01712345678`
    // and it sent that word for word, but the server takes only `+8801712345678`
    // and reports the rejection on a path the field-error contract drops - so the
    // Tutor saw a popup that closed on nothing.
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    await user.click(screen.getByRole("button", { name: "Edit Family and emergency contact" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Father’s Name/), { target: { value: "Abdul Karim" } });
    fireEvent.change(within(dialog).getByLabelText("Father’s Phone Number"), { target: { value: "01712345678" } });
    await user.click(within(dialog).getByRole("button", { name: /^Submit/ }));

    await waitFor(() => expect(trpcMocks.saveDraft).toHaveBeenCalled());
    expect(trpcMocks.saveDraft.mock.calls[0][0].privateDetails).toMatchObject({
      fatherName: "Abdul Karim",
      fatherPhone: "+8801712345678",
    });
  });

  it("keeps +880 out of the box, so it cannot be typed away", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    await user.click(screen.getByRole("button", { name: "Edit Identity and contact" }));
    const phone = within(screen.getByRole("dialog")).getByLabelText(tutorProfileCopy.fields.phone) as HTMLInputElement;

    expect(phone.value).toBe("1712345678");
    expect(phone.maxLength).toBe(10);
  });

  it("names the half-typed number instead of letting the save fail", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    await user.click(screen.getByRole("button", { name: "Edit Family and emergency contact" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Mother’s Phone Number (Optional)"), { target: { value: "17123" } });
    await user.click(within(dialog).getByRole("button", { name: /^Submit/ }));

    expect(trpcMocks.saveDraft).not.toHaveBeenCalled();
    expect(within(dialog).getAllByRole("alert").map(node => node.textContent).join(" ")).toMatch(/10-digit Bangladesh mobile number/);
  });
});

describe("what the Teaching expertise and Availability boxes ask for", () => {
  afterEach(() => {
    cleanup();
    trpcMocks.saveDraft.mockReset();
  });

  it("no longer asks a Tutor to classify their students", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);

    // Teaching expertise sits in Tuition & location now, in the one popup
    // that tab opens.
    await user.click(screen.getByRole("tab", { name: /Tuition/ }));
    await user.click(screen.getByRole("button", { name: "Edit Teaching expertise" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByText("Student Types")).toBeNull();
    expect(within(dialog).getByText("Primary Subjects")).toBeTruthy();
  });

  it("offers All Days, and saves it as the seven days the server accepts", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<TutorProfileWorkspace profile={{ ...completeProfile, preferredTeachingDays: [] }} onboardingFallback={null} />);

    await user.click(screen.getByRole("tab", { name: /Tuition/ }));
    await user.click(screen.getByRole("button", { name: "Edit Availability" }));
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: /Preferred Teaching Days/ }));
    // The options list is a Radix Popover portalled to document.body - query it
    // from `screen`, not the modal `dialog` subtree.
    await user.click(screen.getByLabelText("All Days"));
    await user.click(screen.getAllByRole("button", { name: "Done" })[0]);
    await user.click(within(dialog).getByRole("button", { name: /^Submit/ }));

    await waitFor(() => expect(trpcMocks.saveDraft).toHaveBeenCalled());
    expect(trpcMocks.saveDraft.mock.calls[0][0].preferredTeachingDays)
      .toEqual(["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"]);
  });
});

describe("what an Admin asked the Tutor to change", () => {
  afterEach(cleanup);

  it("shows the moderation note above the tabs, with its date", () => {
    render(<TutorProfileWorkspace
      profile={{ ...completeProfile, profileStatus: "changes_requested", moderationNote: "Add your University ID card.\nThe headline is too short.", moderationNoteAt: "2026-09-02T00:00:00.000Z" }}
      onboardingFallback={null}
    />);

    const note = screen.getAllByRole("status").find(node => node.textContent?.includes("Changes requested"))!;
    expect(note.textContent).toContain("Changes requested");
    expect(note.textContent).toMatch(/02 Sept? 2026/);
    expect(note.textContent).toContain("Add your University ID card.");
    expect(note.textContent).toContain("The headline is too short.");
  });

  it("says nothing when there is no note to act on", () => {
    render(<TutorProfileWorkspace profile={completeProfile} onboardingFallback={null} />);
    expect(screen.queryByText(/Changes requested/)).toBeNull();
  });
});
