import { X } from "lucide-react";
import React, { createContext, useContext, useEffect, useId, useRef } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { cn } from "@/lib/utils";
import { tutorProfileTheme as tp } from "@/pages/tutorProfileTheme";

export type ModalSize = "sm" | "md" | "lg";

/**
 * The one dialog shell for every panel — Tutor, Guardian, Admin.
 *
 * It bakes in the decisions so no caller re-litigates them:
 *
 *  - Warm paper surface, one soft shadow, a 1px rule. No gradient, no colour
 *    ring, no glow, no backdrop blur — a panel reads as a lifted sheet of the
 *    same paper as the page, not a pane of tinted glass.
 *  - Three widths only (`sm` 480, `md` 600, `lg` 760). Pick from the menu.
 *  - A bottom sheet under `sm`, a centred card above it — one gesture everywhere.
 *  - One 200ms entrance on the sidebar's decelerating curve.
 *
 * It is a plain overlay with a light Tab cycle rather than a library focus
 * trap, so a nested overlay (a location picker, the photo cropper) can open on
 * top without two traps fighting for the keyboard. A caller whose nested
 * overlay is not itself a `Modal` passes `isSuspended`, and while that returns
 * true the shell stops answering Escape, the backdrop, and Tab.
 *
 * Compose it: `<Modal><ModalHeader /><ModalBody /><ModalFooter /></Modal>`.
 * The body is always the only scroll region; the footer is optional and
 * omitted when the content owns its own actions.
 */

/**
 * The widths and the height cap are the Owner's, set in Admin > Modals and
 * applied by `SiteDimensionStyle` against the `data-modal-size` tag below -
 * a media query cannot live in an inline style, and a dialog is a full-width
 * sheet on a phone whatever the desktop width says.
 */

const FOCUSABLE_SELECTOR =
  "a[href], button:not([disabled]), input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/** Keyboard-reachable controls inside `root`, in DOM order, skipping sr-only inputs. */
function focusableWithin(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    element => !element.classList.contains("sr-only") && !element.hasAttribute("hidden"),
  );
}

/**
 * Water seen from above: a light blue wash, rings spreading from a point the
 * way they do when something lands in still water, and a few painted streaks
 * across them.
 *
 * It fills the panel behind the body of a dialog that is an invitation rather
 * than a form to get through. The wash stays pale and the rings stay thin, so
 * dark text on top keeps its full contrast.
 */
function WaterSketch() {
  const rings = [
    { rx: 34, dy: 0, width: 2.4, opacity: 0.5 },
    { rx: 62, dy: -3, width: 1.8, opacity: 0.42 },
    { rx: 96, dy: -7, width: 2.6, opacity: 0.34 },
    { rx: 134, dy: -12, width: 1.6, opacity: 0.28 },
    { rx: 176, dy: -18, width: 3, opacity: 0.22 },
    { rx: 222, dy: -25, width: 1.8, opacity: 0.16 },
    { rx: 272, dy: -33, width: 2.6, opacity: 0.12 },
  ];
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <defs>
          <linearGradient id="modal-water-wash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6fbfe" />
            <stop offset="0.45" stopColor="#e7f3fb" />
            <stop offset="1" stopColor="#d5e9f7" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#modal-water-wash)" />
        {/* The rings: white where the light catches the crest, blue in the trough. */}
        <g fill="none" transform="translate(196 214)">
          {rings.map(ring => <g key={ring.rx}>
            <ellipse cx="0" cy={ring.dy} rx={ring.rx} ry={ring.rx * 0.42} stroke="#ffffff" strokeWidth={ring.width} opacity={ring.opacity} />
            <ellipse cx="0" cy={ring.dy + ring.width * 1.6} rx={ring.rx} ry={ring.rx * 0.42} stroke="#5aa3d8" strokeWidth={ring.width * 0.7} opacity={ring.opacity * 0.38} />
          </g>)}
        </g>
        {/* Brushed streaks across the surface, thin and broken like a dry brush. */}
        <g fill="none" strokeLinecap="round" stroke="#ffffff" opacity=".5">
          <path d="M-10 96 C 70 82, 140 104, 230 88 S 350 70, 420 84" strokeWidth="3" strokeDasharray="130 34 190 40" />
          <path d="M-10 268 C 90 250, 160 276, 250 258 S 356 240, 420 254" strokeWidth="4" strokeDasharray="150 38 160 30" />
        </g>
        <g fill="none" strokeLinecap="round" stroke="#3f8fc9" opacity=".18">
          <path d="M-10 128 C 80 112, 150 134, 240 118 S 352 100, 420 114" strokeWidth="2" strokeDasharray="90 40 150 46" />
          <path d="M-10 292 C 96 274, 168 298, 258 282 S 358 264, 420 278" strokeWidth="2.5" strokeDasharray="120 44 130 38" />
        </g>
      </svg>
    </span>
  );
}

type ModalContextValue = { titleId: string; onClose: () => void; busy: boolean; decorated: boolean };
const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext(component: string): ModalContextValue {
  const value = useContext(ModalContext);
  if (!value) throw new Error(`<${component}> must be rendered inside <Modal>.`);
  return value;
}

