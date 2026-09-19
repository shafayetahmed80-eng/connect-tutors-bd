// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SwipeDrawer } from "./swipe-drawer";

let clock = 0;
const touch = (x: number, y = 300) => ({ touches: [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }] });

/** Time passes between touch events, so a slow drag is slow and a quick one is a flick. */
function tick(ms: number) { clock += ms; }

beforeEach(() => {
  clock = 1000;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 300 });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mount(open: boolean, onOpenChange = vi.fn()) {
  render(<SwipeDrawer open={open} onOpenChange={onOpenChange}><button type="button">Overview</button></SwipeDrawer>);
  return onOpenChange;
}
const panel = () => document.querySelector("[role=dialog]") as HTMLElement;

function drag(points: number[], y = 300, gap = 400) {
  fireEvent.touchStart(document, touch(points[0], y));
  for (const x of points.slice(1)) { tick(gap); fireEvent.touchMove(document, touch(x, y)); }
  tick(gap);
  fireEvent.touchEnd(document, touch(points[points.length - 1], y));
}

describe("the swipe drawer", () => {
  it("is out of reach while shut, and reachable once open", () => {
    mount(false);
    expect(panel().getAttribute("aria-hidden")).toBe("true");
    expect(panel().hasAttribute("inert")).toBe(true);
    cleanup();
    mount(true);
    expect(panel().getAttribute("aria-hidden")).toBe("false");
    expect(panel().hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Overview" }));
  });

  it("opens when pulled out past the middle from just inside the edge", () => {
    const change = mount(false);
    drag([20, 100, 210]);
    expect(change).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenCalledWith(true);
  });

  it("follows the finger while it is down", () => {
    mount(false);
    fireEvent.touchStart(document, touch(20));
    tick(400);
    fireEvent.touchMove(document, touch(110));
    expect(panel().style.transform).toBe("translate3d(-70%, 0, 0)");
    expect(panel().getAttribute("data-dragging")).toBe("true");
  });

  it("springs back when the drag stopped short, and opens on a quick flick", () => {
    const short = mount(false);
    drag([20, 60, 90]);
    expect(short).not.toHaveBeenCalled();
    cleanup();

    const flick = mount(false);
    drag([20, 50, 80, 110], 300, 20);
    expect(flick).toHaveBeenCalledTimes(1);
    expect(flick).toHaveBeenCalledWith(true);
  });

  it("ignores a swipe that starts elsewhere, and one that goes up and down", () => {
    const change = mount(false);
    drag([120, 260, 300]);
    drag([20, 24, 30], 300);
    fireEvent.touchStart(document, touch(20, 300));
    tick(400);
    const notCancelled = fireEvent.touchMove(document, touch(24, 380));
    expect(notCancelled).toBe(true);
    fireEvent.touchEnd(document, touch(24, 380));
    expect(change).not.toHaveBeenCalled();
  });

  it("closes when pushed back far enough, but a nudge leaves it open", () => {
    const pushed = mount(true);
    drag([280, 200, 100]);
    expect(pushed).toHaveBeenCalledTimes(1);
    expect(pushed).toHaveBeenCalledWith(false);
    cleanup();

    const nudged = mount(true);
    drag([280, 250, 225]);
    expect(nudged).not.toHaveBeenCalled();
  });

  it("closes on Escape and on a tap on the dimmed page", () => {
    const change = mount(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(change).toHaveBeenCalledWith(false);
    change.mockClear();
    act(() => { (document.querySelector("[data-swipe-backdrop]") as HTMLElement).click(); });
    expect(change).toHaveBeenCalledWith(false);
  });
});
