// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import AppliedJobFacts, { type AppliedJobSummary } from "./AppliedJobFacts";

const job = (preferredGender: AppliedJobSummary["preferredGender"]): AppliedJobSummary => ({
  id: 1,
  classCourse: "Class 8",
  subjects: ["History"],
  preferredGender,
  daysPerWeek: 3,
  budgetAmount: 5000,
  tuitionLocationLabel: "Adabor, Dhaka",
  locationText: null,
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
