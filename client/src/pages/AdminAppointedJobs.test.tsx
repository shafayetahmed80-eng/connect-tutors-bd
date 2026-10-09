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
  confirm: vi.fn(),
  reopen: vi.fn(),
  cancelTuition: vi.fn(),
  approveGuardian: vi.fn(),
  declineGuardian: vi.fn(),
  invalidated: [] as string[],
  data: {
    items: [
      {
        id: 13, postedByAdmin: 1, classCourse: "Class 8", subjects: JSON.stringify(["History", "General Maths"]),
        tuitionLocationLabel: "Banasree, Dhaka", locationText: "Banasree", budgetAmount: 5000, daysPerWeek: 3,
        appointedAt: new Date("2026-09-13T08:30:00.000Z"),
        tutorId: "tutor-175", tutorNumber: 777 as number | null, tutorName: "Tania Sultana", tutorPhone: "+8801711111111" as string | null,
        guardianRequest: null as null | { id: number; type: "confirm" | "remove_tutor" | "cancel_tuition"; tutorId: string | null; reason: string | null; createdAt: Date },
      },
      {
        id: 21, postedByAdmin: 0, classCourse: "Class 9", subjects: JSON.stringify(["Physics"]),
        tuitionLocationLabel: null, locationText: null, budgetAmount: 6000, daysPerWeek: 4,
        appointedAt: null as Date | null,
        tutorId: "tutor-404", tutorNumber: null, tutorName: "Tanvir Ahmed", tutorPhone: null,
        guardianRequest: null,
      },
    ],
    total: 2, page: 1, pageSize: 20, totalPages: 1,
  },
}));

