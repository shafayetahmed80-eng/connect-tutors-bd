// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import JobDetailsModal, { type JobDetailsData } from "./JobDetailsModal";

afterEach(cleanup);

const job: JobDetailsData = {
  jobId: "6809",
  title: "English Version Tutor for Class 2 — 4 Days / Week",
  postedAt: "04 Sept 2026",
  statusLabel: "Live",
  statusTone: "live",
  tuitionType: "home",
  budgetAmount: 5000,
  subjects: "All",
  locationLabel: "Mirpur 14, Dhaka",
  preferredTutorGender: "male",
  studentGender: null,
  daysPerWeek: 4,
  studentCount: 1,
  notes: null,
};

describe("JobDetailsModal on the shared Modal shell", () => {
  it("announces itself as a dialog named by the job title", () => {
    render(<JobDetailsModal job={job} onClose={vi.fn()} action={<button type="button">Apply Now</button>} />);
    expect(screen.getByRole("dialog", { name: job.title })).toBeTruthy();
  });

  it("keeps the Job ID / Posted / status row pinned in the header, not the scroll body", () => {
    render(<JobDetailsModal job={job} onClose={vi.fn()} action={null} />);
    const heading = screen.getByRole("heading", { name: job.title });
    const header = heading.parentElement!.parentElement!;
    expect(within(header).getByText(/Job ID : 6809/)).toBeTruthy();
    expect(within(header).getByText(/Posted : 04 Sept 2026/)).toBeTruthy();
    // the label/value grid lives in the body, below the header
    expect(within(header).queryByText("Tuition Type")).toBeNull();
  });

  it("renders the caller's action in the footer and closes from the header", () => {
    const onClose = vi.fn();
    render(<JobDetailsModal job={job} onClose={onClose} action={<button type="button">Apply Now</button>} />);

    expect(screen.getByRole("button", { name: "Apply Now" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("drops the map link when the panel asks it to", () => {
    const { rerender } = render(<JobDetailsModal job={job} onClose={vi.fn()} action={null} />);
    expect(screen.getByRole("link", { name: /View on map/ })).toBeTruthy();

    rerender(<JobDetailsModal job={job} onClose={vi.fn()} action={null} showMapLink={false} />);
    expect(screen.queryByRole("link", { name: /View on map/ })).toBeNull();
  });
});
