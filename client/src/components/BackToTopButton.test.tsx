// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BackToTopButton from "./BackToTopButton";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("BackToTopButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.scrollTo = vi.fn();
    Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
    Object.defineProperty(document.documentElement, "scrollTop", { value: 0, writable: true, configurable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 4000, writable: true, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, writable: true, configurable: true });
  });

  it("remains hidden when scroll position is below the default 1000px threshold", () => {
    render(<BackToTopButton threshold={1000} />);

    // Scroll to 800px (below 1000px)
    window.scrollY = 800;
    fireEvent.scroll(window);

    const container = screen.getByTestId("back-to-top-container");
    expect(container.className).toContain("opacity-0");
    expect(container.className).toContain("pointer-events-none");
    expect(screen.queryByTestId("back-to-top-halo")).toBeNull();
  });

  it("becomes visible upon scrolling past 1000px threshold and displays initial 3-pulse halo", () => {
    render(<BackToTopButton threshold={1000} />);

    // Scroll to 1200px
    window.scrollY = 1200;
    fireEvent.scroll(window);

    const container = screen.getByTestId("back-to-top-container");
    expect(container.className).toContain("pointer-events-auto");
    expect(container.className).toContain("opacity-50"); // initial scroll from 0 is down

    // The signature 3-pulse halo indicator must be present on initial entrance
    const halo = screen.getByTestId("back-to-top-halo");
    expect(halo).toBeTruthy();
    expect(halo.className).toContain("button-ready-halo");
    expect(halo.className).toContain("motion-reduce:hidden");
  });

  it("smoothly auto-hides after 2000ms idle timeout when scrolling stops", () => {
    render(<BackToTopButton threshold={1000} hideDelay={2000} />);

    // User scrolls past 1000px
    window.scrollY = 1500;
    fireEvent.scroll(window);

    const container = screen.getByTestId("back-to-top-container");
    expect(container.className).toContain("pointer-events-auto");

    // Advance timer by 1900ms (not yet hidden)
    act(() => {
      vi.advanceTimersByTime(1900);
    });
    expect(container.className).toContain("pointer-events-auto");

    // Advance past 2000ms threshold -> smoothly hides
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(container.className).toContain("opacity-0");
    expect(container.className).toContain("pointer-events-none");
  });

  it("pauses auto-hide while hovered or focused, and resumes hide countdown on mouse leave", () => {
    render(<BackToTopButton threshold={1000} hideDelay={2000} />);

    window.scrollY = 1400;
    fireEvent.scroll(window);

    const container = screen.getByTestId("back-to-top-container");
    expect(container.className).toContain("pointer-events-auto");

    // User hovers before 2s elapsed
    fireEvent.mouseEnter(container);

    // Advance 3000ms: should remain visible because user is hovered
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(container.className).toContain("pointer-events-auto");

    // User leaves mouse
    fireEvent.mouseLeave(container);

    // 2s countdown runs after mouse leaves
    act(() => {
      vi.advanceTimersByTime(1900);
    });
    expect(container.className).toContain("pointer-events-auto");

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(container.className).toContain("opacity-0");
    expect(container.className).toContain("pointer-events-none");
  });

  it("reappears when scrolling resumes without repeating the 3-pulse halo", () => {
    render(<BackToTopButton threshold={1000} hideDelay={2000} />);

    // First scroll
    window.scrollY = 1200;
    fireEvent.scroll(window);

    const initialHalo = screen.getByTestId("back-to-top-halo");
    expect(initialHalo).toBeTruthy();

    // Halo animation completes
    fireEvent.animationEnd(initialHalo);

    // Idle hides the button
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    const container = screen.getByTestId("back-to-top-container");
    expect(container.className).toContain("opacity-0");

    // User scrolls again
    window.scrollY = 1300;
    fireEvent.scroll(window);

    // Button is visible again
    expect(container.className).toContain("pointer-events-auto");
    // Halo does not reappear
    expect(screen.queryByTestId("back-to-top-halo")).toBeNull();
  });

  it("dims to translucent on downward scroll and restores full opacity on upward scroll", () => {
    render(<BackToTopButton threshold={1000} />);

    // Scroll down to 1400
    window.scrollY = 1400;
    fireEvent.scroll(window);

    const container = screen.getByTestId("back-to-top-container");
    expect(container.getAttribute("data-direction")).toBe("down");
    expect(container.className).toContain("opacity-50");

    // Scroll up to 1350
    window.scrollY = 1350;
    fireEvent.scroll(window);

    expect(container.getAttribute("data-direction")).toBe("up");
    expect(container.className).toContain("opacity-100");
  });

  it("invokes smooth scrollTo top and triggers launch motion & haptic feedback on click", () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: vibrateMock, writable: true, configurable: true });

    render(<BackToTopButton threshold={1000} />);

    window.scrollY = 1600;
    fireEvent.scroll(window);

    const button = screen.getByRole("button", { name: "Back to top" });
    fireEvent.click(button);

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    expect(button.getAttribute("data-launching")).toBe("true");
    expect(vibrateMock).toHaveBeenCalledWith(10);
  });
});