export function Modal({
  size = "md",
  onClose,
  busy = false,
  isSuspended,
  panelTestId,
  decor,
  children,
}: {
  size?: ModalSize;
  onClose: () => void;
  /** `water` puts a water sketch behind the body. For a dialog that invites, not one that collects. */
  decor?: "water";
  /** A submit is in flight: Escape and the backdrop stop closing the dialog. */
  busy?: boolean;
  /** A nested non-Modal overlay owns the keyboard right now (e.g. the photo cropper). */
  isSuspended?: () => boolean;
  /** `data-testid` for the panel — for a dialog another overlay looks up by test id. */
  panelTestId?: string;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock();

  // Read through a ref so the keydown listener stays subscribed once while the
  // guard it consults is always current.
  const guardRef = useRef<() => boolean>(() => false);
  guardRef.current = () => busy || Boolean(isSuspended?.());

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !guardRef.current()) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Land on the first real field, not the header Close button.
    const body = panelRef.current?.querySelector<HTMLElement>("[data-modal-body]") ?? null;
    (focusableWithin(body)[0] ?? focusableWithin(panelRef.current)[0] ?? panelRef.current)?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  const onPanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || guardRef.current()) return;
    const panel = panelRef.current;
    const focusable = focusableWithin(panel);
    if (!panel || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey && (active === first || !panel.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  };

  // Closes on a click that lands on the backdrop itself; the panel stops its
  // own clicks from reaching here. Guarded exactly like Escape.
  const onBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !guardRef.current()) onClose();
  };

  return (
    <ModalContext.Provider value={{ titleId, onClose, busy, decorated: decor === "water" }}>
      <div
        onClick={onBackdropClick}
        data-modal-backdrop=""
        className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 animate-in fade-in motion-reduce:animate-none sm:items-center sm:p-6"
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          data-testid={panelTestId}
          data-modal-size={size}
          tabIndex={-1}
          onClick={event => event.stopPropagation()}
          onKeyDown={onPanelKeyDown}
          className={cn(
            "relative flex max-h-[92vh] w-full flex-col overflow-hidden border border-j-border bg-background text-j-ink focus:outline-none",
            "animate-in slide-in-from-bottom-4 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:animate-none",
            "sm:my-6 sm:zoom-in-95 sm:slide-in-from-bottom-0",
          )}
        >
          {decor === "water" ? <WaterSketch /> : null}
          {children}
        </div>
      </div>
    </ModalContext.Provider>
  );
}

export function ModalHeader({
  title,
  eyebrow,
  srPrefix,
  meta,
  action,
}: {
  title: string;
  /** Small uppercase kicker above the title. Decorative — hidden from a screen reader. */
  eyebrow?: string;
  /** Spoken before the title, so the dialog is announced as e.g. "Edit …". */
  srPrefix?: string;
  /** A muted line under the title — an id/date row, a one-line subtitle. Stays pinned with the header. */
  meta?: React.ReactNode;
  /**
   * A control beside the close button, for a dialog whose main action belongs
   * at the top rather than at the foot — a long form an Admin fills in, where
   * the foot is a scroll away.
   */
  action?: React.ReactNode;
}) {
  const { titleId, onClose, busy } = useModalContext("ModalHeader");
  return (
    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-j-border bg-background px-4 py-3 sm:px-5">
      <div className="min-w-0">
        {eyebrow ? <p aria-hidden="true" className="text-2xs font-bold uppercase tracking-[0.14em] text-j-ink-faint">{eyebrow}</p> : null}
        {/* The space sits outside the hidden span: an accessible name is built
            from trimmed text nodes, so the prefix inside it would butt against
            the title with no gap. */}
        <h2 id={titleId} className={cn("truncate text-base", tp.heading, eyebrow && "mt-0.5")}>
          {srPrefix ? <><span className="sr-only">{srPrefix}</span>{" "}</> : null}{title}
        </h2>
        {meta ? <div className="mt-1.5 text-2xs text-j-ink-muted">{meta}</div> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        <button type="button" aria-label="Close" disabled={busy} onClick={onClose} className={cn("-mr-1 shrink-0", tp.ghostIconButton)}>
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

export function ModalBody({ className, children }: { className?: string; children: React.ReactNode }) {
  // A decorated panel draws its sketch behind the body, so the body lets it
  // through; every other dialog keeps its own plain surface.
  const { decorated } = useModalContext("ModalBody");
  return (
    <div data-modal-body className={cn("relative min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5", decorated ? "bg-transparent" : "bg-background", className)}>
      {children}
    </div>
  );
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  // A footer control sized for a mouse is too small for a thumb: on a phone
  // every one of them clears 40px, whatever height the caller asked for.
  return (
    <div className="flex shrink-0 items-center justify-end gap-3 border-t border-j-border bg-background px-4 py-3 max-md:[&_a]:min-h-10 max-md:[&_button]:min-h-10 sm:px-5">
      {children}
    </div>
  );
}
