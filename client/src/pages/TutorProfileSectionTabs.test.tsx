// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: { siteContent: { list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) } } },
}));

import { TutorProfileSectionTabs } from "./TutorProfileSectionTabs";
import type { TutorProfileReadoutSection } from "./TutorProfileSectionReadout";

const sections = [
  { id: "a", title: "Personal", groups: [{ rows: [{ label: "Full name", value: "A", missing: false }] }] },
  { id: "c", title: "Education", groups: [{ rows: [{ label: "Institute", value: "Not given", missing: true }] }] },
  { id: "d", title: "Tuition Related", groups: [{ rows: [] }] },
] as unknown as TutorProfileReadoutSection[];

function setWidths(list: HTMLElement, scrollWidth: number, clientWidth: number, scrollLeft = 0) {
  Object.defineProperty(list, "scrollWidth", { configurable: true, value: scrollWidth });
  Object.defineProperty(list, "clientWidth", { configurable: true, value: clientWidth });
  Object.defineProperty(list, "scrollLeft", { configurable: true, writable: true, value: scrollLeft });
}

afterEach(cleanup);

describe("the profile's section tabs", () => {
  it("fades no edge while every tab fits", () => {
    render(<TutorProfileSectionTabs sections={sections} activeTab="a" onTabChange={() => {}} />);
    expect(screen.getByRole("tablist").className).not.toContain("mask-image");
  });

  it("fades only the end that still hides a tab", () => {
    const { rerender } = render(<TutorProfileSectionTabs sections={sections} activeTab="a" onTabChange={() => {}} />);
    const list = screen.getByRole("tablist");
    setWidths(list, 600, 360, 0);
    list.dispatchEvent(new Event("scroll"));
    rerender(<TutorProfileSectionTabs sections={sections} activeTab="a" onTabChange={() => {}} />);
    expect(list.className).toContain("mask-image:linear-gradient(to_left");

    setWidths(list, 600, 360, 240);
    list.dispatchEvent(new Event("scroll"));
    rerender(<TutorProfileSectionTabs sections={sections} activeTab="a" onTabChange={() => {}} />);
    expect(list.className).toContain("mask-image:linear-gradient(to_right,transparent,#000_1.5rem)]");
  });
});

describe("the section tabs from a keyboard", () => {
  it("is one Tab stop, and the arrows, Home and End move between tabs", () => {
    const onTabChange = vi.fn();
    render(<TutorProfileSectionTabs sections={sections} activeTab="a" onTabChange={onTabChange} />);
    const [personal, education, tuition] = screen.getAllByRole("tab");
    expect(personal.tabIndex).toBe(0);
    expect(education.tabIndex).toBe(-1);

    personal.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(onTabChange).toHaveBeenLastCalledWith("c");
    personal.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(onTabChange).toHaveBeenLastCalledWith("d");
    personal.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    expect(onTabChange).toHaveBeenLastCalledWith("d");
    tuition.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(onTabChange).toHaveBeenLastCalledWith("a");
  });
});
