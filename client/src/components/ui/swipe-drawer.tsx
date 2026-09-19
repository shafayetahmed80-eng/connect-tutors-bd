import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { lockAxis, progressFromDrag, settleOpen, startsInEdgeZone } from "@/lib/drawerGesture";
import { cn } from "@/lib/utils";
import * as React from "react";

type Drag = {
  startX: number;
  startY: number;
  startProgress: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  width: number;
  axis: "x" | "y" | null;
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The phone's navigation drawer, moved by the finger.
 *
 * A swipe that starts a little inside the left edge pulls it out, and it
 * follows the finger; on an open drawer, a drag to the left pushes it back.
 * Lifting the finger settles it: open or shut by how far it went, or by a
 * flick. The hamburger, a tap on the dimmed page, Escape and choosing a page
 * all still work, so nothing depends on the gesture - a phone browser may keep
 * the edge swipe for itself.
 *
 * Up-and-down touches are left to the page: the axis is decided after a few
 * pixels, and only a clearly sideways drag is taken over. The math is in
 * `@/lib/drawerGesture`. Everything stops moving under reduced motion.
 */
export function SwipeDrawer({ open, onOpenChange, label = "Navigation", className, style, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<Drag | null>(null);
  // Openness while a finger is down; null the rest of the time.
  const [dragProgress, setDragProgress] = React.useState<number | null>(null);
  const openRef = React.useRef(open);
  openRef.current = open;
  const changeRef = React.useRef(onOpenChange);
  changeRef.current = onOpenChange;

  const dragging = dragProgress !== null;
  const shown = dragProgress ?? (open ? 1 : 0);
  useBodyScrollLock(open || dragging);

  React.useEffect(() => {
    const begin = (x: number, y: number, startProgress: number) => {
      const width = panelRef.current?.offsetWidth ?? 0;
      drag.current = { startX: x, startY: y, startProgress, lastX: x, lastTime: performance.now(), velocity: 0, width, axis: null };
    };
    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      const target = event.target as Node | null;
      const panel = panelRef.current;
      if (openRef.current) {
        // Anywhere on the open drawer, or on the dimmed page beside it.
        begin(touch.clientX, touch.clientY, 1);
      } else if (startsInEdgeZone(touch.clientX) && panel && !(target instanceof Element && target.closest("[data-swipe-ignore]"))) {
        begin(touch.clientX, touch.clientY, 0);
      }
    };
    const onMove = (event: TouchEvent) => {
      const current = drag.current;
      if (!current || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - current.startX;
      const dy = touch.clientY - current.startY;
      if (!current.axis) {
        current.axis = lockAxis(dx, dy);
        if (!current.axis) return;
        if (current.axis === "y") { drag.current = null; return; }
      }
      // Taken over: the page must not scroll under a drag we are following.
      if (event.cancelable) event.preventDefault();
      const now = performance.now();
      const elapsed = now - current.lastTime;
      if (elapsed > 0) {
        // Smoothed, so one jittery sample cannot pass for a flick.
        current.velocity = current.velocity * 0.6 + ((touch.clientX - current.lastX) / elapsed) * 0.4;
        current.lastX = touch.clientX;
        current.lastTime = now;
      }
      setDragProgress(progressFromDrag({ startProgress: current.startProgress, dx, width: current.width }));
    };
    const onEnd = (event: TouchEvent) => {
      const current = drag.current;
      drag.current = null;
      if (!current || current.axis !== "x") { setDragProgress(null); return; }
      const touch = event.changedTouches[0];
      const dx = touch ? touch.clientX - current.startX : 0;
      const progress = progressFromDrag({ startProgress: current.startProgress, dx, width: current.width });
      const next = settleOpen({ startedOpen: current.startProgress === 1, progress, velocity: current.velocity });
      setDragProgress(null);
      if (next !== openRef.current) changeRef.current(next);
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onEnd);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  // Keyboard and focus, as an open dialog owes: Escape closes, Tab stays inside,
  // and focus goes back to where it was.
  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { changeRef.current(false); return; }
      if (event.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(item => !item.hasAttribute("inert") && !item.closest("[inert]"));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (active === first || !panel.contains(active))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (active === last || !panel.contains(active))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  const reachable = open || dragging;
  return (
    <>
      <div
        aria-hidden="true"
        data-swipe-backdrop=""
        data-dragging={dragging}
        onClick={() => onOpenChange(false)}
        className="fixed inset-0 z-40 bg-[rgb(16_40_73/0.42)] transition-opacity duration-[260ms] ease-out motion-reduce:transition-none data-[dragging=true]:transition-none"
        style={{ opacity: shown, pointerEvents: shown > 0.02 ? "auto" : "none" }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={open}
        aria-label={label}
        aria-hidden={!reachable}
        inert={!reachable}
        tabIndex={-1}
        data-mobile="true"
        data-sidebar="sidebar"
        data-slot="sidebar"
        data-dragging={dragging}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh flex-col overflow-y-auto overscroll-contain outline-none",
          "transition-transform duration-[280ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none data-[dragging=true]:transition-none",
          className,
        )}
        style={{
          ...style,
          width: "min(86vw, var(--sidebar-width))",
          transform: `translate3d(${(shown - 1) * 100}%, 0, 0)`,
          // Vertical scrolling stays the browser's; only a sideways drag is ours.
          touchAction: "pan-y",
          boxShadow: shown > 0.01 ? "0 0 0 1px rgb(16 40 73 / 0.05), 12px 0 32px -12px rgb(16 40 73 / 0.28)" : "none",
        }}
      >
        {children}
      </div>
    </>
  );
}
