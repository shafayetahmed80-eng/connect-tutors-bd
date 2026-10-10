// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lastInput: null as unknown,
  optionsEnabled: undefined as boolean | undefined,
  options: {
    cities: [{ id: "dhaka", label: "Dhaka" }, { id: "sylhet", label: "Sylhet" }],
    locationsByCity: { dhaka: [{ id: "adabor", label: "Adabor" }, { id: "uttara", label: "Uttara" }], sylhet: [{ id: "zindabazar", label: "Zindabazar" }] },
    subjects: ["Mathematics", "Physics"],
  },
  notifyInput: null as unknown,
  notifyResult: { sent: 2, isError: false },
  historyInput: null as unknown,
  historyData: { items: [{ id: 1, audience: "tutor", title: "Past notice", message: "An earlier broadcast.", recipientCount: 9, sentByName: "Owner", sentByEmail: null, createdAt: "2026-09-20T00:00:00.000Z" }], total: 1, page: 1, pageSize: 20, totalPages: 1 },
  toasts: [] as string[],
  data: {
    items: [
      {
        id: "tutor-175",
        tutorNumber: 777,
        name: "Tania Sultana",
        initials: "TS",
        headline: "Physics and Maths for HSC",
        phone: "+8801711111111",
        institution: "Sylhet Agricultural University",
        instituteName: "Sylhet Agricultural University",
        departmentName: "Fisheries",
        education: "BSc Fisheries",
        subjects: JSON.stringify(["Mathematics", "Physics"]),
        levels: JSON.stringify(["HSC"]),
        teachingExperienceYears: 4,
        mode: "both",
        profileStatus: "approved" as const,
        verified: true,
        cityLabel: "Dhaka",
        locationLabel: "Adabor",
        updatedAt: new Date("2026-09-01T00:00:00.000Z"),
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
      },
      {
        id: "tutor-338",
        tutorNumber: null,
        name: "Sojib",
        initials: "S",
        headline: null,
        phone: null,
        institution: null,
        instituteName: null,
        departmentName: null,
        education: null,
        subjects: null,
        levels: null,
        teachingExperienceYears: null,
        mode: "home",
        profileStatus: "draft" as const,
        verified: false,
        cityLabel: null,
        locationLabel: null,
        updatedAt: null,
        createdAt: new Date("2026-08-20T00:00:00.000Z"),
      },
    ],
    total: 2,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    counts: {
      profileStatus: { all: 42, pending: 6, changes_requested: 3, approved: 28, suspended: 1, draft: 4 },
      jobStage: { applied: 30, shortlisted: 12, appointed: 5, confirmed: 3, closed: 4, cancelled: 2 },
    },
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      listTutorDirectory: {
        useQuery: (input: unknown) => {
          mocks.lastInput = input;
          return { data: mocks.data, isLoading: false, isError: false };
        },
      },
      tutorFilterOptions: {
        useQuery: (_input: unknown, options?: { enabled?: boolean }) => {
          mocks.optionsEnabled = options?.enabled;
          return { data: mocks.options };
        },
      },
      notifyTutorDirectory: {
        useMutation: (options: { onSuccess?: (result: { sent: number }) => void; onError?: (error: { message: string }) => void }) => ({
          mutate: (input: unknown) => {
            mocks.notifyInput = input;
            mocks.notifyResult.isError ? options.onError?.({ message: "Could not send." }) : options.onSuccess?.({ sent: mocks.notifyResult.sent });
          },
          isPending: false,
        }),
      },
      listNotificationBroadcasts: {
        useQuery: (input: unknown) => {
          mocks.historyInput = input;
          return { data: mocks.historyData, isLoading: false, isError: false };
        },
      },
    },
  },
}));

vi.mock("sonner", () => ({ toast: { success: (message: string) => { mocks.toasts.push(message); }, error: (message: string) => { mocks.toasts.push(message); } } }));

import { AdminTutorProfilesContent } from "./AdminTutorProfiles";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.notifyInput = null;
  mocks.notifyResult = { sent: 2, isError: false };
  mocks.historyInput = null;
  mocks.toasts = [];
});

