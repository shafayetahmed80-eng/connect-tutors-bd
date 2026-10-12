// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import JobCard, { type JobCardData } from "./JobCard";

afterEach(cleanup);

const job: JobCardData = {
  jobId: "6809",
  title: "Need Bangla Medium Tutor for Class 5 Student - 3 Days / Week",
  postedAt: "04 Sept 2026",
  statusLabel: "Live",
  statusTone: "live",
  tuitionType: "home",
  budgetAmount: 9000,
  subjects: ["Bangla", "English"],
  locationLabel: "Mirpur 10, Dhaka",
  preferredTutorGender: "female",
};

describe("the tags the Owner's job card text size reads", () => {
  const card = () => screen.getByRole("button", { name: /Job ID 6809/ });

  it("tags the card, its title, its New badge, its lines and its foot, and leaves the sizes to the stylesheet", () => {
    render(<JobCard job={job} onOpen={vi.fn()} isNew action={<span>Apply</span>} />);

    expect(card().className).toContain("job-card");
    expect(within(card()).getByRole("heading", { name: job.title }).className).toContain("job-card-title");
    expect(within(card()).getByText("New").className).toContain("job-card-small");
    expect(within(card()).getByText("Subjects").closest("p")!.className).toContain("job-card-text");
    expect(within(card()).getByText("Bangla, English").className).toContain("job-card-text");
    expect(within(card()).getByText(/Job ID : 6809/).closest("div")!.className).toContain("job-card-text");
    expect(within(card()).getByText("Apply").closest(".job-card-footer")).not.toBeNull();
  });

  it("carries no fixed text size of its own, which the stylesheet's would have to outrank", () => {
    const { container } = render(<JobCard job={job} onOpen={vi.fn()} isNew action={null} />);
    const own = Array.from(container.querySelectorAll("[class]")).filter(element => /(^|\s)text-(2xs|xs|sm)(\s|$)/.test(element.getAttribute("class") ?? ""));

    expect(own).toEqual([]);
  });
});
