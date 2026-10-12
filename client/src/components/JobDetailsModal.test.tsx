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

describe("the Preferred Tutor colour", () => {
  it("gives Male, Female and Any their own colour on the row and its icon", () => {
    for (const [gender, tone] of [["male", "#15803d"], ["female", "#db2777"], ["any", "#7c3aed"]] as const) {
      const { unmount } = render(<JobDetailsModal job={{ ...job, preferredTutorGender: gender }} onClose={vi.fn()} action={null} />);
      const row = screen.getByText(new RegExp(gender === "any" ? "Any" : gender === "male" ? "Male" : "Female")).closest("p")!;
      expect(row.className).toContain(`text-[${tone}]`);
      unmount();
    }
  });
});

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

describe("the Tutoring Time row", () => {
  // The row is the label's parent: label and value sit side by side inside it.
  const rowOf = (label: string) => screen.getByText(label).parentElement!;

  it.each([
    ["16:30", "4:30 PM"],
    // Midnight and noon are the two places a 12-hour clock is easy to get wrong.
    ["00:05", "12:05 AM"],
    ["12:00", "12:00 PM"],
    ["09:07", "9:07 AM"],
  ])("reads the Guardian's %s as %s", (stored, shown) => {
    render(<JobDetailsModal job={{ ...job, tutoringTime: stored }} onClose={vi.fn()} action={null} />);

    expect(within(rowOf("Tutoring Time")).getByText(shown)).toBeTruthy();
  });

  it("sits between Salary and Subjects, and leaves every other row where it was", () => {
    render(<JobDetailsModal job={{ ...job, tutoringTime: "16:30" }} onClose={vi.fn()} action={null} />);

    const follows = (earlier: string, later: string) =>
      Boolean(screen.getByText(earlier).compareDocumentPosition(screen.getByText(later)) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows("Salary", "Tutoring Time")).toBe(true);
    expect(follows("Tutoring Time", "Subjects")).toBe(true);
    for (const label of ["Tuition Type", "Student Gender", "Preferred Tutor", "Days / Week", "No. of Students", "Salary", "Subjects", "Location", "Notes"]) {
      expect(screen.getByText(label), label).toBeTruthy();
    }
  });

  it.each([
    ["null", null],
    ["missing", undefined],
    ["blank", ""],
    ["spaces only", "   "],
    ["an hour past 23", "24:00"],
    ["minutes past 59", "16:60"],
    ["not zero-padded", "4:30"],
    ["written with AM/PM", "4:30 PM"],
    ["not a time at all", "soon"],
  ])("leaves the row out when the time is %s, rather than showing a blank in its place", (_name, stored) => {
    const dialogText = (tutoringTime: string | null | undefined) => {
      const view = render(<JobDetailsModal job={{ ...job, tutoringTime }} onClose={vi.fn()} action={null} />);
      const text = document.body.textContent ?? "";
      view.unmount();
      return text;
    };
    // The dialog already carries blanks of its own (the fixture names no Student Gender, and
    // reads "Not set" elsewhere), so "no placeholder" is judged against the same job with no
    // time at all: whatever the time is, nothing is added to the dialog.
    expect(dialogText(stored)).toBe(dialogText(undefined));

    render(<JobDetailsModal job={{ ...job, tutoringTime: stored }} onClose={vi.fn()} action={null} />);
    expect(screen.queryByText("Tutoring Time")).toBeNull();
    // The dialog itself is intact: it is the row that is absent, not the body.
    expect(screen.getByText("Days / Week")).toBeTruthy();
    expect(screen.getByText("Subjects")).toBeTruthy();
  });

  it("leaves the row out for a caller that never names the field", () => {
    // `job` above is typed without tutoringTime at all: the field is optional on JobDetailsData.
    render(<JobDetailsModal job={job} onClose={vi.fn()} action={null} />);
    expect(screen.queryByText("Tutoring Time")).toBeNull();
  });

  it("follows the job when the dialog is reused for a different one", () => {
    const { rerender } = render(<JobDetailsModal job={{ ...job, tutoringTime: "16:30" }} onClose={vi.fn()} action={null} />);
    expect(within(rowOf("Tutoring Time")).getByText("4:30 PM")).toBeTruthy();

    rerender(<JobDetailsModal job={{ ...job, tutoringTime: null }} onClose={vi.fn()} action={null} />);
    expect(screen.queryByText("Tutoring Time")).toBeNull();
    expect(screen.queryByText("4:30 PM")).toBeNull();
  });
});
