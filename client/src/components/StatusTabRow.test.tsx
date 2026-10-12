// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StatusTabRow from "@/components/StatusTabRow";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const items = [
  { key: "pending", label: "Pending", count: 0 },
  { key: "live", label: "Live", count: 3 },
];

// jsdom lays nothing out, so every offset is 0. Give the tabs a plain layout: 100px apart, 80px wide, 40px tall.
function layOutTabs() {
  const indexOf = (element: HTMLElement) => Array.from(element.parentElement?.children ?? []).indexOf(element);
  vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (this: HTMLElement) { return indexOf(this) * 100; });
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(80);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(40);
}

describe("StatusTabRow underline", () => {
  beforeEach(layOutTabs);

  const underline = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-tab-underline]");

  it("is one bar for the whole row, under the chosen tab, not one drawn inside each tab", () => {
    const { container } = render(<StatusTabRow label="Stages" items={items} selected="live" onSelect={() => {}} />);

    expect(container.querySelectorAll("[data-tab-underline]")).toHaveLength(1);
    expect(screen.getByRole("tab", { name: /Live/ }).querySelector("[aria-hidden]")).toBeNull();
    // Under the second tab: its left edge, its width, and the row's bottom line (the tab's bottom edge less 1px).
    expect(underline(container)!.style.width).toBe("80px");
    expect(underline(container)!.style.transform).toBe("translate(100px, 39px)");
  });

  it("does not animate where it first appears, then glides to the next tab chosen", () => {
    const { container, rerender } = render(<StatusTabRow label="Stages" items={items} selected="pending" onSelect={() => {}} />);
    expect(underline(container)!.className).not.toContain("transition-[transform,width]");
    expect(underline(container)!.style.transform).toBe("translate(0px, 39px)");

    rerender(<StatusTabRow label="Stages" items={items} selected="live" onSelect={() => {}} />);

    expect(container.querySelectorAll("[data-tab-underline]")).toHaveLength(1);
    expect(underline(container)!.style.transform).toBe("translate(100px, 39px)");
    expect(underline(container)!.className).toContain("transition-[transform,width]");
  });

  it("never animates for a reduced-motion setting", () => {
    const { container } = render(<StatusTabRow label="Stages" items={items} selected="live" onSelect={() => {}} />);
    expect(underline(container)!.className).toContain("motion-reduce:transition-none");
  });

  it("draws no bar when no tab is chosen, as in a toggle row with nothing pressed", () => {
    const { container, rerender } = render(<StatusTabRow label="Stages" toggle items={items} selected={null} onSelect={() => {}} />);
    expect(underline(container)).toBeNull();

    rerender(<StatusTabRow label="Stages" toggle items={items} selected="pending" onSelect={() => {}} />);
    expect(container.querySelectorAll("[data-tab-underline]")).toHaveLength(1);
  });

  it("keeps the bar under the chosen tab when a count changes a tab's width", () => {
    const { container, rerender } = render(<StatusTabRow label="Stages" items={items} selected="live" onSelect={() => {}} />);
    expect(underline(container)!.style.width).toBe("80px");

    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(96);
    rerender(<StatusTabRow label="Stages" items={[items[0], { ...items[1], count: 130 }]} selected="live" onSelect={() => {}} />);

    expect(underline(container)!.style.width).toBe("96px");
  });
});

describe("StatusTabRow", () => {
  it("keeps each tab's 10px one-line text and gives it a finger-sized height on a phone", () => {
    render(<StatusTabRow label="Stages" items={items} selected="live" onSelect={() => {}} />);

    const tab = screen.getByRole("tab", { name: /Live/ });
    expect(tab.className).toContain("text-[11px]");
    expect(tab.className).toContain("whitespace-nowrap");
    expect(tab.className).toContain("max-sm:pt-3");
    expect(tab.className).toContain("max-sm:pb-3");
  });

  it("still chooses a stage and shows its zero-padded count", () => {
    const onSelect = vi.fn();
    render(<StatusTabRow label="Stages" items={items} selected="live" onSelect={onSelect} />);

    expect(screen.getByRole("tab", { name: /Live/ }).textContent).toContain("03");
    fireEvent.click(screen.getByRole("tab", { name: /Pending/ }));
    expect(onSelect).toHaveBeenCalledWith("pending");
  });
});
