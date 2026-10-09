// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lastInput: null as unknown,
  optionsInput: null as unknown,
  optionsEnabled: undefined as boolean | undefined,
  options: {
    tuitionTypes: ["home", "online"],
    daysPerWeek: [3, 5],
    cities: [{ id: "dhaka", label: "Dhaka" }],
    locationsByCity: { dhaka: [{ id: "banasree", label: "Banasree" }] },
    classesByCategory: { "English Version": ["Class 8"] },
    subjectsByClass: { "Class 8": ["History"] },
  },
  publish: vi.fn(),
  approveGuardian: vi.fn(),
  declineGuardian: vi.fn(),
  confirm: vi.fn(),
  reopen: vi.fn(),
  data: {
    items: [
      {
        id: 13,
        guardianUserId: 10,
        guardianName: "Sojib Rahman",
        guardianPhone: "+8801674936203",
        guardianId: "GD-11A2",
        tuitionType: "home",
        category: "English Version",
        classCourse: "Class 8",
        subjects: JSON.stringify(["History", "Home Economics"]),
        daysPerWeek: 3,
        preferredGender: "female",
        studentGender: "female",
        studentCount: 1,
        groupCapacity: null,
        packageDurationMonths: null,
        budgetAmount: 5000,
        tuitionLocationLabel: "Banasree, Dhaka",
        locationText: "Banasree",
        addressDetails: "House 4, Road 2",
        instituteName: "City College",
        heardAboutUs: "facebook",
        notes: "Evening slots only",
        status: "new",
        publicationState: "submitted",
        tutorId: null,
        appointmentConfirmedAt: null,
        cancellationReason: null,
        contactConsent: "not_required",
        createdAt: new Date("2026-09-06T00:00:00.000Z"),
        appliedTutorCount: 7,
        guardianRequest: null as null | { id: number; type: "confirm" | "remove_tutor" | "cancel_tuition"; tutorId: string | null; reason: string | null; createdAt: Date },
      },
    ],
    counts: { pending: 4, live: 9, appointed: 0, confirmed: 0, cancelled: 0 },
    total: 4,
    page: 1,
    pageSize: 12,
    totalPages: 1,
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      listPostedJobs: {
        useQuery: (input: unknown) => {
          mocks.lastInput = input;
          return { data: mocks.data, isLoading: false, isError: false };
        },
      },
      jobFilterOptions: {
        useQuery: (input: unknown, options?: { enabled?: boolean }) => {
          mocks.optionsInput = input;
          mocks.optionsEnabled = options?.enabled;
          return { data: mocks.options };
        },
      },
      moderateTutorRequestPublication: {
        useMutation: () => ({ mutate: mocks.publish, isPending: false }),
      },
      approveGuardianTuitionRequest: { useMutation: () => ({ mutate: mocks.approveGuardian, isPending: false }) },
      declineGuardianTuitionRequest: { useMutation: () => ({ mutate: mocks.declineGuardian, isPending: false }) },
    },
    useUtils: () => ({
      admin: {
        listPostedJobs: { invalidate: vi.fn() }, listAppliedTutors: { invalidate: vi.fn() }, listAppointedJobs: { invalidate: vi.fn() },
        listConfirmedJobs: { invalidate: vi.fn() }, listTutorDirectory: { invalidate: vi.fn() }, listTutorApplications: { invalidate: vi.fn() },
      },
    }),
  },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { AdminPostedJobsContent } from "./AdminPostedJobs";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  Object.assign(mocks.data.items[0], { publicationState: "submitted", status: "new", tutorId: null, appointmentConfirmedAt: null, appointmentRequested: false, postedByAdmin: 0, guardianRequest: null });
});

