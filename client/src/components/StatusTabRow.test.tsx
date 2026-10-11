// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StatusTabRow from "@/components/StatusTabRow";

afterEach(cleanup);

const items = [
  { key: "pending", label: "Pending", count: 0 },
  { key: "live", label: "Live", count: 3 },
];

describe("StatusTabRow", () => {
  it("keeps each tab's 10px one-line text and gives it a finger-sized height on a phone", () => {
    render(<StatusTabRow label="Stages" items={items} selected="live" onSelect={() => {}} />);

    const tab = screen.getByRole("tab", { name: /Live/ });
    // The Owner's one-line 10px rule is untouched; only the padding grows, on a phone only.
    expect(tab.className).toContain("text-[10px]");
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
