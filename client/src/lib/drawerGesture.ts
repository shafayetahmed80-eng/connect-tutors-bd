/**
 * The arithmetic of a drawer that follows the finger, kept apart from the
 * component so every decision can be tested without a touch screen.
 *
 * Progress is how far open the drawer is, 0 (shut) to 1 (open). A drag is a
 * horizontal distance `dx` from where the finger landed; the drawer's own
 * width converts it to progress.
 */

/** A finger must travel this far before we decide which way it is going. */
export const AXIS_LOCK_DISTANCE = 8;
/** A drag counts as sideways only when it is clearly more sideways than up or down. */
export const AXIS_LOCK_RATIO = 1.5;
/** A flick faster than this (px per ms) decides the outcome on its own. */
export const FLICK_VELOCITY = 0.5;
/** How far a drag must open a shut drawer, or close an open one, to count. */
export const SETTLE_DISTANCE = 0.4;
/**
 * Where a swipe may start to open a shut drawer: a little inside the screen's
 * edge, because a phone browser keeps the very edge for its own "back" swipe.
 */
export const EDGE_ZONE = { min: 14, max: 44 } as const;

export type DragAxis = "x" | "y";

/** Which way a drag is going, or null while it has not moved far enough to tell. */
export function lockAxis(dx: number, dy: number): DragAxis | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < AXIS_LOCK_DISTANCE) return null;
  return ax > ay * AXIS_LOCK_RATIO ? "x" : "y";
}

/** The drawer's openness for a drag, held between shut and open. */
export function progressFromDrag({ startProgress, dx, width }: { startProgress: number; dx: number; width: number }): number {
  if (width <= 0) return startProgress;
  return Math.min(1, Math.max(0, startProgress + dx / width));
}

/**
 * Whether the drawer ends up open when the finger lifts. A fast flick wins
 * either way; otherwise the drawer must have moved far enough from where it
 * started - so a small nudge on an open drawer leaves it open.
 */
export function settleOpen({ startedOpen, progress, velocity }: { startedOpen: boolean; progress: number; velocity: number }): boolean {
  if (velocity >= FLICK_VELOCITY) return true;
  if (velocity <= -FLICK_VELOCITY) return false;
  return startedOpen ? progress > 1 - SETTLE_DISTANCE : progress > SETTLE_DISTANCE;
}

/** Whether a touch that lands here may begin opening a shut drawer. */
export function startsInEdgeZone(clientX: number): boolean {
  return clientX >= EDGE_ZONE.min && clientX <= EDGE_ZONE.max;
}
