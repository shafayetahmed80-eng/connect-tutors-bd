// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import TuitionStatusPill, { type TuitionStage } from "./TuitionStatusPill";

afterEach(cleanup);

describe("TuitionStatusPill", () => {
  it("renders live and pending with pulsing radar dots", () => {
    const { container, unmount } = render(<TuitionStatusPill stage="live" label="Live Tuition" />);
    const livePill = container.querySelector('[data-stage="live"]');

    expect(livePill).toBeTruthy();
    expect(screen.getByText("Live Tuition")).toBeTruthy();
    expect(container.querySelector('[data-testid="status-dot-ping"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="status-dot"]')?.className).toContain("bg-sky-500");
    unmount();

    render(<TuitionStatusPill stage="pending" label="Pending Review" />);
    expect(screen.getByText("Pending Review")).toBeTruthy();
    expect(document.querySelector('[data-testid="status-dot-ping"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="status-dot"]')?.className).toContain("bg-amber-500");
  });

  it("renders appointed with active pulse dot", () => {
    const { container } = render(<TuitionStatusPill stage="appointed" label="Appointed" />);
    expect(container.querySelector('[data-testid="status-dot-ping"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="status-dot"]')?.className).toContain("bg-emerald-500");
  });

  it("renders confirmed, closed, and cancelled with static dots (no ping)", () => {
    const stages: TuitionStage[] = ["confirmed", "closed", "cancelled"];

    for (const stage of stages) {
      const { container, unmount } = render(<TuitionStatusPill stage={stage} label={stage.toUpperCase()} />);
      expect(screen.getByText(stage.toUpperCase())).toBeTruthy();
      expect(container.querySelector('[data-testid="status-dot-ping"]')).toBeNull();
      expect(container.querySelector('[data-testid="status-dot"]')).toBeTruthy();
      unmount();
    }
  });
});