describe("Admin Posted jobs board", () => {
  it("mirrors the Guardian's five stages with counts across every Guardian", () => {
    render(<AdminPostedJobsContent />);

    for (const label of ["Pending", "Live", "Appointed", "Confirmed", "Cancelled"]) {
      expect(screen.getByRole("tab", { name: new RegExp(label) })).toBeTruthy();
    }
    // Zero-padded, exactly like the Guardian tab.
    expect(screen.getByRole("tab", { name: /Pending/ }).textContent).toContain("04");
    expect(screen.getByRole("tab", { name: /Live/ }).textContent).toContain("09");
    expect(screen.getByRole("button", { name: /Add Tuition/ })).toBeTruthy();
    // On a phone the five stages keep one line.
    expect(screen.getByRole("tablist", { name: "Request stages" }).className).toContain("flex-nowrap");
  });

  it("asks the server for the chosen stage and the typed search", async () => {
    const user = userEvent.setup();
    render(<AdminPostedJobsContent />);

    expect(mocks.lastInput).toMatchObject({ stage: "pending", query: "", page: 1, postedBy: "all" });

    await user.click(screen.getByRole("tab", { name: /Live/ }));
    expect(mocks.lastInput).toMatchObject({ stage: "live", page: 1 });

    fireEvent.change(screen.getByPlaceholderText(/Search subject/i), { target: { value: "Banasree" } });
    expect(mocks.lastInput).toMatchObject({ query: "Banasree", page: 1 });
  });

  it("opens the same details dialog and ends it with the Guardian's name and number", async () => {
    const user = userEvent.setup();
    render(<AdminPostedJobsContent />);

    // The whole card is the button; "Details" is its visible affordance.
    await user.click(screen.getByRole("button", { name: /Job ID 6812/ }));
    const dialog = screen.getByRole("dialog");

    // The Guardian's own fields are all there...
    expect(within(dialog).getByText("Job ID : 6812")).toBeTruthy();
    expect(within(dialog).getByText("Evening slots only")).toBeTruthy();
    // ...plus the Admin-only tail.
    expect(within(dialog).getByText("House 4, Road 2")).toBeTruthy();
    expect(within(dialog).getByText("Sojib Rahman")).toBeTruthy();
    expect(within(dialog).getByText("+8801674936203")).toBeTruthy();
    // Update is replaced by the two Admin actions.
    expect(within(dialog).queryByRole("button", { name: "Update" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: /Change Status/ })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: /Edit/ })).toBeTruthy();
  });

  it("takes a Pending tuition Live in one click", async () => {
    const user = userEvent.setup();
    render(<AdminPostedJobsContent />);

    await user.click(screen.getByRole("button", { name: /Job ID 6812/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Change Status/ }));

    // Pending offers exactly one move, and it is the whole dialog.
    const status = screen.getByRole("dialog");
    expect(within(status).getByRole("heading", { name: /Change status of Job ID 6812/ })).toBeTruthy();
    await user.click(within(status).getByRole("button", { name: "Live" }));
    expect(mocks.publish).toHaveBeenCalledWith({ requestId: 13, action: "go_live" });
  });

  it("drops Change Status once the tuition is past Pending", async () => {
    mocks.data.items[0].publicationState = "published";
    const user = userEvent.setup();
    render(<AdminPostedJobsContent />);

    await user.click(screen.getByRole("button", { name: /Job ID 6812/ }));
    const dialog = screen.getByRole("dialog");
    // The board owns one move, Pending to Live; a Live tuition has none, so the
    // button itself is gone rather than opening a dialog with nothing in it.
    expect(within(dialog).queryByRole("button", { name: /Change Status/ })).toBeNull();
    expect(within(dialog).getByRole("button", { name: /Edit/ })).toBeTruthy();
  });

  it("shows the applied Tutor count on a live tuition, on the card and in the dialog", async () => {
    mocks.data.items[0].publicationState = "published";
    const user = userEvent.setup();
    render(<AdminPostedJobsContent />);

    const card = screen.getByRole("button", { name: /Job ID 6812/ });
    const cardLink = within(card).getByRole("link", { name: /Applied Tutors/ });
    expect(cardLink.textContent).toContain("(7)");
    expect(cardLink.getAttribute("href")).toBe("/admin/applied-tutors/13");

    await user.click(card);
    expect(within(screen.getByRole("dialog")).getByRole("link", { name: /Applied Tutors/ })).toBeTruthy();
  });

  it("leaves an Appointed tuition's next move to Applied Tutors", async () => {
    Object.assign(mocks.data.items[0], { publicationState: "published", status: "matched", tutorId: "tutor-175" });
    const user = userEvent.setup();
    render(<AdminPostedJobsContent />);

    await user.click(screen.getByRole("button", { name: /Job ID 6812/ }));
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).queryByRole("button", { name: /Change Status/ })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: /Confirmed/ })).toBeNull();
    expect(within(dialog).getByRole("link", { name: /Applied Tutors/ }).getAttribute("href")).toBe("/admin/applied-tutors/13");
  });

  it("still opens Applied Tutors from a Confirmed tuition", async () => {
    Object.assign(mocks.data.items[0], { publicationState: "published", status: "matched", tutorId: "tutor-175", appointmentConfirmedAt: new Date("2026-09-14T09:00:00.000Z") });
    const user = userEvent.setup();
    render(<AdminPostedJobsContent />);

    await user.click(screen.getByRole("button", { name: /Job ID 6812/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: /Change Status/ })).toBeNull();
    expect(within(dialog).getByRole("link", { name: /Applied Tutors/ }).getAttribute("href")).toBe("/admin/applied-tutors/13");
  });

  it("says on the card and in the details footer who posted the tuition", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<AdminPostedJobsContent />);
    expect(within(screen.getByRole("button", { name: /Job ID 6812/ })).getByText("Guardian Post")).toBeTruthy();
    unmount();

    Object.assign(mocks.data.items[0], { postedByAdmin: 1 });
    render(<AdminPostedJobsContent />);
    const card = screen.getByRole("button", { name: /Job ID 6812/ });
    expect(within(card).getByText("Admin Post")).toBeTruthy();
    await user.click(card);
    expect(within(screen.getByRole("dialog")).getByText("Admin Post")).toBeTruthy();
  });

  it("marks a tuition whose Guardian asked for an appointment", () => {
    Object.assign(mocks.data.items[0], { publicationState: "published", appointmentRequested: true });
    render(<AdminPostedJobsContent />);

    expect(within(screen.getByRole("button", { name: /Job ID 6812/ })).getByText("Appointment requested")).toBeTruthy();
  });

  it("answers a Guardian's cancellation from the details dialog, even while Pending", async () => {
    const user = userEvent.setup();
    mocks.data.items[0].guardianRequest = { id: 7, type: "cancel_tuition", tutorId: null, reason: "Found a Tutor elsewhere", createdAt: new Date("2026-09-16T08:00:00.000Z") };
    render(<AdminPostedJobsContent />);

    const card = screen.getByRole("button", { name: /Job ID 6812/ });
    expect(within(card).getByText("Cancellation requested")).toBeTruthy();

    await user.click(card);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Approve: Cancellation requested" }));
    const approval = screen.getByRole("dialog");
    expect(within(approval).getByText("Cancel Job ID 6812?")).toBeTruthy();
    expect(within(approval).getByText("Found a Tutor elsewhere")).toBeTruthy();
    await user.click(within(approval).getByRole("button", { name: "Approve" }));
    expect(mocks.approveGuardian).toHaveBeenCalledWith({ guardianRequestId: 7 });

    await user.click(within(approval).getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: /Job ID 6812/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Decline: Cancellation requested" }));
    expect(mocks.declineGuardian).toHaveBeenCalledWith({ guardianRequestId: 7 });
  });

  it("only marks a Confirm or Remove request, which is answered on Applied Tutors", async () => {
    const user = userEvent.setup();
    Object.assign(mocks.data.items[0], { publicationState: "published", status: "matched", tutorId: "tutor-175" });
    mocks.data.items[0].guardianRequest = { id: 5, type: "confirm", tutorId: "tutor-175", reason: null, createdAt: new Date("2026-09-16T08:00:00.000Z") };
    render(<AdminPostedJobsContent />);

    await user.click(screen.getByRole("button", { name: /Job ID 6812/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Confirm requested")).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: /Approve/ })).toBeNull();
  });

  it("keeps the applicants one click away once a Tutor is Appointed", () => {
    Object.assign(mocks.data.items[0], { publicationState: "published", status: "matched", tutorId: "tutor-175" });
    render(<AdminPostedJobsContent />);

    expect(within(screen.getByRole("button", { name: /Job ID 6812/ })).getByRole("link", { name: /Applied Tutors/ }).getAttribute("href"))
      .toBe("/admin/applied-tutors/13");
  });

  it("narrows the same board to Admin posts on Admin Posted Jobs", async () => {
    const user = userEvent.setup();
    render(<AdminPostedJobsContent postedBy="admin" />);

    expect(mocks.lastInput).toMatchObject({ postedBy: "admin", stage: "pending", page: 1 });
    await user.click(screen.getByRole("tab", { name: /Live/ }));
    expect(mocks.lastInput).toMatchObject({ postedBy: "admin", stage: "live" });
    expect(screen.getByRole("button", { name: /Add Tuition/ })).toBeTruthy();
  });

  it("keeps the applied count off a tuition that is not live yet", () => {
    render(<AdminPostedJobsContent />);
    expect(screen.queryByRole("link", { name: /Applied Tutors/ })).toBeNull();
  });
});

describe("the filter card and panel", () => {
  const openPanel = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    return screen.getByRole("region", { name: "Posted jobs filters" });
  };

  it("heads the list with the open stage's name and count, as the Job Board does", async () => {
    const user = userEvent.setup();
    render(<AdminPostedJobsContent />);

    const card = screen.getByRole("banner");
    expect(within(card).getByText("Pending Jobs")).toBeTruthy();
    expect(within(card).getByText("4")).toBeTruthy();
    expect(within(card).getByText("currently pending")).toBeTruthy();
    // Add Tuition now sits in the card beside Filter.
    expect(within(card).getByRole("button", { name: /Add Tuition/ })).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: /Live/ }));
    expect(within(screen.getByRole("banner")).getByText("Live Jobs")).toBeTruthy();
    expect(within(screen.getByRole("banner")).getByText("9")).toBeTruthy();
    expect(within(screen.getByRole("banner")).getByText("currently live")).toBeTruthy();
  });

  it("reads the options only once the panel is opened, and offers no Country", async () => {
    const user = userEvent.setup();
    render(<AdminPostedJobsContent />);
    expect(mocks.optionsEnabled).toBe(false);
    expect(screen.queryByRole("region", { name: "Posted jobs filters" })).toBeNull();

    const panel = await openPanel(user);
    expect(mocks.optionsEnabled).toBe(true);
    expect(mocks.optionsInput).toEqual({ postedBy: "all" });
    expect(within(panel).getByText("jobs found").parentElement?.textContent).toContain("4");
    expect(within(panel).queryByRole("combobox", { name: "Country" })).toBeNull();
    for (const name of ["City", "Student Gender", "Tutor Gender", "Waiting Request", "Days in Stage", "Posted By"]) {
      expect(within(panel).getByRole("combobox", { name })).toBeTruthy();
    }
    for (const label of ["Posted Date From", "Posted Date To", "Job ID", "Salary From", "Salary To", "Guardian Name, Mobile or ID"]) {
      expect(within(panel).getByLabelText(label)).toBeTruthy();
    }
    await user.click(within(panel).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("region", { name: "Posted jobs filters" })).toBeNull();
  });

  it("changes nothing until Apply, then narrows the list and says how many filters", async () => {
    const user = userEvent.setup();
    render(<AdminPostedJobsContent />);
    const panel = await openPanel(user);

    fireEvent.change(within(panel).getByLabelText("Salary From"), { target: { value: "5,000" } });
    fireEvent.change(within(panel).getByRole("combobox", { name: "Waiting Request" }), { target: { value: "confirm" } });
    fireEvent.change(within(panel).getByLabelText("Guardian Name, Mobile or ID"), { target: { value: " Sojib " } });
    expect((mocks.lastInput as { filters?: unknown }).filters).toBeUndefined();

    await user.click(within(panel).getByRole("button", { name: "Apply" }));
    expect((mocks.lastInput as { filters?: unknown }).filters).toEqual({ salaryFrom: 5000, waitingRequest: "confirm", guardian: "Sojib" });
    expect(mocks.lastInput).toMatchObject({ stage: "pending", page: 1 });
    expect(within(screen.getByRole("button", { name: /^Filter/ })).getByText("3")).toBeTruthy();
    expect(within(screen.getByRole("banner")).getByText("matching pending jobs")).toBeTruthy();
  });

  it("starts again from the first page when filters are applied or cleared", async () => {
    const user = userEvent.setup();
    mocks.data.totalPages = 3;
    try {
      render(<AdminPostedJobsContent />);
      await user.click(screen.getByRole("button", { name: /Next/ }));
      expect(mocks.lastInput).toMatchObject({ page: 2 });

      const panel = await openPanel(user);
      fireEvent.change(within(panel).getByLabelText("Salary From"), { target: { value: "4000" } });
      await user.click(within(panel).getByRole("button", { name: "Apply" }));
      expect(mocks.lastInput).toMatchObject({ page: 1 });

      await user.click(screen.getByRole("button", { name: /Next/ }));
      await user.click(within(screen.getByRole("region", { name: "Posted jobs filters" })).getByRole("button", { name: "Clear" }));
      expect(mocks.lastInput).toMatchObject({ page: 1 });
      expect((mocks.lastInput as { filters?: unknown }).filters).toBeUndefined();
    } finally {
      mocks.data.totalPages = 1;
    }
  });

  it("will not apply a range the wrong way round", async () => {
    const user = userEvent.setup();
    render(<AdminPostedJobsContent />);
    const panel = await openPanel(user);

    fireEvent.change(within(panel).getByLabelText("Salary From"), { target: { value: "9000" } });
    fireEvent.change(within(panel).getByLabelText("Salary To"), { target: { value: "5000" } });
    expect(within(panel).getByRole("alert").textContent).toContain("lowest salary cannot be above the highest");
    expect((within(panel).getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(within(panel).getByLabelText("Salary To"), { target: { value: "12,000" } });
    expect(within(panel).queryByRole("alert")).toBeNull();
    expect((within(panel).getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows the choices that belong to the open stage only, and drops the others when the stage changes", async () => {
    const user = userEvent.setup();
    render(<AdminPostedJobsContent />);
    let panel = await openPanel(user);

    // Pending: the moderation stage; nothing about applicants yet.
    expect(within(panel).getByRole("combobox", { name: "Moderation" })).toBeTruthy();
    expect(within(panel).queryByRole("combobox", { name: "Applicants" })).toBeNull();

    await user.click(screen.getByRole("tab", { name: /Live/ }));
    panel = screen.getByRole("region", { name: "Posted jobs filters" });
    expect(within(panel).queryByRole("combobox", { name: "Moderation" })).toBeNull();
    fireEvent.change(within(panel).getByRole("combobox", { name: "Applicants" }), { target: { value: "none" } });
    await user.click(within(panel).getByRole("button", { name: "Apply" }));
    expect((mocks.lastInput as { filters?: unknown }).filters).toEqual({ applicants: "none" });

    // Back to Pending: that choice means nothing there, so it is gone from the list and from the count.
    await user.click(screen.getByRole("tab", { name: /Pending/ }));
    expect((mocks.lastInput as { filters?: unknown }).filters).toBeUndefined();
    expect(within(screen.getByRole("button", { name: /^Filter/ })).queryByText("2")).toBeNull();
  });

  it("keeps a filter that holds in every stage while the Admin moves between them", async () => {
    const user = userEvent.setup();
    render(<AdminPostedJobsContent />);
    const panel = await openPanel(user);
    fireEvent.change(within(panel).getByLabelText("Salary From"), { target: { value: "5000" } });
    await user.click(within(panel).getByRole("button", { name: "Apply" }));

    await user.click(screen.getByRole("tab", { name: /Live/ }));
    expect((mocks.lastInput as { filters?: unknown }).filters).toEqual({ salaryFrom: 5000 });
  });

  it("offers Posted By on the whole board and not on the Admin's own, and asks for that board's options", async () => {
    const user = userEvent.setup();
    render(<AdminPostedJobsContent postedBy="admin" />);
    const panel = await openPanel(user);

    expect(within(panel).queryByRole("combobox", { name: "Posted By" })).toBeNull();
    expect(mocks.optionsInput).toEqual({ postedBy: "admin" });
  });

  it("says no tuition matches when the filters leave nothing", async () => {
    const user = userEvent.setup();
    const items = mocks.data.items;
    mocks.data.items = [];
    try {
      render(<AdminPostedJobsContent />);
      const panel = await openPanel(user);
      fireEvent.change(within(panel).getByLabelText("Salary From"), { target: { value: "99000" } });
      await user.click(within(panel).getByRole("button", { name: "Apply" }));
      expect(screen.getByText(/No pending jobs for this search/)).toBeTruthy();
    } finally {
      mocks.data.items = items;
    }
  });
});
