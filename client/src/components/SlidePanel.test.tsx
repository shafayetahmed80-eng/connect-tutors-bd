// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SlidePanel } from "@/components/ListToolbar";

const originalMatchMedia = window.matchMedia;

function allowMotion(allowed: boolean) {
  window.matchMedia = ((query: string) => ({ matches: allowed && query.includes("no-preference"), media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.matchMedia = originalMatchMedia;
});

/** Plays out a whole open or close: each step the component schedules is only set once the one before has run. */
const play = () => { act(() => { vi.advanceTimersByTime(40); }); act(() => { vi.advanceTimersByTime(260); }); };

const panel = (open: boolean) => <SlidePanel open={open}><p>the filters</p></SlidePanel>;
const slide = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-slide]");

describe("SlidePanel with no motion to offer (a reduced-motion setting, or nothing that can say)", () => {
  it("mounts its content only while open, at once, so what it fetches waits for the first open", () => {
    const { rerender } = render(panel(false));
    expect(screen.queryByText("the filters")).toBeNull();

    rerender(panel(true));
    expect(screen.getByText("the filters")).toBeTruthy();

    rerender(panel(false));
    expect(screen.queryByText("the filters")).toBeNull();
  });

  it("does the same when the page asks for less motion", () => {
    allowMotion(false);
    const { rerender, container } = render(panel(false));

    rerender(panel(true));
    expect(slide(container)!.dataset.slide).toBe("open");
    rerender(panel(false));
    expect(screen.queryByText("the filters")).toBeNull();
  });
});

describe("SlidePanel with motion", () => {
  beforeEach(() => {
    allowMotion(true);
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "setTimeout", "clearTimeout"] });
  });

  it("opens shut, grows, then rests unclipped so a sticky bar inside it still sticks", () => {
    const { rerender, container } = render(panel(false));
    expect(slide(container)).toBeNull();

    rerender(panel(true));
    // Painted shut first: no height, no opacity, clipped.
    expect(slide(container)!.dataset.slide).toBe("opening");
    expect(slide(container)!.className).toContain("grid-rows-[0fr]");
    expect(slide(container)!.firstElementChild!.className).toContain("overflow-hidden");
    expect(screen.getByText("the filters")).toBeTruthy();

    // Two frames later it is told to grow, and is still clipped while it moves.
    act(() => { vi.advanceTimersByTime(40); });
    expect(slide(container)!.dataset.slide).toBe("expanding");
    expect(slide(container)!.className).toContain("grid-rows-[1fr]");
    expect(slide(container)!.firstElementChild!.className).toContain("overflow-hidden");

    // At rest nothing is clipped.
    act(() => { vi.advanceTimersByTime(260); });
    expect(slide(container)!.dataset.slide).toBe("open");
    expect(slide(container)!.firstElementChild!.className).not.toContain("overflow-hidden");
  });

  it("shrinks away and leaves the page only once the slide is over", () => {
    const { rerender, container } = render(panel(false));
    rerender(panel(true));
    play();
    expect(slide(container)!.dataset.slide).toBe("open");

    rerender(panel(false));
    expect(slide(container)!.dataset.slide).toBe("closing");
    expect(slide(container)!.className).toContain("grid-rows-[0fr]");
    expect(screen.getByText("the filters")).toBeTruthy();

    act(() => { vi.advanceTimersByTime(260); });
    expect(slide(container)).toBeNull();
    expect(screen.queryByText("the filters")).toBeNull();
  });

  it("comes back open if it is asked to open again while it is still closing", () => {
    const { rerender, container } = render(panel(false));
    rerender(panel(true));
    play();

    rerender(panel(false));
    act(() => { vi.advanceTimersByTime(100); });
    rerender(panel(true));
    play();

    expect(slide(container)!.dataset.slide).toBe("open");
    expect(screen.getByText("the filters")).toBeTruthy();
  });
});
