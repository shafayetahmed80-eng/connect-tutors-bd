// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, act, cleanup } from "@testing-library/react";
import { CelebrationConfetti } from "./CelebrationConfetti";

describe("CelebrationConfetti Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders the requested number of confetti particles with trajectory CSS variables", () => {
    const { container } = render(<CelebrationConfetti count={24} />);

    const confettiRoot = screen.getByTestId("celebration-confetti");
    expect(confettiRoot).toBeTruthy();
    expect(confettiRoot.getAttribute("aria-hidden")).toBe("true");

    const particles = container.querySelectorAll(".confetti-particle");
    expect(particles.length).toBe(24);

    const firstParticle = particles[0] as HTMLElement;
    expect(firstParticle.style.getPropertyValue("--particle-x")).toBeTruthy();
    expect(firstParticle.style.getPropertyValue("--particle-y")).toBeTruthy();
    expect(firstParticle.style.getPropertyValue("--particle-rot")).toBeTruthy();
    expect(firstParticle.style.getPropertyValue("--particle-duration")).toBeTruthy();
  });

  it("auto-unmounts particles after the duration expires", () => {
    render(<CelebrationConfetti count={20} durationMs={1500} />);

    expect(screen.queryByTestId("celebration-confetti")).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(screen.queryByTestId("celebration-confetti")).toBeNull();
  });

  it("does not render when active prop is false", () => {
    render(<CelebrationConfetti active={false} />);
    expect(screen.queryByTestId("celebration-confetti")).toBeNull();
  });

  it("honors prefers-reduced-motion: reduce by suppressing particles", () => {
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<CelebrationConfetti count={30} />);
    expect(screen.queryByTestId("celebration-confetti")).toBeNull();
  });
});
