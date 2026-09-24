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

// `editTarget` is the read-out's own answer to "which popup does this card's
// pencil open" - absent means the whole section opens in one.
const sections: TutorProfileReadoutSection[] = [
  { id: "a", title: "Personal Information", groups: [
    { heading: "Identity and contact", editTarget: "a-identity", rows: [
      { label: "Full name", value: "Sojib", missing: false },
      { label: "Date of birth", value: "Not given", missing: true },
    ] },
    { heading: "Family and emergency contact", editTarget: "a-family", rows: [{ label: "Father's name", value: "Not given", missing: true }] },
  ] },
  { id: "c", title: "Education", groups: [
    { heading: "University Section", editTarget: "c-university", rows: [{ label: "Institute", value: "DU", missing: false }] },
    { heading: "Higher Secondary", editTarget: "c-higher-secondary", rows: [{ label: "Institute Name", value: "Not given", missing: true }] },
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

    expect(screen.getByRole("heading", { name: "University Section" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Higher Secondary" })).toBeTruthy();
    expect(screen.getByText("Institute Name")).toBeTruthy();
    expect(screen.getByText("Institute")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Edit Higher Secondary" }));
    expect(onEditSection).toHaveBeenCalledWith("c", "c-higher-secondary");
    fireEvent.click(screen.getByRole("button", { name: "Edit University Section" }));
    expect(onEditSection).toHaveBeenCalledWith("c", "c-university");
  });
});

describe("TutorProfileTabEditor states", () => {
  it("marks only the card just saved", () => {
    render(<TutorProfileTabEditor sections={sections} activeTab="a" onTabChange={vi.fn()} onEditSection={vi.fn()} justSaved="a-family" />);
    const saved = screen.getByRole("status");
    expect(saved.textContent).toBe("Saved");
    expect(saved.closest("section")?.textContent).toContain("Family and emergency contact");
    // Outside the heading, so the heading still reads as its own name.
    expect(screen.getByRole("heading", { name: "Family and emergency contact" })).toBeTruthy();
  });

  it("shows an empty card once, naming what it asks for, with Add opening its editor", () => {
    const onEditSection = vi.fn();
    render(<TutorProfileTabEditor sections={sections} activeTab="a" onTabChange={vi.fn()} onEditSection={onEditSection} />);
    const family = screen.getByRole("heading", { name: "Family and emergency contact" }).closest("section")!;
    expect(within(family).getByText("Nothing added here yet")).toBeTruthy();
    expect(within(family).getByText("Father's name")).toBeTruthy();
    expect(within(family).queryByText("Not given")).toBeNull();

    fireEvent.click(within(family).getByRole("button", { name: "Add Family and emergency contact" }));
    expect(onEditSection).toHaveBeenCalledWith("a", "a-family");

    // A card with something in it keeps its rows.
    const identity = screen.getByRole("heading", { name: "Identity and contact" }).closest("section")!;
    expect(within(identity).queryByText("Nothing added here yet")).toBeNull();
    expect(within(identity).getByText("Sojib")).toBeTruthy();
  });
});
