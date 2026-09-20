// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const applications = vi.hoisted(() => ({ current: [] as any[], isLoading: false, isError: false }));

vi.mock("@/lib/trpc", () => ({
  trpc: { jobBoard: { myInterests: { useQuery: () => ({ data: applications.current, isLoading: applications.isLoading, isError: applications.isError }) } } },
}));

import { TutorApplicationStatus } from "./TutorApplicationStatus";

const job = (over: Record<string, unknown>) => ({
  interestId: 1, status: "interested", appointmentConfirmedAt: null,
  createdAt: "2026-09-01T00:00:00.000Z", publicJobId: "CT-J-1001",
  tuitionType: "home", category: "Bangla Medium", classCourse: "Class 9",
  subjects: JSON.stringify(["Physics", "Chemistry"]), daysPerWeek: 4, locationLabel: "Shyamoli, Dhaka",
  budgetAmount: 6000,
  shortlistedAt: null, appointedAt: null, endedAt: null, tuitionCancelledAt: null, paymentStatus: "full_due",
  ...over,
});

afterEach(() => { cleanup(); window.innerWidth = 1024; applications.current = []; applications.isLoading = false; applications.isError = false; window.history.replaceState(null, "", "/"); });

describe("the Tutor's Status tab", () => {
  it("names all five stages and counts each, zero-padded like the Guardian's", () => {
    applications.current = [
      job({ interestId: 1 }),
      job({ interestId: 2 }),
      job({ interestId: 3, status: "shortlisted" }),
      job({ interestId: 4, status: "matched", appointmentConfirmedAt: "2026-09-02T00:00:00.000Z" }),
    ];
    render(<TutorApplicationStatus />);

    expect(screen.getAllByRole("tab").map(tab => tab.textContent)).toEqual([
      "Applied Jobs 02", "Shortlisted Jobs 01", "Appointed Jobs 00", "Confirmed Jobs 01", "Cancelled Jobs 00",
    ]);
    // On a phone the row stays one line and drops "Jobs".
    expect(screen.getByRole("tablist", { name: "Application stages" }).className).toContain("flex-nowrap");
    expect(screen.getAllByRole("tab")[0].querySelector("span.hidden")?.textContent).toBe("Jobs");
  });

  it("opens on Applied and swaps the list when another stage is clicked", async () => {
    const user = userEvent.setup({ document: window.document });
    applications.current = [
      job({ interestId: 1, publicJobId: "CT-J-1001" }),
      job({ interestId: 2, publicJobId: "CT-J-2002", status: "withdrawn" }),
    ];
    render(<TutorApplicationStatus />);

    expect(screen.getByText(/CT-J-1001/)).toBeTruthy();
    expect(screen.queryByText(/CT-J-2002/)).toBeNull();

    await user.click(screen.getByRole("tab", { name: /Cancelled Jobs/ }));

    expect(screen.getByText(/CT-J-2002/)).toBeTruthy();
    expect(screen.queryByText(/CT-J-1001/)).toBeNull();
  });

  it("opens on the stage a Dashboard button asked for", () => {
    window.history.replaceState(null, "", "/tutor/dashboard/status?stage=cancelled");
    applications.current = [
      job({ interestId: 1, publicJobId: "CT-J-1001" }),
      job({ interestId: 2, publicJobId: "CT-J-2002", status: "declined" }),
    ];
    render(<TutorApplicationStatus />);

    expect(screen.getByRole("tab", { name: /Cancelled Jobs/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText(/CT-J-2002/)).toBeTruthy();
    expect(screen.queryByText(/CT-J-1001/)).toBeNull();
  });

  it("ignores a stage it does not know and opens on Applied", () => {
    window.history.replaceState(null, "", "/tutor/dashboard/status?stage=hired");
    render(<TutorApplicationStatus />);
    expect(screen.getByRole("tab", { name: /Applied Jobs/ }).getAttribute("aria-selected")).toBe("true");
  });

  it("says which stage is empty rather than showing a blank panel", async () => {
    const user = userEvent.setup({ document: window.document });
    applications.current = [job({ interestId: 1 })];
    render(<TutorApplicationStatus />);

    await user.click(screen.getByRole("tab", { name: /Appointed Jobs/ }));

    expect(screen.getByText(/No appointed jobs\./)).toBeTruthy();
  });

  it("shows the job facts a Tutor needs to recognise the tuition, as a table on a laptop", () => {
    applications.current = [job({ interestId: 1 })];
    const { container } = render(<TutorApplicationStatus />);
    const row = within(container.querySelector("tbody tr")!);

    expect(screen.getAllByRole("columnheader").map(head => head.textContent)).toEqual([
      "Job ID", "Class / Course", "Category", "Subjects", "Tuition type", "Location", "Days / Week", "Salary", "Applied",
    ]);
    expect(row.getByText("CT-J-1001")).toBeTruthy();
    expect(row.getByText("Class 9")).toBeTruthy();
    expect(row.getByText("Bangla Medium")).toBeTruthy();
    // The job stores subjects as a JSON list; the row reads them as words.
    expect(row.getByText("Physics, Chemistry")).toBeTruthy();
    expect(row.getByText("Home Tutoring")).toBeTruthy();
    expect(row.getByText("6,000 Taka")).toBeTruthy();
  });

  it("gives each stage the date it earned, and Confirmed its payment status", async () => {
    const user = userEvent.setup({ document: window.document });
    applications.current = [
      job({ interestId: 1, status: "shortlisted", shortlistedAt: "2026-09-03T00:00:00.000Z" }),
      job({
        interestId: 2, status: "matched", appointedAt: "2026-09-04T00:00:00.000Z",
        appointmentConfirmedAt: "2026-09-05T00:00:00.000Z", paymentStatus: "half_paid",
      }),
      job({ interestId: 3, status: "declined", endedAt: "2026-09-06T00:00:00.000Z" }),
    ];
    render(<TutorApplicationStatus />);

    // Applied Jobs has no stage of its own beyond the date it was applied on.
    expect(screen.queryByRole("columnheader", { name: "Shortlisted" })).toBeNull();

    await user.click(screen.getByRole("tab", { name: /Shortlisted Jobs/ }));
    expect(screen.getByRole("columnheader", { name: "Shortlisted" })).toBeTruthy();
    expect(screen.getByText(/03 Sept? 2026/)).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: /Confirmed Jobs/ }));
    expect(screen.getByRole("columnheader", { name: "Confirmation Date" })).toBeTruthy();
    expect(screen.getByText(/05 Sept? 2026/)).toBeTruthy();
    expect(screen.getByText("Half Paid")).toBeTruthy();
    // The payment status belongs to Confirmed alone.
    await user.click(screen.getByRole("tab", { name: /Cancelled Jobs/ }));
    expect(screen.queryByRole("columnheader", { name: "Payment Status" })).toBeNull();
    expect(screen.getByRole("columnheader", { name: "Cancelled" })).toBeTruthy();
    expect(screen.getByText(/06 Sept? 2026/)).toBeTruthy();
  });

  it("falls back to the tuition's own cancellation date when the application itself never ended", async () => {
    const user = userEvent.setup({ document: window.document });
    applications.current = [job({ interestId: 1, tuitionCancelled: 1, tuitionCancelledAt: "2026-09-07T00:00:00.000Z" })];
    render(<TutorApplicationStatus />);

    await user.click(screen.getByRole("tab", { name: /Cancelled Jobs/ }));

    expect(screen.getByText(/07 Sept? 2026/)).toBeTruthy();
  });

  it("gives a phone one card per application instead of a table read sideways", () => {
    window.innerWidth = 390;
    applications.current = [job({ interestId: 1 })];
    const { container } = render(<TutorApplicationStatus />);
    const card = within(container.querySelector("li")!);

    expect(container.querySelector("table")).toBeNull();
    expect(card.getByText(/Job ID : CT-J-1001/)).toBeTruthy();
    // Every value keeps its column heading as its label, so nothing goes missing.
    expect(card.getByText("Subjects")).toBeTruthy();
    expect(card.getByText("Physics, Chemistry")).toBeTruthy();
    expect(card.getByText("6,000 Taka")).toBeTruthy();
  });
});
