// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BackToTopButton from "./BackToTopButton";

afterEach(cleanup);

describe("BackToTopButton", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
    Object.defineProperty(document.documentElement, "scrollTop", { value: 0, writable: true, configurable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 2000, writable: true, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, writable: true, configurable: true });
  });

  it("remains hidden when scroll position is below the threshold", () => {
    render(<BackToTopButton threshold={400} />);

    const container = screen.getByTestId("back-to-top-container");
    expect(container.className).toContain("opacity-0");
    expect(container.className).toContain("pointer-events-none");
    expect(screen.queryByTestId("back-to-top-halo")).toBeNull();
  });

  it("becomes visible and displays the 3-pulse halo upon scrolling past threshold", () => {
    render(<BackToTopButton threshold={400} />);

    // Simulate scrolling past threshold
    window.scrollY = 600;
    fireEvent.scroll(window);

    const container = screen.getByTestId("back-to-top-container");
    expect(container.className).toContain("opacity-100");
    expect(container.className).toContain("pointer-events-auto");

    // The signature 3-pulse halo indicator must be present
    const halo = screen.getByTestId("back-to-top-halo");
    expect(halo).toBeTruthy();
    expect(halo.className).toContain("button-ready-halo");
    expect(halo.className).toContain("motion-reduce:hidden");
  });

  it("updates the circular progress ring strokeDashoffset as user scrolls", () => {
    render(<BackToTopButton threshold={400} />);

    // Total scrollable distance = scrollHeight (2000) - innerHeight (800) = 1200
    // Scroll to 600 -> 50% progress
    window.scrollY = 600;
    fireEvent.scroll(window);

    const button = screen.getByRole("button", { name: "Back to top" });
    const circles = button.querySelectorAll("circle");
    expect(circles.length).toBe(2);

    const indicator = circles[1];
    const circumference = 2 * Math.PI * 21; // ~131.947
    const expectedOffset = circumference * 0.5;

    const offsetAttr = indicator.getAttribute("stroke-dashoffset");
    expect(Number(offsetAttr)).toBeCloseTo(expectedOffset, 1);
  });

  it("invokes smooth scrollTo top and triggers launch motion on click", () => {
    render(<BackToTopButton threshold={400} />);

    window.scrollY = 800;
    fireEvent.scroll(window);

    const button = screen.getByRole("button", { name: "Back to top" });
    fireEvent.click(button);

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    expect(button.getAttribute("data-launching")).toBe("true");
  });
});
