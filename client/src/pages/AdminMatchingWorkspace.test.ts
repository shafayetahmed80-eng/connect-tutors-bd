// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
  BulkPublicationBar,
  getBulkActionableRequests,
  PublicationControls,
  TutorMatchPicker,
  serializeAdminMatchingSavedViewFilters,
  shouldAutoApplyDefaultSavedView,
  TutorInterestQueue,
  type MatchingRequest,
  getAdminRequestAgeDisplay,
  getAdminPublicationExpiryDisplay,
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

/** Saved Views collapses by default; its controls exist only once opened. */
function openSavedViews() {
  fireEvent.click(screen.getByRole("button", { name: /Saved Views/ }));
}
afterEach(cleanup);

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

    openSavedViews();

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

    openSavedViews();

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

    openSavedViews();

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
        tutorId: "tutor-9",
        tutorName: "Amina Rahman",
        tutorNumber: 1503,
        tutorPhone: "+8801712345678",
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
    // The Tutor ID is the registered number; the internal key never shows.
    expect(screen.getByText("Tutor ID 1503 · Job CT-JOB-000071")).not.toBeNull();
    expect(screen.queryByText(/tutor-9/)).toBeNull();
    expect(screen.getByRole("link", { name: /call amina rahman/i }).getAttribute("href")).toBe("tel:+8801712345678");
    fireEvent.click(screen.getByRole("button", { name: /shortlist tutor/i }));
    expect(onReview).toHaveBeenCalledWith(71, "shortlisted");
    expect(screen.getByRole("button", { name: /decline application/i })).not.toBeNull();
    expect(screen.queryByRole("button", { name: /mark matched/i })).toBeNull();
  });
});


describe("what a matching card says about its own age", () => {
  const now = new Date("2026-09-12T10:00:00.000Z");

  it("counts the days a request has been open, and how long it has been quiet", () => {
    const age = getAdminRequestAgeDisplay({
      createdAt: "2026-09-04T10:00:00.000Z",
      lastActivityAt: "2026-09-10T10:00:00.000Z",
    }, now);

    expect(age?.openDays).toBe(8);
    expect(age?.label).toBe("Open 8 days");
    expect(age?.quietLabel).toBe("Quiet 2 days");
    // Eight days open but touched two days ago is not stale: the cue to call
    // is silence, not age.
    expect(age?.stale).toBe(false);
  });

  it("flags a week of silence, which is the cue to call", () => {
    const age = getAdminRequestAgeDisplay({
      createdAt: "2026-08-20T10:00:00.000Z",
      lastActivityAt: "2026-09-01T10:00:00.000Z",
    }, now);

    expect(age?.quietDays).toBe(11);
    expect(age?.stale).toBe(true);
  });

  it("says nothing at all rather than guessing from a missing date", () => {
    expect(getAdminRequestAgeDisplay({ createdAt: null, lastActivityAt: null }, now)).toBeNull();
  });
});

describe("what a published card says about its remaining visibility", () => {
  const now = new Date("2026-09-12T10:00:00.000Z");

  it("counts down the fourteen-day window and warns inside three days", () => {
    expect(getAdminPublicationExpiryDisplay({ publicationState: "published", publishedExpiresAt: "2026-09-22T10:00:00.000Z" }, now))
      .toMatchObject({ label: "Expires in 10 days", tone: "ok" });
    expect(getAdminPublicationExpiryDisplay({ publicationState: "published", publishedExpiresAt: "2026-09-14T10:00:00.000Z" }, now))
      .toMatchObject({ label: "Expires in 2 days", tone: "soon" });
    expect(getAdminPublicationExpiryDisplay({ publicationState: "published", publishedExpiresAt: "2026-09-10T10:00:00.000Z" }, now))
      .toMatchObject({ label: "Visibility expired", tone: "expired" });
  });

  it("has nothing to say unless the job is actually published", () => {
    // `expiresAt` belongs to the published tutor_jobs row, so an approved
    // request has no window to count down yet.
    expect(getAdminPublicationExpiryDisplay({ publicationState: "approved", publishedExpiresAt: "2026-09-22T10:00:00.000Z" }, now)).toBeNull();
    expect(getAdminPublicationExpiryDisplay({ publicationState: "published", publishedExpiresAt: null }, now)).toBeNull();
  });
});


