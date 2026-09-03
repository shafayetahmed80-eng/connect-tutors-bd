// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ admin: { listMatchingRequests: { invalidate: vi.fn() }, listTutorRequestAssignmentNotes: { invalidate: vi.fn() } } }),
    admin: {
      confirmTutorRequestAppointment: { useMutation: () => ({ isPending: false, isError: false, error: null, mutate: vi.fn() }) },
      cancelTutorRequest: { useMutation: () => ({ isPending: false, isError: false, error: null, mutate: vi.fn() }) },
      createConfirmationLetterDraft: { useMutation: () => ({ isPending: false, isError: false, error: null, mutate: vi.fn() }) },
      issueConfirmationLetter: { useMutation: () => ({ isPending: false, isError: false, error: null, mutate: vi.fn() }) },
      listTutorRequestAssignmentNotes: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
      addTutorRequestAssignmentNote: { useMutation: () => ({ isPending: false, isError: false, error: null, mutate: vi.fn() }) },
    },
  },
}));
import {
  buildAdminMatchingQuery,
  AdminMatchingSavedViews,
  formatAdminTuitionType,
  getAdminGroupCapacityDisplay,
  getAdminPackageDurationDisplay,
  getAdminStudentCountDisplay,
  getAdminPublicationActions,
  getAdminPublicationStatePresentation,
  getAdminRequestStatusPresentation,
  GuardianPhotoModerationQueue,
  PublicationControls,
  serializeAdminMatchingSavedViewFilters,
  shouldAutoApplyDefaultSavedView,
  TutorInterestQueue,
  type MatchingRequest,
} from "./AdminMatchingWorkspace";

const reviewingRequest: MatchingRequest = {
  id: 42,
  status: "reviewing",
  publicationState: "reviewing",
  tutorId: null,
  guardianConfirmedAt: null,
  guardianReconfirmedAt: null,
  appointmentConfirmedAt: null,
  cancellationReason: null,
  tuitionType: "home",
  groupCapacity: null,
  packageDurationMonths: null,
  studentCount: 2,
  category: "English Medium",
  classCourse: "Standard 2",
  subjects: "[\"English\"]",
  daysPerWeek: 4,
  preferredGender: "female",
  tuitionLocationLabel: "Mirpur 10",
  locationText: "Mirpur 10",
  budgetAmount: 8000,
  monthlyBudget: null,
  studentFirstName: null,
  studentGender: null,
  addressDetails: null,
  notes: null,
  contactConsent: "not_required",
};

