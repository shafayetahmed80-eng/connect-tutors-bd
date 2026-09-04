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
  subjects: "Physics, Chemistry", daysPerWeek: 4, locationLabel: "Shyamoli, Dhaka",
  budgetAmount: 6000, ...over,
});

afterEach(() => { cleanup(); applications.current = []; applications.isLoading = false; applications.isError = false; });

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

  it("says which stage is empty rather than showing a blank panel", async () => {
    const user = userEvent.setup({ document: window.document });
    applications.current = [job({ interestId: 1 })];
    render(<TutorApplicationStatus />);

    await user.click(screen.getByRole("tab", { name: /Appointed Jobs/ }));

    expect(screen.getByText(/No appointed jobs\./)).toBeTruthy();
  });

  it("shows the job facts a Tutor needs to recognise the tuition", () => {
    applications.current = [job({ interestId: 1 })];
    const { container } = render(<TutorApplicationStatus />);
    const card = within(container.querySelector("li")!);

    expect(card.getByText(/Job ID : CT-J-1001/)).toBeTruthy();
    expect(card.getByText("Class 9 · Bangla Medium")).toBeTruthy();
    expect(card.getByText("Home Tutoring")).toBeTruthy();
    expect(card.getByText("6,000 Taka")).toBeTruthy();
  });
});
