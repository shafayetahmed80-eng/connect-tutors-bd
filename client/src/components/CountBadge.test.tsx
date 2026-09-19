// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CountBadge } from "./DashboardLayout";

afterEach(cleanup);

describe("the waiting count in the sidebar", () => {
  it("stays still on first paint, pulses once when the count goes up, and not when it goes down", () => {
    const { rerender } = render(<CountBadge count={2} />);
    const badge = () => screen.getByLabelText(/waiting/);
    expect(badge().textContent).toBe("2");
    expect(badge().hasAttribute("data-pulse")).toBe(false);

    rerender(<CountBadge count={3} />);
    expect(badge().textContent).toBe("3");
    expect(badge().hasAttribute("data-pulse")).toBe(true);

    const pulsed = badge();
    rerender(<CountBadge count={1} />);
    expect(badge().textContent).toBe("1");
    // Same element: going down does not restart the animation.
    expect(badge()).toBe(pulsed);
  });

  it("shows 99+ for a very large count, and reads its number aloud", () => {
    render(<CountBadge count={120} />);
    expect(screen.getByLabelText("120 waiting").textContent).toBe("99+");
  });
});
