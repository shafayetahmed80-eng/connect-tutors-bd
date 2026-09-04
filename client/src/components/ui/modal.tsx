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

type ModalContextValue = { titleId: string; onClose: () => void; busy: boolean };
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
  children,
}: {
  size?: ModalSize;
  onClose: () => void;
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
    <ModalContext.Provider value={{ titleId, onClose, busy }}>
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
            "flex max-h-[92vh] w-full flex-col overflow-hidden border border-j-border bg-background text-j-ink focus:outline-none",
            "animate-in slide-in-from-bottom-4 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:animate-none",
            "sm:my-6 sm:zoom-in-95 sm:slide-in-from-bottom-0",
          )}
        >
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
}: {
  title: string;
  /** Small uppercase kicker above the title. Decorative — hidden from a screen reader. */
  eyebrow?: string;
  /** Spoken before the title, so the dialog is announced as e.g. "Edit …". */
  srPrefix?: string;
  /** A muted line under the title — an id/date row, a one-line subtitle. Stays pinned with the header. */
  meta?: React.ReactNode;
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
      <button type="button" aria-label="Close" disabled={busy} onClick={onClose} className={cn("-mr-1 shrink-0", tp.ghostIconButton)}>
        <X size={18} />
      </button>
    </div>
  );
}

export function ModalBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div data-modal-body className={cn("min-h-0 flex-1 overflow-y-auto bg-background px-4 py-4 sm:px-5", className)}>
      {children}
    </div>
  );
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-end gap-3 border-t border-j-border bg-background px-4 py-3 sm:px-5">
      {children}
    </div>
  );
}
