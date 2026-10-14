// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const applications = vi.hoisted(() => ({ current: [] as any[], isLoading: false, isError: false }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    jobBoard: {
      myInterests: {
        useQuery: () => ({
          data: applications.current,
          isLoading: applications.isLoading,
          isError: applications.isError,
        }),
      },
    },
  },
}));

import { TutorApplicationStatus } from "./TutorApplicationStatus";
import { TutorApplicationTimelineModal } from "@/components/TutorApplicationTimelineModal";

const makeJob = (over: Record<string, unknown> = {}) => ({
  interestId: 1,
  status: "interested",
  appointmentConfirmedAt: null,
  createdAt: "2026-09-01T10:00:00.000Z",
  publicJobId: "CT-J-1001",
  tuitionType: "home",
  category: "Bangla Medium",
  classCourse: "Class 9",
  subjects: JSON.stringify(["Physics", "Chemistry"]),
  daysPerWeek: 4,
  locationLabel: "Shyamoli, Dhaka",
  budgetAmount: 6000,
  shortlistedAt: null,
  appointedAt: null,
  endedAt: null,
  tuitionCancelledAt: null,
  paymentStatus: "full_due",
  guardianName: null,
  guardianPhone: null,
  ...over,
});

afterEach(() => {
  cleanup();
  window.innerWidth = 1024;
  applications.current = [];
  applications.isLoading = false;
  applications.isError = false;
  window.history.replaceState(null, "", "/");
});

describe("Tutor Application Search & Filtering", () => {
  it("filters visible applications live by Job ID, subject, or location", async () => {
    const user = userEvent.setup({ document: window.document });
    applications.current = [
      makeJob({ interestId: 1, publicJobId: "CT-J-1001", subjects: JSON.stringify(["Physics", "Chemistry"]), locationLabel: "Shyamoli, Dhaka" }),
      makeJob({ interestId: 2, publicJobId: "CT-J-2002", subjects: JSON.stringify(["Biology", "General Math"]), locationLabel: "Dhanmondi, Dhaka" }),
      makeJob({ interestId: 3, publicJobId: "CT-J-3003", subjects: JSON.stringify(["Higher Math"]), locationLabel: "Uttara, Dhaka" }),
    ];

    render(<TutorApplicationStatus />);

    // Initially all 3 are visible
    expect(screen.getByText("CT-J-1001")).toBeTruthy();
    expect(screen.getByText("CT-J-2002")).toBeTruthy();
    expect(screen.getByText("CT-J-3003")).toBeTruthy();

    const searchInput = screen.getByRole("searchbox");

    // Filter by Job ID
    await user.type(searchInput, "2002");
    expect(screen.getByText("CT-J-2002")).toBeTruthy();
    expect(screen.queryByText("CT-J-1001")).toBeNull();
    expect(screen.queryByText("CT-J-3003")).toBeNull();
    expect(screen.getByText(/Showing 1 of 3/)).toBeTruthy();

    // Clear search using clear button
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByText("CT-J-1001")).toBeTruthy();
    expect(screen.getByText("CT-J-2002")).toBeTruthy();
    expect(screen.getByText("CT-J-3003")).toBeTruthy();

    // Filter by subject
    await user.type(searchInput, "Biology");
    expect(screen.getByText("CT-J-2002")).toBeTruthy();
    expect(screen.queryByText("CT-J-1001")).toBeNull();

    // Filter by location
    await user.clear(searchInput);
    await user.type(searchInput, "Uttara");
    expect(screen.getByText("CT-J-3003")).toBeTruthy();
    expect(screen.queryByText("CT-J-1001")).toBeNull();

    // When query doesn't match anything
    await user.clear(searchInput);
    await user.type(searchInput, "NonExistentLocation");
    expect(screen.getByText(/No applications match "NonExistentLocation"/)).toBeTruthy();
  });
});