describe("Admin Tutor Profiles list", () => {
  it("puts every Tutor on one row with the columns an Admin scans", () => {
    render(<AdminTutorProfilesContent />);

    for (const header of ["Tutor ID", "Name", "Mobile", "Institute", "Department", "City", "Location", "Experience", "Status", "Verified"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeTruthy();
    }

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);

    const first = within(rows[0]);
    // Tutor ID is the registered number; the internal key only addresses the detail page.
    expect(first.getByText("777")).toBeTruthy();
    expect(first.queryByText("tutor-175")).toBeNull();
    expect(first.getByText("Tania Sultana")).toBeTruthy();
    expect(first.getByText("+8801711111111")).toBeTruthy();
    expect(first.getByText("Fisheries")).toBeTruthy();
    expect(first.getByText("Dhaka")).toBeTruthy();
    expect(first.getByText("4 yr")).toBeTruthy();
    expect(first.getByText("approved")).toBeTruthy();

    // An empty column reads "Not set" rather than a blank cell.
    expect(within(rows[1]).getAllByText("Not set").length).toBeGreaterThan(2);
  });

  it("keeps the long columns off the row - they belong to the detail view", () => {
    render(<AdminTutorProfilesContent />);

    for (const header of ["Subjects", "Class levels", "Mode"]) {
      expect(screen.queryByRole("columnheader", { name: header })).toBeNull();
    }
    // The professional headline reads under the name on the Tutor's own
    // profile; here it would push the identifying columns off the screen.
    expect(screen.queryByText("Physics and Maths for HSC")).toBeNull();
  });

  it("points the arrow at that Tutor's own detail page", () => {
    render(<AdminTutorProfilesContent />);

    const link = screen.getByRole("link", { name: /Open the full profile of Tania Sultana/i });
    expect(link.getAttribute("href")).toBe("/admin/tutor-profiles/tutor-175");
  });

  it("counts every profile status in a tab row, and a tab narrows the list", () => {
    render(<AdminTutorProfilesContent />);

    const statusRow = screen.getByRole("tablist", { name: "Profile status" });
    // Zero-padded, like the Tutor's Status tab.
    expect(within(statusRow).getAllByRole("tab").map(tab => tab.textContent)).toEqual([
      "All 42", "Pending review 06", "Changes requested 03", "Approved 28", "Suspended 01", "Draft 04",
    ]);
    expect(within(statusRow).getByRole("tab", { name: /^All/ }).getAttribute("aria-selected")).toBe("true");

    fireEvent.click(within(statusRow).getByRole("tab", { name: /Approved/ }));
    expect(mocks.lastInput).toMatchObject({ profileStatus: "approved", page: 1 });
    expect(within(statusRow).getByRole("tab", { name: /Approved/ }).getAttribute("aria-selected")).toBe("true");

    // The tabs replace the dropdown the filter set carries on other screens.
    fireEvent.click(screen.getByRole("button", { name: /^Filter/ }));
    expect(screen.queryByRole("combobox", { name: "Profile status" })).toBeNull();
  });

  it("counts the Tutors with a job in each stage, and choosing a stage again clears it", () => {
    render(<AdminTutorProfilesContent />);

    const jobRow = screen.getByRole("group", { name: "Job status" });
    expect(within(jobRow).getAllByRole("button").map(button => button.textContent)).toEqual([
      "Applied Jobs 30", "Shortlisted Jobs 12", "Appointed Jobs 05", "Confirmed Jobs 03", "Closed Jobs 04", "Cancelled Jobs 02",
    ]);
    expect(mocks.lastInput).toMatchObject({ jobStage: "all" });
    // On a phone both rows stay one line, and the job row drops "Jobs".
    expect(jobRow.className).toContain("flex-nowrap");
    expect(screen.getByRole("tablist", { name: "Profile status" }).className).toContain("flex-nowrap");
    expect(within(jobRow).getAllByRole("button").map(button => button.querySelector(".hidden.sm\\:inline")?.textContent)).toEqual(Array(6).fill("Jobs"));

    fireEvent.click(within(jobRow).getByRole("button", { name: /Confirmed Jobs/ }));
    expect(mocks.lastInput).toMatchObject({ jobStage: "confirmed", page: 1 });
    expect(within(jobRow).getByRole("button", { name: /Confirmed Jobs/ }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(within(jobRow).getByRole("button", { name: /Confirmed Jobs/ }));
    expect(mocks.lastInput).toMatchObject({ jobStage: "all" });
  });

  it("sends the typed search to the server", () => {
    render(<AdminTutorProfilesContent />);

    expect(mocks.lastInput).toMatchObject({ query: "", profileStatus: "all", jobStage: "all", page: 1 });

    // The search sits above the card, as on the tuition lists, not behind the Filter button.
    fireEvent.change(screen.getByPlaceholderText(/Search Tutor name/i), { target: { value: "Tania" } });
    expect(mocks.lastInput).toMatchObject({ query: "Tania", page: 1 });
  });
});

describe("the card and filter panel over the Tutors", () => {
  const openPanel = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    return screen.getByRole("region", { name: "Tutor filters" });
  };

  it("keeps History and Notify named for a screen reader and a long press, since a phone shows only their icons", () => {
    render(<AdminTutorProfilesContent />);
    for (const name of ["History", "Notify"]) {
      const button = screen.getByRole("button", { name });
      expect(button.getAttribute("title")).toBe(name);
      expect(button.getAttribute("aria-label")).toBe(name);
      // The word stays in the page for the desktop; a phone hides it and keeps the square icon.
      expect(button.querySelector("span.max-sm\\:sr-only")?.textContent).toBe(name);
      expect(button.className).toContain("max-sm:w-10");
    }
  });

  it("asks for no options until the panel opens, then offers every box", async () => {
    const user = userEvent.setup();
    render(<AdminTutorProfilesContent />);
    expect(mocks.optionsEnabled).toBe(false);

    const panel = await openPanel(user);
    expect(mocks.optionsEnabled).toBe(true);
    expect(within(panel).getByText("tutors found").parentElement?.textContent).toContain("2");
    for (const name of ["Verification", "Tuition Type", "Gender", "City"]) {
      expect(within(panel).getByRole("combobox", { name })).toBeTruthy();
    }
    for (const name of ["Location - select a City first", "Subject"]) {
      expect(within(panel).getByPlaceholderText(name)).toBeTruthy();
    }
    for (const label of ["Experience From", "Experience To", "Rating From", "Rating To", "Joined Date From", "Joined Date To"]) {
      expect(within(panel).getByLabelText(label)).toBeTruthy();
    }
    // The search and the two tab rows are above the card, not in the panel.
    expect(within(panel).queryByLabelText("Search Tutors")).toBeNull();
    expect(within(panel).queryByRole("combobox", { name: "Profile status" })).toBeNull();
  });

  it("changes nothing until Apply, then lists, counts and Notifies by the same choices", async () => {
    const user = userEvent.setup();
    render(<AdminTutorProfilesContent />);
    const panel = await openPanel(user);

    fireEvent.change(within(panel).getByRole("combobox", { name: "Gender" }), { target: { value: "female" } });
    fireEvent.change(within(panel).getByRole("combobox", { name: "Verification" }), { target: { value: "verified" } });
    fireEvent.change(within(panel).getByLabelText("Experience From"), { target: { value: "3" } });
    fireEvent.change(within(panel).getByLabelText("Rating From"), { target: { value: "4.5" } });
    fireEvent.change(within(panel).getByLabelText("Joined Date From"), { target: { value: "2026-08-01" } });
    expect(mocks.lastInput).toMatchObject({ verified: "all" });
    expect(mocks.lastInput).not.toHaveProperty("gender");

    await user.click(within(panel).getByRole("button", { name: "Apply" }));
    expect(mocks.lastInput).toMatchObject({ verified: "verified", gender: "female", experienceFrom: 3, ratingFrom: 4.5, joinedFrom: new Date("2026-08-01T00:00:00"), page: 1 });
    expect(within(screen.getByRole("button", { name: /^Filter/ })).getByText("5")).toBeTruthy();
    expect(within(screen.getByRole("banner")).getByText("matching tutors")).toBeTruthy();

    // Notify sends to exactly what is applied, not to a different list.
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "Hi" } });
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: "Hello there" } });
    fireEvent.click(screen.getByRole("button", { name: /^Review & send to/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Confirm & send to/ }));
    expect(mocks.notifyInput).toMatchObject({ verified: "verified", gender: "female", experienceFrom: 3, ratingFrom: 4.5, joinedFrom: new Date("2026-08-01T00:00:00"), title: "Hi" });
    expect(mocks.notifyInput).not.toHaveProperty("page");
  });

  it("keeps Apply waiting while a range is the wrong way round", async () => {
    const user = userEvent.setup();
    render(<AdminTutorProfilesContent />);
    const panel = await openPanel(user);

    fireEvent.change(within(panel).getByLabelText("Experience From"), { target: { value: "9" } });
    fireEvent.change(within(panel).getByLabelText("Experience To"), { target: { value: "2" } });
    fireEvent.change(within(panel).getByLabelText("Rating From"), { target: { value: "5" } });
    fireEvent.change(within(panel).getByLabelText("Rating To"), { target: { value: "3.5" } });
    expect(within(panel).getByText("The lowest experience cannot be above the highest.")).toBeTruthy();
    expect(within(panel).getByText("The lowest rating cannot be above the highest.")).toBeTruthy();
    expect((within(panel).getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(within(panel).getByLabelText("Experience To"), { target: { value: "12" } });
    fireEvent.change(within(panel).getByLabelText("Rating To"), { target: { value: "5" } });
    expect((within(panel).getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("offers the areas of the City chosen, and the subjects Tutors teach, to type into and pick", async () => {
    const user = userEvent.setup();
    render(<AdminTutorProfilesContent />);
    const panel = await openPanel(user);

    expect((within(panel).getByPlaceholderText("Location - select a City first") as HTMLInputElement).disabled).toBe(true);
    fireEvent.change(within(panel).getByRole("combobox", { name: "City" }), { target: { value: "dhaka" } });
    await user.click(within(panel).getByRole("combobox", { name: "Location" }));
    // Only Dhaka's areas, never Sylhet's.
    expect(within(panel).getByRole("button", { name: "Adabor" })).toBeTruthy();
    expect(within(panel).queryByRole("button", { name: "Zindabazar" })).toBeNull();
    await user.click(within(panel).getByRole("button", { name: "Adabor" }));

    await user.click(within(panel).getByRole("combobox", { name: "Subject" }));
    await user.click(within(panel).getByRole("button", { name: "Physics" }));
    await user.click(within(panel).getByRole("button", { name: "Apply" }));
    expect(mocks.lastInput).toMatchObject({ cityId: "dhaka", locationIds: ["adabor"], subjects: ["Physics"] });

    // Moving to another City takes its own areas with it.
    fireEvent.change(within(panel).getByRole("combobox", { name: "City" }), { target: { value: "sylhet" } });
    await user.click(within(panel).getByRole("button", { name: "Apply" }));
    expect(mocks.lastInput).toMatchObject({ cityId: "sylhet", subjects: ["Physics"] });
    expect(mocks.lastInput).not.toHaveProperty("locationIds");
  });

  it("clears the panel and the list with Clear", async () => {
    const user = userEvent.setup();
    render(<AdminTutorProfilesContent />);
    const panel = await openPanel(user);

    fireEvent.change(within(panel).getByRole("combobox", { name: "Gender" }), { target: { value: "male" } });
    await user.click(within(panel).getByRole("button", { name: "Apply" }));
    expect(mocks.lastInput).toMatchObject({ gender: "male" });

    await user.click(within(panel).getByRole("button", { name: "Clear" }));
    expect(mocks.lastInput).not.toHaveProperty("gender");
    expect(within(screen.getByRole("button", { name: /^Filter/ })).queryByText("1")).toBeNull();
  });
});

describe("Notify Tutors", () => {
  it("counts how many Tutors the list holds, in the card the button that sends to them sits in", () => {
    render(<AdminTutorProfilesContent />);

    const card = screen.getByRole("banner");
    expect(within(card).getByText("Tutors")).toBeTruthy();
    expect(within(card).getByText("2")).toBeTruthy();
    expect(within(card).getByText("tutor profiles")).toBeTruthy();
    expect(within(card).getByRole("button", { name: "Notify" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Notify" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("keeps Review & send disabled until both a title and a message are typed", () => {
    render(<AdminTutorProfilesContent />);
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));

    const review = screen.getByRole("button", { name: /^Review & send to/ }) as HTMLButtonElement;
    expect(review.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "Platform maintenance" } });
    expect(review.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: "We are pausing new applications for an hour tonight." } });
    expect(review.disabled).toBe(false);
  });

  it("shows exactly what will be sent on a review step before anything actually sends", () => {
    render(<AdminTutorProfilesContent />);
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));

    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "  Platform maintenance  " } });
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: "  We are pausing new applications for an hour tonight.  " } });
    fireEvent.click(screen.getByRole("button", { name: /^Review & send to/ }));

    // Nothing has sent yet - the review step is read-only, trimmed exactly as it will be sent.
    expect(mocks.notifyInput).toBeNull();
    const dialog = screen.getByRole("dialog", { name: "Send this to Tutors?" });
    expect(dialog.textContent).toContain("Platform maintenance");
    expect(dialog.textContent).toContain("We are pausing new applications for an hour tonight.");
    expect(screen.queryByLabelText(/^Title/)).toBeNull();
  });

  it("Back returns to the editable form with what was typed still there", () => {
    render(<AdminTutorProfilesContent />);
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "Platform maintenance" } });
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: "Paused tonight." } });
    fireEvent.click(screen.getByRole("button", { name: /^Review & send to/ }));

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(mocks.notifyInput).toBeNull();
    expect((screen.getByLabelText(/^Title/) as HTMLInputElement).value).toBe("Platform maintenance");
    expect((screen.getByLabelText(/^Message/) as HTMLTextAreaElement).value).toBe("Paused tonight.");
  });

  it("sends the typed title and message only once the review step is confirmed", () => {
    render(<AdminTutorProfilesContent />);
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));

    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "  Platform maintenance  " } });
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: "  We are pausing new applications for an hour tonight.  " } });
    fireEvent.click(screen.getByRole("button", { name: /^Review & send to/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Confirm & send to/ }));

    expect(mocks.notifyInput).toMatchObject({
      query: "", profileStatus: "all", jobStage: "all", verified: "all", location: "", subject: "", tuitionType: "all",
      title: "Platform maintenance",
      message: "We are pausing new applications for an hour tonight.",
    });
    // page/pageSize are pagination, not part of who gets notified.
    expect(mocks.notifyInput).not.toHaveProperty("page");
    expect(mocks.notifyInput).not.toHaveProperty("pageSize");
    expect(mocks.toasts).toEqual(["Sent to 2 Tutors."]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("reports a failed send without closing the dialog", () => {
    mocks.notifyResult = { sent: 0, isError: true };
    render(<AdminTutorProfilesContent />);
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));

    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "Platform maintenance" } });
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: "We are pausing new applications tonight." } });
    fireEvent.click(screen.getByRole("button", { name: /^Review & send to/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Confirm & send to/ }));

    expect(mocks.toasts).toEqual(["Could not send."]);
    expect(screen.getByRole("dialog", { name: "Send this to Tutors?" })).toBeTruthy();
  });
});

