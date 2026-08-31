// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TutorProfileTabEditor } from "./TutorProfileTabEditor";
import type { TutorProfileReadoutSection } from "./TutorProfileSectionReadout";

afterEach(() => cleanup());

const sections: TutorProfileReadoutSection[] = [
  { id: "a", title: "Identity and contact", groups: [{ rows: [
    { label: "Full name", value: "Sojib", missing: false },
    { label: "Date of birth", value: "Not given", missing: true },
  ] }] },
  { id: "b", title: "Family and emergency contact", groups: [{ rows: [
    { label: "Father's name", value: "Not given", missing: true },
  ] }] },
  { id: "c", title: "Education and teaching expertise", groups: [
    { heading: "Education", rows: [{ label: "Institute", value: "DU", missing: false }] },
    { heading: "Teaching expertise", rows: [{ label: "Primary subjects", value: "Not given", missing: true }] },
  ] },
  { id: "d", title: "Tuition, location and communication", groups: [{ rows: [{ label: "Tuition type", value: "Not given", missing: true }] }] },
  { id: "e", title: "Introduction and review", groups: [{ rows: [{ label: "About me", value: "Not given", missing: true }] }] },
];

describe("TutorProfileTabEditor", () => {
  it("shows one tab per section with a filled count and switches panels on click", () => {
    const onTabChange = vi.fn();
    render(<TutorProfileTabEditor sections={sections} activeTab="a" onTabChange={onTabChange} onEditSection={vi.fn()} onBackToOverview={vi.fn()} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(5);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(within(tabs[0]).getByText("1/2 filled")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Education & expertise/ }));
    expect(onTabChange).toHaveBeenCalledWith("c");
  });

  it("renders each group of the active section as a sub-card whose pencil edits that section", () => {
    const onEditSection = vi.fn();
    render(<TutorProfileTabEditor sections={sections} activeTab="c" onTabChange={vi.fn()} onEditSection={onEditSection} onBackToOverview={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Education" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Teaching expertise" })).toBeTruthy();
    expect(screen.getByText("Primary subjects")).toBeTruthy();
    expect(screen.getByText("Institute")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Edit Teaching expertise" }));
    expect(onEditSection).toHaveBeenCalledWith("c");
  });

  it("returns to the overview", () => {
    const onBackToOverview = vi.fn();
    render(<TutorProfileTabEditor sections={sections} activeTab="a" onTabChange={vi.fn()} onEditSection={vi.fn()} onBackToOverview={onBackToOverview} />);

    fireEvent.click(screen.getByRole("button", { name: /Back to overview/ }));
    expect(onBackToOverview).toHaveBeenCalledOnce();
  });
});
