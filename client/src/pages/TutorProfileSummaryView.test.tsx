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
      { label: "Additional phone", value: "Not given", missing: true, optional: true },
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
    { rows: [{ label: "About me", value: "Not given", missing: true, optional: true }] },
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

  it("separates filled, required-missing and optional-missing by colour alone", () => {
    render(<TutorProfileSummaryView sections={sections} />);

    // Every empty field now reads "Not given", so the colour is what tells a
    // tutor whether a blank actually blocks submission.
    const missing = screen.getAllByText("Not given");
    expect(missing).toHaveLength(4);
    expect(missing.filter(node => node.className.includes("text-j-err"))).toHaveLength(2);
    expect(missing.filter(node => node.className.includes("#9aabbb"))).toHaveLength(2);

    expect(screen.getByText("Sojib").className).toContain("#243b52");
  });

  it("lists sections the way the tabs lay them out, without repeating a heading", () => {
    render(<TutorProfileSummaryView sections={sections} />);
    const preview = screen.getByRole("region", { name: "Profile preview" });

    // A group with its own heading gets a card header; one without leaves the
    // section header above to name it, rather than saying it twice.
    expect(within(preview).getAllByRole("heading", { name: "Tuition, location and communication" })).toHaveLength(1);
    expect(within(preview).getAllByRole("heading", { name: "Introduction and review" })).toHaveLength(1);
    expect(within(preview).getByRole("heading", { name: "Identity and contact" })).toBeTruthy();
  });

  it("stays read-only — no edit controls in the preview", () => {
    render(<TutorProfileSummaryView sections={sections} />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