describe("Notifying a hand-picked set of Tutors", () => {
  it("ticking a row switches the toolbar to a selection count, and Notify targets just that Tutor", () => {
    render(<AdminTutorProfilesContent />);

    expect(screen.getByRole("banner").textContent).toContain("tutor profiles");

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Tania Sultana" }));

    expect(screen.getByRole("banner").textContent).toContain("1 selected.");

    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    expect(screen.getByRole("dialog", { name: "Notify these Tutors" }).textContent).toContain("1 hand-picked Tutor");

    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "Interview slot" } });
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: "Please call the office tomorrow." } });
    fireEvent.click(screen.getByRole("button", { name: "Review & send to 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm & send to 1" }));

    expect(mocks.notifyInput).toMatchObject({ tutorIds: ["tutor-175"], title: "Interview slot", message: "Please call the office tomorrow." });
  });

  it("clears the selection after a successful hand-picked send, but not after a filtered one", () => {
    render(<AdminTutorProfilesContent />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Tania Sultana" }));
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "Hi" } });
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: "Hello there" } });
    fireEvent.click(screen.getByRole("button", { name: "Review & send to 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm & send to 1" }));

    expect(screen.getByRole("banner").textContent).toContain("tutor profiles");
  });

  it("clears the selection from the toolbar's own link, without opening the dialog", () => {
    render(<AdminTutorProfilesContent />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Tania Sultana" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));

    expect(screen.getByRole("banner").textContent).toContain("tutor profiles");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("Sent notifications history", () => {
  it("opens a read-only list of past broadcasts", () => {
    render(<AdminTutorProfilesContent />);

    fireEvent.click(screen.getByRole("button", { name: "History" }));

    const dialog = screen.getByRole("dialog", { name: "Sent notifications" });
    expect(within(dialog).getByText("Past notice")).toBeTruthy();
    expect(within(dialog).getByText("An earlier broadcast.")).toBeTruthy();
    expect(within(dialog).getByText("9 sent")).toBeTruthy();
    expect(mocks.historyInput).toEqual({ audience: "tutor", query: "", page: 1, pageSize: 20 });
  });
});
