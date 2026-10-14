// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRipple, isReducedMotionPreferred, initButtonRippleListener } from "./ripple";

describe("Button Ripple Effect", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("creates an expanding ripple wave element with correct attributes inside a clicked button", () => {
    const button = document.createElement("button");
    button.className = "bg-primary text-white";
    button.getBoundingClientRect = vi.fn(() => ({
      left: 100,
      top: 50,
      width: 120,
      height: 40,
      right: 220,
      bottom: 90,
      x: 100,
      y: 50,
      toJSON: () => ({}),
    }));
    document.body.appendChild(button);

    const event = {
      target: button,
      currentTarget: button,
      clientX: 130, // 30px offset from left
      clientY: 60,  // 10px offset from top
    } as unknown as MouseEvent;

    const wave = createRipple(event);

    expect(wave).not.toBeNull();
    expect(wave?.classList.contains("ripple-wave")).toBe(true);
    expect(wave?.classList.contains("ripple-wave-light")).toBe(true);
    expect(wave?.getAttribute("aria-hidden")).toBe("true");
    expect(button.contains(wave!)).toBe(true);
    expect(button.style.overflow).toBe("hidden");
  });

  it("selects ripple-wave-dark for light-background buttons", () => {
    const button = document.createElement("button");
    button.className = "bg-white text-j-ink border";
    button.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 100,
      height: 40,
      right: 100,
      bottom: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));
    document.body.appendChild(button);

    const event = {
      target: button,
      currentTarget: button,
      clientX: 50,
      clientY: 20,
    } as unknown as MouseEvent;

    const wave = createRipple(event);
    expect(wave?.classList.contains("ripple-wave-dark")).toBe(true);
  });

  it("does not create a ripple wave if button is disabled", () => {
    const button = document.createElement("button");
    button.disabled = true;
    document.body.appendChild(button);

    const event = {
      target: button,
      currentTarget: button,
      clientX: 10,
      clientY: 10,
    } as unknown as MouseEvent;

    const wave = createRipple(event);
    expect(wave).toBeNull();
    expect(button.children.length).toBe(0);
  });

  it("does not create a ripple wave if data-ripple is false", () => {
    const button = document.createElement("button");
    button.dataset.ripple = "false";
    document.body.appendChild(button);

    const event = {
      target: button,
      currentTarget: button,
      clientX: 10,
      clientY: 10,
    } as unknown as MouseEvent;

    const wave = createRipple(event);
    expect(wave).toBeNull();
  });

  it("cleans up ripple wave after animation completes or timeout expires", () => {
    const button = document.createElement("button");
    button.className = "bg-primary text-white";
    button.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 100,
      height: 40,
      right: 100,
      bottom: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));
    document.body.appendChild(button);

    const event = {
      target: button,
      currentTarget: button,
      clientX: 20,
      clientY: 20,
    } as unknown as MouseEvent;

    const wave = createRipple(event);
    expect(button.contains(wave!)).toBe(true);

    vi.advanceTimersByTime(750);
    expect(button.contains(wave!)).toBe(false);
  });

  it("honors prefers-reduced-motion: reduce", () => {
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

    expect(isReducedMotionPreferred()).toBe(true);

    const button = document.createElement("button");
    document.body.appendChild(button);

    const event = {
      target: button,
      currentTarget: button,
      clientX: 20,
      clientY: 20,
    } as unknown as MouseEvent;

    const wave = createRipple(event);
    expect(wave).toBeNull();
  });
});