const invalidator = (name: string) => ({ invalidate: () => { mocks.invalidated.push(name); } });
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      admin: {
        listAppliedTutors: invalidator("listAppliedTutors"), listPostedJobs: invalidator("listPostedJobs"), listAppointedJobs: invalidator("listAppointedJobs"),
        listConfirmedJobs: invalidator("listConfirmedJobs"), listCancelledCharges: invalidator("listCancelledCharges"),
        listTutorDirectory: invalidator("listTutorDirectory"), listTutorApplications: invalidator("listTutorApplications"),
        guardianRequestCounts: invalidator("guardianRequestCounts"),
      },
    }),
    admin: {
      jobFilterOptions: {
        useQuery: (input: unknown, options?: { enabled?: boolean }) => {
          mocks.optionsInput = input;
          mocks.optionsEnabled = options?.enabled;
          return { data: mocks.options };
        },
      },
      listAppointedJobs: {
        useQuery: (input: unknown) => {
          mocks.lastInput = input;
          return { data: mocks.data, isLoading: false, isError: false };
        },
      },
      confirmTutorRequestAppointment: { useMutation: () => ({ mutate: mocks.confirm, isPending: false }) },
      reopenAppointedTuition: { useMutation: () => ({ mutate: mocks.reopen, isPending: false }) },
      removeConfirmedTutor: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      cancelTutorRequest: { useMutation: () => ({ mutate: mocks.cancelTuition, isPending: false }) },
      approveGuardianTuitionRequest: { useMutation: () => ({ mutate: mocks.approveGuardian, isPending: false }) },
      declineGuardianTuitionRequest: { useMutation: () => ({ mutate: mocks.declineGuardian, isPending: false }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { AdminAppointedJobsContent } from "./AdminAppointedJobs";

afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.invalidated.length = 0; mocks.data.items[0].guardianRequest = null; });

/** Opens the Actions menu of the row at `index` (0 is the first Job) the way a mouse does. */
const openMenu = (index: number) => {
  const row = screen.getAllByRole("row")[index + 1];
  fireEvent.pointerDown(within(row).getByRole("button", { name: /^Actions of Job ID/ }), { button: 0, ctrlKey: false, pointerType: "mouse" });
  return screen.getByRole("menu");
};

describe("Admin Appointed Jobs", () => {
  it("marks a Guardian's waiting request beside the Job ID", () => {
    mocks.data.items[0].guardianRequest = { id: 5, type: "confirm", tutorId: "tutor-175", reason: null, createdAt: new Date("2026-09-16T08:00:00.000Z") };
    render(<AdminAppointedJobsContent />);

    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Confirm requested")).toBeTruthy();
    expect(within(rows[1]).queryByText(/requested/)).toBeNull();
  });

  it("asks for the Appointed stage and names the columns in the Owner's order", () => {
    render(<AdminAppointedJobsContent />);

    expect(mocks.lastInput).toMatchObject({ query: "", page: 1 });
    expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual([
      "Job ID", "Posted By", "Class", "Subjects", "Location", "Salary", "Days", "Tutor ID", "Name", "Mobile", "Appointed", "Actions", "Tutor profile",
    ]);
  });

  it("reads each tuition, then the Tutor appointed to it and when", () => {
    render(<AdminAppointedJobsContent />);

    const row = within(screen.getAllByRole("row")[1]);
    expect(row.getByText("6812")).toBeTruthy();
    expect(row.getByText("Admin")).toBeTruthy();
    expect(row.getByText("Class 8")).toBeTruthy();
    expect(row.getByText("History, General Maths")).toBeTruthy();
    expect(row.getByText("Banasree, Dhaka")).toBeTruthy();
    expect(row.getByText(/5,000/)).toBeTruthy();
    expect(row.getByText("3 days / week")).toBeTruthy();
    // Tutor ID is the registered number, never the internal key.
    expect(row.getByText("777")).toBeTruthy();
    expect(row.queryByText("tutor-175")).toBeNull();
    expect(row.getByText("Tania Sultana")).toBeTruthy();
    expect(row.getByText("+8801711111111")).toBeTruthy();
    expect(row.getByText(/^13 Sep/)).toBeTruthy();
  });

  it("opens the appointed Tutor's own profile from the arrow", () => {
    render(<AdminAppointedJobsContent />);

    expect(screen.getByRole("link", { name: "Open the profile of Tania Sultana" }).getAttribute("href"))
      .toBe("/admin/tutor-profiles/tutor-175");
  });

  it("says Not set where a detail is missing rather than leaving a blank", () => {
    render(<AdminAppointedJobsContent />);

    const row = within(screen.getAllByRole("row")[2]);
    expect(row.getAllByText("Not set")).toHaveLength(3);
    expect(row.getByText("Guardian")).toBeTruthy();
    expect(row.getByText("Online")).toBeTruthy();
  });

  it("lets the rows rise in one after another", () => {
    render(<AdminAppointedJobsContent />);

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0].className).toContain("stagger-row-enter");
    expect(rows[0].style.getPropertyValue("--stagger")).toBe("0");
    expect(rows[1].style.getPropertyValue("--stagger")).toBe("1");
  });

  it("searches from the first page", () => {
    render(<AdminAppointedJobsContent />);
    fireEvent.change(screen.getByPlaceholderText(/Search class, subject, location or Tutor/), { target: { value: "Tania" } });
    expect(mocks.lastInput).toMatchObject({ query: "Tania", page: 1 });
  });
});

