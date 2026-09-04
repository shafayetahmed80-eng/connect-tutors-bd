// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  universities: [
    { id: 14, name: "Chittagong Medical University" },
    { id: 184, name: "Chittagong Medical College" },
  ] as Array<{ id: number; name: string }>,
  saveDraft: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/trpc", () => {
  const empty = () => ({ data: [], isLoading: false, isError: false });
  return {
    trpc: {
      useUtils: () => ({ tutor: { getMyProfile: { invalidate: vi.fn() }, getDashboardStats: { invalidate: vi.fn() } } }),
      tutor: {
        saveProfileDraft: { useMutation: () => ({ mutateAsync: mocks.saveDraft, isPending: false }) },
        submitProfile: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      },
      siteContent: { list: { useQuery: empty }, listBlocks: { useQuery: empty } },
      // The Owner-set caps the profile reads to bound its multi-selects.
      siteLimits: { resolved: { useQuery: () => ({ data: undefined }) } },
      catalog: {
        searchUniversities: { useQuery: () => ({ data: mocks.universities, isLoading: false }) },
        searchFacultyDepartments: { useQuery: empty },
        searchSubjects: { useQuery: empty },
        searchClassLevels: { useQuery: empty },
        searchCurricula: { useQuery: empty },
        searchStudentTypes: { useQuery: empty },
        searchLanguages: { useQuery: empty },
        searchBangladeshLocations: { useQuery: empty },
      },
    },
  };
});

import { TutorProfileWorkspace } from "./TutorProfileWorkspace";

const profile = {
  tutorNumber: 1, registeredAt: null, profileStatus: "draft", accountStatus: "active",
  completionPercentage: 20, assignedRequestCount: 0, lastUpdatedAt: null, profilePhotoUrl: null,
  name: "Test Tutor", gender: "male" as const, dateOfBirth: "1998-02-10",
  headline: "Experienced Mathematics Tutor", phone: "+8801712345678", contactEmail: "t@example.test",
  currentLocationId: "1", teachingAreaIds: ["1"], availableNationwide: true,
  highestEducation: "Honours", universityId: 14, facultyDepartmentId: null,
  studyStatus: "graduated" as const, graduationYear: 2020,
} as never;

afterEach(() => {
  cleanup();
  mocks.saveDraft.mockClear();
});

async function openEducationEditor() {
  const user = userEvent.setup({ document: window.document });
  render(<TutorProfileWorkspace profile={profile} onboardingFallback={null} />);
  await user.click(screen.getByRole("tab", { name: /Education/ }));
  await user.click(screen.getByRole("button", { name: "Edit Education" }));
  const dialog = screen.getByRole("dialog");
  return { user, dialog, input: within(dialog).getByRole("combobox", { name: /Institute/ }) as HTMLInputElement };
}

describe("Institute and Department search field", () => {
  it("shows the saved institute as editable text rather than a placeholder", async () => {
    const { input } = await openEducationEditor();
    expect(input.value).toBe("Chittagong Medical University");
  });

  it("clears the box and the selection from the clear button", async () => {
    const { user, dialog, input } = await openEducationEditor();

    await user.click(within(dialog).getByRole("button", { name: "Clear Institute" }));

    // The old behaviour re-showed the selected name the moment the box emptied.
    expect(input.value).toBe("");
    expect(within(dialog).queryByRole("button", { name: "Clear Institute" })).toBeNull();
  });

  it("lets the box be emptied by deleting, instead of snapping the old name back", async () => {
    const { input } = await openEducationEditor();

    fireEvent.change(input, { target: { value: "Chittagong Medical Universit" } });
    expect(input.value).toBe("Chittagong Medical Universit");

    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
  });

  it("drops the stored selection once the text no longer names it", async () => {
    const { user, dialog, input } = await openEducationEditor();

    fireEvent.change(input, { target: { value: "Chittagong Med" } });
    await user.click(within(dialog).getByRole("button", { name: /Submit/ }));

    // With a partial name the field must not keep claiming the old institute:
    // the profile would save an option the Tutor can no longer see in the box.
    expect(mocks.saveDraft).toHaveBeenCalled();
    expect(mocks.saveDraft.mock.calls[0][0]).not.toHaveProperty("universityId");
  });

  it("still saves the institute when one is genuinely selected", async () => {
    const { user, dialog, input } = await openEducationEditor();

    fireEvent.change(input, { target: { value: "Chittagong Medical College" } });
    await user.click(within(dialog).getByRole("button", { name: /Submit/ }));

    expect(mocks.saveDraft.mock.calls[0][0]).toMatchObject({ universityId: 184 });
  });

  it("selects the matching option when the full name is entered", async () => {
    const { dialog, input } = await openEducationEditor();

    fireEvent.change(input, { target: { value: "Chittagong Medical College" } });

    expect(input.value).toBe("Chittagong Medical College");
    expect(within(dialog).queryByText("Select your institute.")).toBeNull();
  });

  it("offers every match rather than stopping at the first one", async () => {
    const { dialog } = await openEducationEditor();
    const list = dialog.querySelector("datalist#catalog-institute");

    expect(Array.from(list?.querySelectorAll("option") ?? []).map(option => option.getAttribute("value"))).toEqual([
      "Chittagong Medical University",
      "Chittagong Medical College",
    ]);
  });
});
