// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import AppliedJobFacts, { type AppliedJobSummary } from "./AppliedJobFacts";

const job = (preferredGender: AppliedJobSummary["preferredGender"], extra: Partial<AppliedJobSummary> = {}): AppliedJobSummary => ({
  id: 1,
  classCourse: "Class 8",
  subjects: ["History"],
  preferredGender,
  daysPerWeek: 3,
  budgetAmount: 5000,
  tuitionLocationLabel: "Adabor, Dhaka",
  locationText: null,
  ...extra,
});

afterEach(() => cleanup());

describe("the tuition strip over an applicant list", () => {
  it.each([
    ["male", "Male Tutor", "text-[#15803d]"],
    ["female", "Female Tutor", "text-[#db2777]"],
    ["any", "Any Tutor", "text-[#7c3aed]"],
  ] as const)("shows %s in its own colour, on the icon and on the words", (gender, words, tone) => {
    render(<AppliedJobFacts job={job(gender)} />);

    const text = screen.getByText(words);
    expect(text.className).toContain(tone);
    expect(text.previousElementSibling?.getAttribute("class")).toContain(tone);
  });

  it("leaves the other facts in the strip's usual colours", () => {
    render(<AppliedJobFacts job={job("male")} />);

    const place = screen.getByText("Adabor, Dhaka");
    expect(place.className).toContain("text-[#173d60]");
    expect(place.previousElementSibling?.getAttribute("class")).toContain("text-[#8fb4d0]");
  });
});

describe("the Tutoring Time in the tuition strip", () => {
  /** Everything the strip says, read as plain text. */
  const stripText = (summary: AppliedJobSummary) => {
    const view = render(<AppliedJobFacts job={summary} />);
    const text = view.container.textContent ?? "";
    view.unmount();
    return text;
  };

  it("shows the Guardian's time as 4:30 PM, in the strip's usual colours", () => {
    render(<AppliedJobFacts job={job("male", { tutoringTime: "16:30" })} />);

    const time = screen.getByText("4:30 PM");
    expect(time.className).toContain("text-[#173d60]");
    expect(time.previousElementSibling?.getAttribute("class")).toContain("text-[#8fb4d0]");
  });

  it("writes midnight as 12:05 AM", () => {
    render(<AppliedJobFacts job={job("male", { tutoringTime: "00:05" })} />);
    expect(screen.getByText("12:05 AM")).toBeTruthy();
  });

  it.each([
    ["null", null],
    ["missing", undefined],
    ["blank", ""],
    ["not an HH:mm time", "25:99"],
  ])("adds nothing to the strip when the time is %s", (_name, stored) => {
    const without = stripText(job("male"));

    // No fact, no icon and no placeholder: the strip reads exactly as it did before the field existed.
    expect(stripText(job("male", { tutoringTime: stored }))).toBe(without);
    render(<AppliedJobFacts job={job("male", { tutoringTime: stored })} />);
    expect(screen.queryByText(/\b(AM|PM)\b/)).toBeNull();
  });

  it("keeps every other fact, and adds only the time", () => {
    const without = stripText(job("female"));
    const withTime = stripText(job("female", { tutoringTime: "16:30" }));

    expect(withTime.replace("4:30 PM", "")).toBe(without);
    expect(withTime).not.toBe(without);
  });

  it("reads right after Days per week and before whatever the Admin appends", () => {
    render(
      <AppliedJobFacts job={job("male", { tutoringTime: "16:30" })}>
        <span>Guardian number</span>
      </AppliedJobFacts>,
    );

    const follows = (earlier: string, later: string) =>
      Boolean(screen.getByText(earlier).compareDocumentPosition(screen.getByText(later)) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows("3 days / week", "4:30 PM")).toBe(true);
    expect(follows("4:30 PM", "Guardian number")).toBe(true);
  });
});