describe("the Tutor picker on a matching card", () => {
  const request = {
    id: 7,
    subjects: JSON.stringify(["Physics"]),
    classCourse: "HSC 1st Year",
    category: "Bangla Medium",
    preferredGender: "female" as const,
    tuitionType: "home" as const,
    budgetAmount: 6000,
    monthlyBudget: null,
    tuitionLocationLabel: "Uttara",
    locationText: "Uttara, Dhaka",
  };
  const tutors = [
    { id: "far", name: "Far Away", subjects: ["Biology"], levels: [], fee: 9000, gender: "male" as const, mode: "online", locationLabel: "Khulna", city: "Khulna", experience: 1 },
    { id: "near", name: "Near Match", subjects: ["Physics"], levels: ["HSC 1st Year"], fee: 5000, gender: "female" as const, mode: "home", locationLabel: "Uttara", city: "Dhaka", experience: 6 },
  ];

  function renderPicker(overrides: Record<string, unknown> = {}) {
    const onSelect = vi.fn();
    render(createElement(TutorMatchPicker, {
      request: request as never,
      tutors,
      isLoading: false,
      disabled: false,
      selectedTutorId: "",
      onSelect,
      ...overrides,
    }));
    return { onSelect };
  }

  it("leads with the best match and writes out why, for both of them", () => {
    renderPicker();
    const options = screen.getAllByRole("radio");

    expect(options).toHaveLength(2);
    expect(options[0].getAttribute("value")).toBe("near");
    expect(screen.getByText("Teaches Physics")).toBeTruthy();
    // The weaker Tutor stays on the list, with its mismatches named.
    expect(screen.getByText("Does not list Physics")).toBeTruthy();
    expect(screen.getByText("Asks 9000 over the 6000 budget")).toBeTruthy();
  });

  it("narrows to subject matches when asked, and says so when nothing is left", () => {
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Subject match" }));
    expect(screen.getAllByRole("radio")).toHaveLength(1);

    fireEvent.change(screen.getByPlaceholderText("Search name or subject"), { target: { value: "zzz" } });
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.getByText(/No approved Tutor matches these narrowing choices/)).toBeTruthy();
  });

  it("reports the chosen Tutor to the card that owns the assignment", () => {
    const { onSelect } = renderPicker();
    fireEvent.click(screen.getAllByRole("radio")[0]);
    expect(onSelect).toHaveBeenCalledWith("near");
  });

  it("goes read-only while assignment is blocked", () => {
    renderPicker({ disabled: true });
    for (const option of screen.getAllByRole("radio")) {
      expect((option as HTMLInputElement).disabled).toBe(true);
    }
    expect((screen.getByPlaceholderText("Search name or subject") as HTMLInputElement).disabled).toBe(true);
  });
});


describe("acting on a batch of requests", () => {
  function request(id: number, overrides: Partial<MatchingRequest> = {}) {
    return {
      id,
      publicationState: "approved",
      guardianConfirmedAt: new Date("2026-09-01T10:00:00.000Z"),
      guardianReconfirmedAt: null,
      ...overrides,
    } as MatchingRequest;
  }

  it("only counts the requests the per-card gate would allow anyway", () => {
    const requests = [
      request(1),
      request(2, { publicationState: "reviewing" }),
      request(3, { publicationState: "approved", guardianConfirmedAt: null }),
      request(4, { publicationState: "published" }),
    ];

    // Publish needs an approved-or-unpublished request with the call recorded.
    expect(getBulkActionableRequests(requests, [1, 2, 3, 4], "publish").map(r => r.id)).toEqual([1]);
    // Approve needs a reviewing request with the call recorded.
    expect(getBulkActionableRequests(requests, [1, 2, 3, 4], "approve").map(r => r.id)).toEqual([2]);
    // A request nobody selected is never touched.
    expect(getBulkActionableRequests(requests, [2], "publish")).toEqual([]);
  });

  it("stays out of the way until something is selected", () => {
    const { container } = render(createElement(BulkPublicationBar, {
      requests: [request(1)], selectedIds: [], busy: false, onClear: vi.fn(), onRun: vi.fn(),
    }));
    expect(container.firstChild).toBeNull();
  });

  it("says how many each action will really touch, and offers no irreversible one", () => {
    const requests = [request(1), request(2, { publicationState: "reviewing" })];
    const onRun = vi.fn();
    render(createElement(BulkPublicationBar, {
      requests, selectedIds: [1, 2], busy: false, onClear: vi.fn(), onRun,
    }));

    // The figure sits in its own tabular-nums span, so the count and the word
    // are separate text nodes.
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText(/selected$/)).toBeTruthy();
    // Verification records a phone call and cancellation cannot be undone;
    // neither is offered here.
    expect(screen.queryByRole("button", { name: /verification/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /cancel request/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Publish (1)" }));
    expect(onRun).toHaveBeenCalledWith("publish", [1]);
  });

  it("disables an action that would touch nothing", () => {
    render(createElement(BulkPublicationBar, {
      requests: [request(1, { publicationState: "published" })],
      selectedIds: [1], busy: false, onClear: vi.fn(), onRun: vi.fn(),
    }));

    expect((screen.getByRole("button", { name: "Publish (0)" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Approve for Job Board (0)" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
