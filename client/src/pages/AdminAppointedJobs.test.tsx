// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lastInput: null as unknown,
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

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      listAppointedJobs: {
        useQuery: (input: unknown) => {
          mocks.lastInput = input;
          return { data: mocks.data, isLoading: false, isError: false };
        },
      },
    },
  },
}));

import { AdminAppointedJobsContent } from "./AdminAppointedJobs";

afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.data.items[0].guardianRequest = null; });

describe("Admin Appointed Jobs", () => {
  it("marks a Guardian's waiting request beside the Job ID, leading to Applied Tutors where it is answered", () => {
    mocks.data.items[0].guardianRequest = { id: 5, type: "confirm", tutorId: "tutor-175", reason: null, createdAt: new Date("2026-09-16T08:00:00.000Z") };
    render(<AdminAppointedJobsContent />);

    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Confirm requested").closest("a")?.getAttribute("href")).toBe("/admin/applied-tutors/13");
    expect(within(rows[1]).queryByText(/requested/)).toBeNull();
  });

  it("asks for the Appointed stage and names the columns in the Owner's order", () => {
    render(<AdminAppointedJobsContent />);

    expect(mocks.lastInput).toMatchObject({ query: "", page: 1 });
    expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual([
      "Job ID", "Posted By", "Class", "Subjects", "Location", "Salary", "Days", "Tutor ID", "Name", "Mobile", "Appointed", "Tutor profile",
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

  it("searches from the first page", () => {
    render(<AdminAppointedJobsContent />);
    fireEvent.change(screen.getByPlaceholderText(/Search class, subject, location or Tutor/), { target: { value: "Tania" } });
    expect(mocks.lastInput).toMatchObject({ query: "Tania", page: 1 });
  });
});
