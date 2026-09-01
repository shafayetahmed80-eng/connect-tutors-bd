// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The tab editor now reads Admin content overrides and notice blocks. Empty
// lists keep the copy and layout the code ships with.
vi.mock("@/lib/trpc", () => {
  const emptyQuery = () => ({ data: [], isLoading: false, isError: false });
  return { trpc: { siteContent: { list: { useQuery: emptyQuery }, listBlocks: { useQuery: emptyQuery } } } };
});

import { TutorProfileTabEditor } from "./TutorProfileTabEditor";
import type { TutorProfileReadoutSection } from "./TutorProfileSectionReadout";

afterEach(() => cleanup());

const sections: TutorProfileReadoutSection[] = [
  { id: "a", title: "Personal Information", groups: [
    { heading: "Identity and contact", rows: [
      { label: "Full name", value: "Sojib", missing: false },
      { label: "Date of birth", value: "Not given", missing: true },
    ] },
    { heading: "Family and emergency contact", rows: [{ label: "Father's name", value: "Not given", missing: true }] },
  ] },
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
    render(<TutorProfileTabEditor sections={sections} activeTab="a" onTabChange={onTabChange} onEditSection={vi.fn()} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(within(tabs[0]).getByText("1/3")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Education/ }));
    expect(onTabChange).toHaveBeenCalledWith("c");
  });

  it("shows only the active section's panel", () => {
    render(<TutorProfileTabEditor sections={sections} activeTab="a" onTabChange={vi.fn()} onEditSection={vi.fn()} />);

    expect(screen.getByRole("tabpanel").getAttribute("aria-label")).toBe("Personal Information");
    expect(screen.getByText("Full name")).toBeTruthy();
    expect(screen.queryByText("Institute")).toBeNull();
    expect(screen.queryByText("Tuition type")).toBeNull();
  });

  it("edits the Personal Information sub-groups (Identity / Family) separately", () => {
    const onEditSection = vi.fn();
    render(<TutorProfileTabEditor sections={sections} activeTab="a" onTabChange={vi.fn()} onEditSection={onEditSection} />);

    expect(screen.getByRole("heading", { name: "Identity and contact" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Family and emergency contact" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Edit Identity and contact" }));
    expect(onEditSection).toHaveBeenCalledWith("a", "a-identity");
    fireEvent.click(screen.getByRole("button", { name: "Edit Family and emergency contact" }));
    expect(onEditSection).toHaveBeenCalledWith("a", "a-family");
  });

  it("renders each group of the active section as a sub-card whose pencil edits that sub-group", () => {
    const onEditSection = vi.fn();
    render(<TutorProfileTabEditor sections={sections} activeTab="c" onTabChange={vi.fn()} onEditSection={onEditSection} />);

    expect(screen.getByRole("heading", { name: "Education" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Teaching expertise" })).toBeTruthy();
    expect(screen.getByText("Primary subjects")).toBeTruthy();
    expect(screen.getByText("Institute")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Edit Teaching expertise" }));
    expect(onEditSection).toHaveBeenCalledWith("c", "c-teaching");
    fireEvent.click(screen.getByRole("button", { name: "Edit Education" }));
    expect(onEditSection).toHaveBeenCalledWith("c", "c-education");
  });
});