describe("the next move, from the row", () => {
  it("offers Confirm, Remove Tutor and Cancel Tuition on every Appointed row", async () => {
    render(<AdminAppointedJobsContent />);

    expect(within(openMenu(0)).getAllByRole("menuitem").map(item => item.textContent?.trim())).toEqual(["Confirm", "Remove Tutor", "Cancel Tuition"]);
  });

  it("confirms the Tutor only after a confirmation, then reads the lists again", async () => {
    render(<AdminAppointedJobsContent />);

    fireEvent.click(within(openMenu(0)).getByRole("menuitem", { name: "Confirm" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Confirm Tania Sultana?")).toBeTruthy();
    expect(within(dialog).getByText("Tutor ID 777 · Job ID 6812")).toBeTruthy();
    expect(mocks.confirm).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));
    // The internal key, never the visible Tutor ID, goes to the server.
    expect(mocks.confirm).toHaveBeenCalledWith({ requestId: 13, tutorId: "tutor-175" }, expect.anything());

    // The tuition leaves this list for Confirmed Jobs, so the answer refreshes both.
    (mocks.confirm.mock.calls[0][1] as { onSuccess: () => void }).onSuccess();
    expect(mocks.invalidated).toEqual(expect.arrayContaining(["listAppointedJobs", "listConfirmedJobs", "listAppliedTutors"]));
    // The sidebar's counts follow the move.
    expect(mocks.invalidated).toContain("guardianRequestCounts");
  });

  it("leaves the focus in the dialog the menu opened, not on the button behind it", async () => {
    render(<AdminAppointedJobsContent />);

    fireEvent.click(within(openMenu(0)).getByRole("menuitem", { name: "Confirm" }));
    const dialog = await screen.findByRole("dialog");
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("removes the Tutor after a confirmation, and keeps everything when the Admin backs out", async () => {
    render(<AdminAppointedJobsContent />);

    fireEvent.click(within(openMenu(1)).getByRole("menuitem", { name: "Remove Tutor" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.reopen).not.toHaveBeenCalled();

    fireEvent.click(within(openMenu(1)).getByRole("menuitem", { name: "Remove Tutor" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Remove Tanvir Ahmed?")).toBeTruthy();
    expect(within(dialog).getByText("Tutor ID not set · Job ID 6820")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove Tutor" }));
    expect(mocks.reopen).toHaveBeenCalledWith({ requestId: 21, tutorId: "tutor-404" }, expect.anything());
  });

  it("cancels the tuition only with a reason", async () => {
    render(<AdminAppointedJobsContent />);

    fireEvent.click(within(openMenu(0)).getByRole("menuitem", { name: "Cancel Tuition" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Cancel Job ID 6812?")).toBeTruthy();
    const cancel = within(dialog).getByRole("button", { name: "Cancel Tuition" }) as HTMLButtonElement;
    expect(cancel.disabled).toBe(true);

    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: "  The Guardian found a Tutor elsewhere  " } });
    fireEvent.click(cancel);
    expect(mocks.cancelTuition).toHaveBeenCalledWith({ requestId: 13, reason: "The Guardian found a Tutor elsewhere" }, expect.anything());
    (mocks.cancelTuition.mock.calls[0][1] as { onSuccess: () => void }).onSuccess();
    // A cancelled tuition may be one that was confirmed, so its charge list is read again too.
    expect(mocks.invalidated).toContain("listCancelledCharges");
  });

  it("answers a Guardian's Confirm request from the row, and the Admin's own Confirm steps aside", async () => {
    mocks.data.items[0].guardianRequest = { id: 5, type: "confirm", tutorId: "tutor-175", reason: null, createdAt: new Date("2026-09-16T08:00:00.000Z") };
    render(<AdminAppointedJobsContent />);

    expect(within(openMenu(0)).getAllByRole("menuitem").map(item => item.textContent?.trim())).toEqual(["Approve request", "Decline request", "Remove Tutor", "Cancel Tuition"]);

    fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "Approve request" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Confirm Tania Sultana?")).toBeTruthy();
    expect(mocks.approveGuardian).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }));
    expect(mocks.approveGuardian).toHaveBeenCalledWith({ guardianRequestId: 5 });

    fireEvent.click(within(openMenu(0)).getByRole("menuitem", { name: "Decline request" }));
    expect(mocks.declineGuardian).toHaveBeenCalledWith({ guardianRequestId: 5 });
  });

  it("puts a waiting cancellation request in place of Cancel Tuition, with the Guardian's reason", async () => {
    mocks.data.items[0].guardianRequest = { id: 7, type: "cancel_tuition", tutorId: null, reason: "Found a Tutor elsewhere", createdAt: new Date("2026-09-16T08:00:00.000Z") };
    render(<AdminAppointedJobsContent />);

    expect(within(openMenu(0)).getAllByRole("menuitem").map(item => item.textContent?.trim())).toEqual(["Approve request", "Decline request", "Confirm", "Remove Tutor"]);
    fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "Approve request" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Cancel Job ID 6812?")).toBeTruthy();
    expect(within(dialog).getByText("Found a Tutor elsewhere")).toBeTruthy();
  });
});

describe("the filter card and panel", () => {
  const openPanel = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    return screen.getByRole("region", { name: "Appointed jobs filters" });
  };

  it("heads the list with its count, and says when something narrows it", async () => {
    const user = userEvent.setup();
    render(<AdminAppointedJobsContent />);

    const card = screen.getByRole("banner");
    expect(within(card).getByText("Appointed Jobs")).toBeTruthy();
    expect(within(card).getByText("2")).toBeTruthy();
    expect(within(card).getByText("currently appointed")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/Search class, subject, location/), { target: { value: "Math" } });
    expect(within(screen.getByRole("banner")).getByText("matching appointed jobs")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(/Search class, subject, location/), { target: { value: "" } });

    // Nothing is asked for until the panel is opened.
    expect(mocks.optionsEnabled).toBe(false);
    await openPanel(user);
    expect(mocks.optionsEnabled).toBe(true);
    expect(mocks.optionsInput).toEqual({ postedBy: "all" });
  });

  it("offers the Job Board's fields and the Admin's, and no Country", async () => {
    const user = userEvent.setup();
    render(<AdminAppointedJobsContent />);
    const panel = await openPanel(user);

    expect(within(panel).queryByRole("combobox", { name: "Country" })).toBeNull();
    for (const name of ["City", "Student Gender", "Tutor Gender", "Posted By", "Days in Stage"]) {
      expect(within(panel).getByRole("combobox", { name })).toBeTruthy();
    }
    for (const label of ["Posted Date From", "Job ID", "Salary From", "Salary To", "Guardian Name, Mobile or ID"]) {
      expect(within(panel).getByLabelText(label)).toBeTruthy();
    }
    // What belongs to the earlier stages is not here.
    expect(within(panel).queryByRole("combobox", { name: "Applicants" })).toBeNull();
    expect(within(panel).queryByRole("combobox", { name: "Moderation" })).toBeNull();
  });

  it("adds the Appointed stage's own choices, and sends them once Applied", async () => {
    const user = userEvent.setup();
    render(<AdminAppointedJobsContent />);
    const panel = await openPanel(user);

    expect(within(panel).getByLabelText("Appointed Date From")).toBeTruthy();
    expect(within(panel).getByLabelText("Appointed Date To")).toBeTruthy();
    expect(within(panel).getByRole("combobox", { name: "Waiting Request" })).toBeTruthy();
    expect(within(panel).queryByLabelText("Confirmed Date From")).toBeNull();
    expect(within(panel).queryByRole("combobox", { name: "Settlement" })).toBeNull();

    fireEvent.change(within(panel).getByRole("combobox", { name: "Assigned Tutor Gender" }), { target: { value: "female" } });
    fireEvent.change(within(panel).getByLabelText("Salary From"), { target: { value: "5,000" } });
    expect((mocks.lastInput as { filters?: unknown }).filters).toBeUndefined();

    await user.click(within(panel).getByRole("button", { name: "Apply" }));
    expect((mocks.lastInput as { filters?: unknown }).filters).toEqual({ tutorGender: "female", salaryFrom: 5000 });
    expect(mocks.lastInput).toMatchObject({ page: 1 });
    expect(within(screen.getByRole("button", { name: /^Filter/ })).getByText("2")).toBeTruthy();
    expect(within(screen.getByRole("banner")).getByText("matching appointed jobs")).toBeTruthy();

    await user.click(within(screen.getByRole("region", { name: "Appointed jobs filters" })).getByRole("button", { name: "Clear" }));
    expect((mocks.lastInput as { filters?: unknown }).filters).toBeUndefined();
  });

  it("will not apply a date range the wrong way round", async () => {
    const user = userEvent.setup();
    render(<AdminAppointedJobsContent />);
    const panel = await openPanel(user);

    fireEvent.change(within(panel).getByLabelText("Appointed Date From"), { target: { value: "2026-10-09" } });
    fireEvent.change(within(panel).getByLabelText("Appointed Date To"), { target: { value: "2026-10-01" } });
    expect(within(panel).getByRole("alert").textContent).toContain("'from' date cannot be later");
    expect((within(panel).getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
