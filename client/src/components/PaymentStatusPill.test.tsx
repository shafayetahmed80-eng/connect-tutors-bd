// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PaymentStatusPill from "./PaymentStatusPill";

afterEach(cleanup);

describe("PaymentStatusPill", () => {
  it("renders full_due with red tone and active pulsing radar dot", () => {
    const { container } = render(<PaymentStatusPill status="full_due" />);
    const pill = container.querySelector('[data-status="full_due"]');

    expect(pill).toBeTruthy();
    expect(pill?.textContent).toContain("Full Due");
    expect(pill?.className).toContain("text-red-800");

    const ping = container.querySelector('[data-testid="status-dot-ping"]');
    const dot = container.querySelector('[data-testid="status-dot"]');

    expect(ping).toBeTruthy();
    expect(ping?.className).toContain("status-dot-ping");
    expect(ping?.className).toContain("bg-red-400");
    expect(dot?.className).toContain("bg-red-500");
  });

  it("renders half_paid and partial_paid with active pulse dots", () => {
    const { unmount } = render(<PaymentStatusPill status="half_paid" />);
    expect(screen.getByText("Half Paid")).toBeTruthy();
    expect(document.querySelector('[data-testid="status-dot-ping"]')).toBeTruthy();
    unmount();

    render(<PaymentStatusPill status="partial_paid" />);
    expect(screen.getByText("Partial Paid")).toBeTruthy();
    expect(document.querySelector('[data-testid="status-dot-ping"]')).toBeTruthy();
  });

  it("renders full_paid with calm emerald dot and no ping animation", () => {
    const { container } = render(<PaymentStatusPill status="full_paid" />);
    const pill = container.querySelector('[data-status="full_paid"]');

    expect(pill).toBeTruthy();
    expect(pill?.textContent).toContain("Full Paid");
    expect(pill?.className).toContain("text-emerald-800");

    // Static calm dot, no ping animation
    const ping = container.querySelector('[data-testid="status-dot-ping"]');
    const dot = container.querySelector('[data-testid="status-dot"]');

    expect(ping).toBeNull();
    expect(dot?.className).toContain("bg-emerald-500");
  });
});