describe("AdminMatchingWorkspace helpers", () => {
  it("presents each controlled lifecycle status with a distinct Admin-readable label", () => {
    expect(getAdminRequestStatusPresentation("new")).toMatchObject({ label: "New", tone: "sky" });
    expect(getAdminRequestStatusPresentation("reviewing")).toMatchObject({ label: "Reviewing", tone: "amber" });
    expect(getAdminRequestStatusPresentation("matched")).toMatchObject({ label: "Matched", tone: "emerald" });
    expect(getAdminRequestStatusPresentation("closed")).toMatchObject({ label: "Closed", tone: "slate" });
  });

  it("resets the matching queue to the first page when filters change", () => {
    expect(buildAdminMatchingQuery({
      page: 4,
      query: "  mathematics ",
      status: "reviewing",
      subject: "",
    })).toMatchObject({
      page: 1,
      query: "mathematics",
      status: "reviewing",
      subject: "",
    });
  });

  it("retains the approved Group and Package Tutoring filters when rebuilding a matching query", () => {
    expect(buildAdminMatchingQuery({ tuitionType: "group" })).toMatchObject({ tuitionType: "group", page: 1 });
    expect(buildAdminMatchingQuery({ tuitionType: "package" })).toMatchObject({ tuitionType: "package", page: 1 });
  });

  it("retains approved operational matching criteria while resetting the queue page", () => {
    expect(buildAdminMatchingQuery({
      page: 3,
      lifecycle: "appointed",
      assignmentState: "assigned",
      appointmentState: "pending",
      cancellationState: "active",
      location: "Dhanmondi",
      createdAfter: "2026-08-01",
      lastActivityBefore: "2026-08-22",
    })).toMatchObject({
      page: 1,
      lifecycle: "appointed",
      assignmentState: "assigned",
      appointmentState: "pending",
      cancellationState: "active",
      location: "Dhanmondi",
      createdAfter: "2026-08-01",
      lastActivityBefore: "2026-08-22",
    });
  });

  it("serializes only reusable Admin Matching filters without transient paging or private request content", () => {
    const serialized = serializeAdminMatchingSavedViewFilters({
      page: 4,
      lifecycle: "pending",
      assignmentState: "unassigned",
      location: " Mirpur ",
      pageSize: 30,
      studentFirstName: "Must not persist",
      addressDetails: "Must not persist",
    } as any);

    expect(serialized).toMatchObject({ lifecycle: "pending", assignmentState: "unassigned", location: "Mirpur", pageSize: 30 });
    expect(serialized).not.toHaveProperty("page");
    expect(serialized).not.toHaveProperty("studentFirstName");
    expect(serialized).not.toHaveProperty("addressDetails");
  });

  it("renders private Saved Views with labelled save, apply, and confirm-delete controls", () => {
    const view = { id: 18, name: "Pending Mirpur", filters: serializeAdminMatchingSavedViewFilters({ lifecycle: "pending", location: "Mirpur" }) };
    const onApply = vi.fn();
    const onCreate = vi.fn();
    const onDelete = vi.fn();
    render(createElement(AdminMatchingSavedViews, {
      views: [view], isLoading: false, isError: false, isSaving: false, errorMessage: undefined,
      selectedViewId: null, onApply, onCreate, onDelete,
    }));

    fireEvent.change(screen.getByLabelText("Saved View name"), { target: { value: "Today's queue" } });
    fireEvent.click(screen.getByRole("button", { name: "Save filters" }));
    expect(onCreate).toHaveBeenCalledWith("Today's queue");
    fireEvent.click(screen.getByRole("button", { name: "Pending Mirpur" }));
    expect(onApply).toHaveBeenCalledWith(view);
    fireEvent.click(screen.getByRole("button", { name: "Delete Saved View Pending Mirpur" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete Saved View Pending Mirpur" }));
    expect(onDelete).toHaveBeenCalledWith(18);
  });

  it("identifies the personal default Saved View and provides labelled set and clear-default controls", () => {
    const defaultView = { id: 18, name: "Daily Pending Queue", isDefault: true, filters: serializeAdminMatchingSavedViewFilters({ lifecycle: "pending", assignmentState: "unassigned" }) };
    const otherView = { id: 19, name: "Dhaka follow-up", isDefault: false, filters: serializeAdminMatchingSavedViewFilters({ location: "Dhaka" }) };
    const onSetDefault = vi.fn();
    const onClearDefault = vi.fn();
    render(createElement(AdminMatchingSavedViews, {
      views: [defaultView, otherView], isLoading: false, isError: false, isSaving: false, errorMessage: undefined,
      selectedViewId: 18, onApply: vi.fn(), onCreate: vi.fn(), onDelete: vi.fn(), onSetDefault, onClearDefault,
    } as any));

    expect(screen.getAllByText("Default").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Set Dhaka follow-up as default Saved View" }));
    expect(onSetDefault).toHaveBeenCalledWith(19);
    fireEvent.click(screen.getByRole("button", { name: "Clear default Saved View Daily Pending Queue" }));
    expect(onClearDefault).toHaveBeenCalledOnce();
  });

  it("provides an accessible inline rename flow for a personal Saved View", () => {
    const view = { id: 18, name: "Pending Mirpur", isDefault: false, filters: serializeAdminMatchingSavedViewFilters({ lifecycle: "pending", location: "Mirpur" }) };
    const onRename = vi.fn();
    const viewRender = render(createElement(AdminMatchingSavedViews, {
      views: [view], isLoading: false, isError: false, isSaving: false, errorMessage: undefined,
      selectedViewId: null, onApply: vi.fn(), onCreate: vi.fn(), onDelete: vi.fn(), onSetDefault: vi.fn(), onClearDefault: vi.fn(), onRename,
    } as any));

    const viewScope = within(viewRender.container);
    fireEvent.click(viewScope.getByRole("button", { name: "Rename Saved View Pending Mirpur" }));
    const renameInput = viewScope.getByLabelText("New name for Saved View Pending Mirpur");
    expect((renameInput as HTMLInputElement).value).toBe("Pending Mirpur");
    fireEvent.change(renameInput, { target: { value: "  Priority Mirpur  " } });
    fireEvent.click(viewScope.getByRole("button", { name: "Save new name for Saved View Pending Mirpur" }));
    expect(onRename).toHaveBeenCalledWith(18, "Priority Mirpur");
  });

  it("applies a default Saved View only on a ready fresh visit, never after an explicit selection or reset", () => {
    expect(shouldAutoApplyDefaultSavedView({ hasHandledInitialDefaultView: false, hasExplicitSavedViewIntent: false, isLoading: false, isError: false })).toBe(true);
    expect(shouldAutoApplyDefaultSavedView({ hasHandledInitialDefaultView: true, hasExplicitSavedViewIntent: false, isLoading: false, isError: false })).toBe(false);
    expect(shouldAutoApplyDefaultSavedView({ hasHandledInitialDefaultView: false, hasExplicitSavedViewIntent: true, isLoading: false, isError: false })).toBe(false);
    expect(shouldAutoApplyDefaultSavedView({ hasHandledInitialDefaultView: false, hasExplicitSavedViewIntent: false, isLoading: true, isError: false })).toBe(false);
    expect(shouldAutoApplyDefaultSavedView({ hasHandledInitialDefaultView: false, hasExplicitSavedViewIntent: false, isLoading: false, isError: true })).toBe(false);
  });

  it("shows professional Admin labels for the approved Group and Package Tutoring requests", () => {
    expect(formatAdminTuitionType("group")).toBe("Group Tutoring");
    expect(formatAdminTuitionType("package")).toBe("Package Tutoring");
  });

  it("formats capacity for authorized Group matching detail only", () => {
    expect(getAdminGroupCapacityDisplay({ tuitionType: "group", groupCapacity: 8 })).toBe("8");
    expect(getAdminGroupCapacityDisplay({ tuitionType: "home", groupCapacity: 8 })).toBeNull();
    expect(getAdminGroupCapacityDisplay({ tuitionType: "group", groupCapacity: null })).toBeNull();
  });

  it("formats duration for authorized Package matching detail only", () => {
    expect(getAdminPackageDurationDisplay({ tuitionType: "package", packageDurationMonths: 6 })).toBe("6 months");
    expect(getAdminPackageDurationDisplay({ tuitionType: "package", packageDurationMonths: 1 })).toBe("1 month");
    expect(getAdminPackageDurationDisplay({ tuitionType: "home", packageDurationMonths: 6 })).toBeNull();
    expect(getAdminPackageDurationDisplay({ tuitionType: "package", packageDurationMonths: null })).toBeNull();
  });

  it("formats Number of Students for authorized Home, Online, and Package matching details only", () => {
    expect(getAdminStudentCountDisplay({ tuitionType: "home", studentCount: 2 })).toBe("2");
    expect(getAdminStudentCountDisplay({ tuitionType: "online", studentCount: 1 })).toBe("1");
    expect(getAdminStudentCountDisplay({ tuitionType: "package", studentCount: 3 })).toBe("3");
    expect(getAdminStudentCountDisplay({ tuitionType: "group", studentCount: 8 })).toBeNull();
    expect(getAdminStudentCountDisplay({ tuitionType: "home", studentCount: null })).toBeNull();
  });

  it("requires a recorded Guardian confirmation before approval or publication controls appear", () => {
    expect(getAdminPublicationActions({ state: "submitted", guardianConfirmed: false })).toContain("verify");
    expect(getAdminPublicationActions({ state: "reviewing", guardianConfirmed: false })).toContain("guardian_confirmed");
    expect(getAdminPublicationActions({ state: "reviewing", guardianConfirmed: false })).not.toContain("approve");
    expect(getAdminPublicationActions({ state: "reviewing", guardianConfirmed: true })).toContain("approve");
    expect(getAdminPublicationActions({ state: "approved", guardianConfirmed: true })).toContain("publish");
  });

  it("presents Job Board lifecycle state independently from manual matching status", () => {
    expect(getAdminPublicationStatePresentation("approved")).toMatchObject({ label: "Approved for Job Board" });
    expect(getAdminPublicationStatePresentation("published")).toMatchObject({ label: "Published" });
    expect(getAdminPublicationActions({ state: "published", guardianConfirmed: true })).toContain("unpublish");
  });

  it("renders a Guardian-call-first control and prevents premature approval in the reviewing state", () => {
    const onAction = vi.fn();
    render(createElement(PublicationControls, {
      request: reviewingRequest,
      busy: false,
      onAction,
      onEdit: event => event.preventDefault(),
    }));

    expect(screen.getByRole("button", { name: /record guardian call confirmation/i })).not.toBeNull();
    expect(screen.queryByRole("button", { name: /approve for job board/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /publish to job board/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /record guardian call confirmation/i }));
    expect(onAction).toHaveBeenCalledWith("guardian_confirmed");
  });

  it("keeps confirmation scoped to an assigned Tutor and requires a reason before an Admin can cancel", () => {
    const onAction = vi.fn();
    const { container, rerender } = render(createElement(PublicationControls, {
      request: reviewingRequest,
      busy: false,
      onAction,
      onEdit: event => event.preventDefault(),
    }));
    const card = within(container);

    expect(card.queryByRole("button", { name: /confirm guardian and tutor appointment/i })).toBeNull();
    expect(card.getByRole("button", { name: /cancel request/i }).hasAttribute("disabled")).toBe(true);
    fireEvent.change(card.getByRole("textbox", { name: /cancellation reason/i }), { target: { value: "Guardian requested closure" } });
    expect(card.getByRole("button", { name: /cancel request/i }).hasAttribute("disabled")).toBe(false);

    rerender(createElement(PublicationControls, {
      request: { ...reviewingRequest, status: "matched", tutorId: "T-125" },
      busy: false,
      onAction,
      onEdit: event => event.preventDefault(),
    }));
    expect(card.getByRole("button", { name: /confirm guardian and tutor appointment/i })).not.toBeNull();
  });

  it("does not expose the legacy no-reason Close request action", () => {
    const onAction = vi.fn();
    render(createElement(PublicationControls, {
      request: reviewingRequest,
      busy: false,
      onAction,
      onEdit: event => event.preventDefault(),
    }));

    expect(getAdminPublicationActions({ state: "reviewing", guardianConfirmed: false })).not.toContain("close");
    expect(screen.queryByRole("button", { name: /^close request$/i })).toBeNull();
  });

  it("publishes without asking for a Job ID, because the job already has one", () => {
    const onAction = vi.fn();
    render(createElement(PublicationControls, {
      request: { ...reviewingRequest, publicationState: "approved", guardianConfirmedAt: new Date("2026-08-21T08:00:00.000Z") },
      busy: false,
      onAction,
      onEdit: event => event.preventDefault(),
    }));

    // The number is derived from the request, so there is nothing to type and
    // nothing that could clash. An Admin used to be offered a free-text field
    // here, which allowed two kinds of ID for the same kind of thing.
    expect(screen.queryByLabelText(/job id/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /publish to job board/i }));
    expect(onAction).toHaveBeenCalledWith("publish");
  });

  it("keeps Tutor contact within the protected Admin queue and offers only valid review actions", () => {
    const onReview = vi.fn();
    render(createElement(TutorInterestQueue, {
      interests: [{
        interestId: 71,
        status: "interested",
        tutorId: "1503",
        tutorName: "Amina Rahman",
        tutorNumber: "+8801712345678",
        publicJobId: "CT-JOB-000071",
        jobId: 42,
        jobTitle: "Standard 2",
      }],
      isLoading: false,
      isError: false,
      isSaving: false,
      onReview,
    }));

    expect(screen.getByRole("region", { name: /tutor apply review queue/i })).not.toBeNull();
    expect(screen.getByText("Tutor applications awaiting coordination")).not.toBeNull();
    expect(screen.getByText("Amina Rahman")).not.toBeNull();
    expect(screen.getByRole("link", { name: /call amina rahman/i }).getAttribute("href")).toBe("tel:+8801712345678");
    fireEvent.click(screen.getByRole("button", { name: /shortlist tutor/i }));
    expect(onReview).toHaveBeenCalledWith(71, "shortlisted");
    expect(screen.getByRole("button", { name: /decline application/i })).not.toBeNull();
    expect(screen.queryByRole("button", { name: /mark matched/i })).toBeNull();
  });

  it("keeps Guardian photo moderation private while allowing 2FA-gated Admin decisions", () => {
    const onReview = vi.fn();
    render(createElement(GuardianPhotoModerationQueue, {
      photos: [{
        photoId: 31,
        guardianId: "GD-8K4M29",
        status: "pending_review",
        submittedAt: new Date("2026-08-21T08:00:00.000Z"),
        photoUrl: "https://signed.example/guardian-photo",
      }],
      isLoading: false,
      isError: false,
      isSaving: false,
      onReview,
    }));

    expect(screen.getByRole("region", { name: /guardian photo moderation queue/i })).not.toBeNull();
    expect(screen.getByText("GD-8K4M29")).not.toBeNull();
    expect(screen.queryByText(/@/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /approve photo/i }));
    expect(onReview).toHaveBeenCalledWith(31, "approved");
    fireEvent.change(screen.getByLabelText(/rejection reason for gd-8k4m29/i), { target: { value: "low_quality_or_unrelated_image" } });
    fireEvent.change(screen.getByLabelText(/optional note for gd-8k4m29/i), { target: { value: "Please upload a clear, recent portrait." } });
    fireEvent.click(screen.getByRole("button", { name: /reject photo/i }));
    expect(onReview).toHaveBeenLastCalledWith(31, "rejected", "low_quality_or_unrelated_image", "Please upload a clear, recent portrait.");
  });
});
