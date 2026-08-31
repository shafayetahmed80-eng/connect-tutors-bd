// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { TutorProfileSummaryView } from "./TutorProfileSummaryView";
import type { TutorProfileReadoutSection } from "./TutorProfileSectionReadout";

afterEach(() => cleanup());

const sections: TutorProfileReadoutSection[] = [
  { id: "a", title: "Personal Information", groups: [
    { heading: "Identity and contact", rows: [
      { label: "Full name", value: "Sojib", missing: false },
      { label: "Date of birth", value: "Not given", missing: true },
      { label: "Additional phone", value: "—", missing: true, optional: true },
    ] },
    { heading: "Family and emergency contact", rows: [{ label: "Father's name", value: "Karim", missing: false }] },
  ] },
  { id: "c", title: "Education and teaching expertise", groups: [
    { heading: "Education", rows: [{ label: "Institute", value: "DU", missing: false }] },
  ] },
  { id: "d", title: "Tuition, location and communication", groups: [
    { rows: [{ label: "Tuition type", value: "Not given", missing: true }] },
  ] },
  { id: "e", title: "Introduction and review", groups: [
    { rows: [{ label: "About me", value: "—", missing: true, optional: true }] },
  ] },
];

describe("TutorProfileSummaryView", () => {
  it("previews every section and field, filled or not", () => {
    render(<TutorProfileSummaryView sections={sections} />);
    const preview = screen.getByRole("region", { name: "Profile preview" });

    expect(within(preview).getByRole("heading", { name: "Personal Information" })).toBeTruthy();
    expect(within(preview).getByRole("heading", { name: "Education and teaching expertise" })).toBeTruthy();
    expect(within(preview).getByRole("heading", { name: "Tuition, location and communication" })).toBeTruthy();
    expect(within(preview).getByRole("heading", { name: "Introduction and review" })).toBeTruthy();

    expect(within(preview).getByText("Identity and contact")).toBeTruthy();
    expect(within(preview).getByText("Full name")).toBeTruthy();
    expect(within(preview).getByText("Additional phone")).toBeTruthy();
    expect(within(preview).getByText("About me")).toBeTruthy();
  });

  it("counts only required fields towards the totals", () => {
    render(<TutorProfileSummaryView sections={sections} />);

    // 5 required rows across the fixture (the 2 optional ones are excluded); 3 filled.
    expect(screen.getByText("/5 required filled")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    // Section E is all-optional.
    expect(screen.getByText("Optional")).toBeTruthy();
  });

  it("separates filled, required-missing and optional-missing values", () => {
    render(<TutorProfileSummaryView sections={sections} />);

    expect(screen.getAllByLabelText("Filled")).toHaveLength(3);
    expect(screen.getAllByLabelText("Missing")).toHaveLength(2);
    expect(screen.getAllByLabelText("Not provided")).toHaveLength(2);
  });

  it("stays read-only — no edit controls in the preview", () => {
    render(<TutorProfileSummaryView sections={sections} />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