describe("Interactive Timeline Tracker Modal", () => {
  it("opens the interactive timeline modal when clicking Timeline button", async () => {
    const user = userEvent.setup({ document: window.document });
    applications.current = [
      makeJob({
        interestId: 1,
        publicJobId: "CT-J-1001",
        createdAt: "2026-09-01T10:00:00.000Z",
      }),
    ];

    render(<TutorApplicationStatus />);

    // Click the Timeline button
    const timelineBtn = screen.getByRole("button", { name: "View timeline for CT-J-1001" });
    await user.click(timelineBtn);

    // Modal dialog is open
    const modal = screen.getByTestId("tutor-application-timeline-modal");
    expect(modal).toBeTruthy();
    expect(within(modal).getByText("Application Status & Timeline")).toBeTruthy();
    expect(within(modal).getByText("Timeline for Job")).toBeTruthy();
    expect(within(modal).getByText("CT-J-1001")).toBeTruthy();

    // Guidance alert and stepper stage are present
    expect(within(modal).getAllByText("Application Submitted").length).toBeGreaterThanOrEqual(2);
    expect(within(modal).getByText(/আপনার আবেদনটি সফলভাবে গৃহীত হয়েছে/)).toBeTruthy();

    // Stepper shows stages
    expect(within(modal).getByText("Application Progress Tracker")).toBeTruthy();
    expect(within(modal).getByText("Shortlisted")).toBeTruthy();
    expect(within(modal).getByText("Appointed for Demo")).toBeTruthy();
    expect(within(modal).getByText("Appointment Confirmed")).toBeTruthy();
    expect(within(modal).getByText("Tuition Closed & Settled")).toBeTruthy();

    // Job facts summary
    expect(within(modal).getByText("Job Details Summary")).toBeTruthy();
    expect(within(modal).getByText("Physics, Chemistry")).toBeTruthy();
    expect(within(modal).getByText("Shyamoli, Dhaka")).toBeTruthy();

    // Close modal
    await user.click(within(modal).getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("tutor-application-timeline-modal")).toBeNull();
  });

  it("displays Guardian Contact details and Call/WhatsApp links when in appointed stage", async () => {
    const user = userEvent.setup({ document: window.document });
    applications.current = [
      makeJob({
        interestId: 10,
        publicJobId: "CT-J-5500",
        status: "matched",
        appointedAt: "2026-09-03T14:00:00.000Z",
        guardianName: "Abdur Rashid",
        guardianPhone: "+8801712345678",
      }),
    ];

    render(<TutorApplicationStatus />);

    // Go to Appointed Jobs tab
    await user.click(screen.getByRole("tab", { name: /Appointed Jobs/ }));

    // Open Timeline modal
    await user.click(screen.getByRole("button", { name: "View timeline for CT-J-5500" }));

    const modal = screen.getByTestId("tutor-application-timeline-modal");
    expect(modal).toBeTruthy();

    // Guidance for Appointed stage
    expect(within(modal).getByText("Appointed for Tuition!")).toBeTruthy();
    expect(within(modal).getByText(/নিচে দেয়া অভিভাবকের নম্বরে দ্রুত কল বা হোয়াটসঅ্যাপে যোগাযোগ করে/)).toBeTruthy();

    // Guardian Contact card is rendered
    expect(within(modal).getByText("Guardian Contact Information")).toBeTruthy();
    expect(within(modal).getByText("Abdur Rashid")).toBeTruthy();
    expect(within(modal).getByRole("link", { name: "Call +880 1712 345678" })).toBeTruthy();
    expect(within(modal).getByRole("link", { name: "Message +880 1712 345678 on WhatsApp" })).toBeTruthy();
  });

  it("displays Cancelled step and appropriate guidance when application is cancelled", async () => {
    const user = userEvent.setup({ document: window.document });
    applications.current = [
      makeJob({
        interestId: 99,
        publicJobId: "CT-J-9999",
        status: "withdrawn",
        endedAt: "2026-09-08T12:00:00.000Z",
      }),
    ];

    render(<TutorApplicationStatus />);

    // Go to Cancelled Jobs tab
    await user.click(screen.getByRole("tab", { name: /Cancelled Jobs/ }));

    // Open Timeline modal
    await user.click(screen.getByRole("button", { name: "View timeline for CT-J-9999" }));

    const modal = screen.getByTestId("tutor-application-timeline-modal");
    expect(modal).toBeTruthy();

    // Cancelled guidance
    expect(within(modal).getByText("Tuition Cancelled or Withdrawn")).toBeTruthy();
    expect(within(modal).getByText("Cancelled / Ended")).toBeTruthy();
  });

  it("handles mobile phone card view timeline button gracefully", async () => {
    window.innerWidth = 390;
    const user = userEvent.setup({ document: window.document });
    applications.current = [
      makeJob({
        interestId: 1,
        publicJobId: "CT-J-1001",
      }),
    ];

    const { container } = render(<TutorApplicationStatus />);
    expect(container.querySelector("table")).toBeNull();

    const timelineButton = screen.getByRole("button", { name: "View timeline for CT-J-1001" });
    expect(timelineButton).toBeTruthy();

    await user.click(timelineButton);
    expect(screen.getByTestId("tutor-application-timeline-modal")).toBeTruthy();
  });
});
