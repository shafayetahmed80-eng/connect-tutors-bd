import { describe, expect, it } from "vitest";
import { lockAxis, progressFromDrag, settleOpen, startsInEdgeZone } from "./drawerGesture";

describe("which way a drag is going", () => {
  it("waits until the finger has moved, then calls a clearly sideways drag sideways", () => {
    expect(lockAxis(3, 2)).toBeNull();
    expect(lockAxis(30, 4)).toBe("x");
    expect(lockAxis(-30, 4)).toBe("x");
  });

  it("leaves an up-and-down or slanting drag to the page", () => {
    expect(lockAxis(4, 30)).toBe("y");
    // Mostly sideways is not enough: it must clearly beat the vertical.
    expect(lockAxis(20, 16)).toBe("y");
  });
});

describe("how far open a drag has made the drawer", () => {
  it("follows the finger, and never goes past shut or open", () => {
    expect(progressFromDrag({ startProgress: 0, dx: 90, width: 300 })).toBeCloseTo(0.3);
    expect(progressFromDrag({ startProgress: 0, dx: 900, width: 300 })).toBe(1);
    expect(progressFromDrag({ startProgress: 1, dx: -150, width: 300 })).toBeCloseTo(0.5);
    expect(progressFromDrag({ startProgress: 1, dx: -900, width: 300 })).toBe(0);
    expect(progressFromDrag({ startProgress: 0.7, dx: 50, width: 0 })).toBe(0.7);
  });
});

describe("what happens when the finger lifts", () => {
  it("opens a shut drawer only when it went far enough, or was flicked", () => {
    expect(settleOpen({ startedOpen: false, progress: 0.45, velocity: 0.1 })).toBe(true);
    expect(settleOpen({ startedOpen: false, progress: 0.3, velocity: 0.1 })).toBe(false);
    expect(settleOpen({ startedOpen: false, progress: 0.1, velocity: 0.8 })).toBe(true);
  });

  it("closes an open drawer only when it was pushed far enough, or flicked; a nudge leaves it open", () => {
    expect(settleOpen({ startedOpen: true, progress: 0.55, velocity: -0.1 })).toBe(false);
    expect(settleOpen({ startedOpen: true, progress: 0.8, velocity: -0.1 })).toBe(true);
    expect(settleOpen({ startedOpen: true, progress: 0.9, velocity: -0.8 })).toBe(false);
  });
});

describe("where a swipe may begin", () => {
  it("is a little inside the edge, which the browser keeps for its own back swipe", () => {
    expect(startsInEdgeZone(4)).toBe(false);
    expect(startsInEdgeZone(20)).toBe(true);
    expect(startsInEdgeZone(120)).toBe(false);
  });
});
