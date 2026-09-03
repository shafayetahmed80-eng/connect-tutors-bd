import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { tutorProfileTheme as tp } from "@/pages/tutorProfileTheme";

const FOCUSABLE_SELECTOR =
  "a[href], button:not([disabled]), input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

function focusableWithin(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    element => !element.classList.contains("sr-only") && !element.hasAttribute("hidden"),
  );
}

/**
 * The shell the Hire a tutor journey lives in: a sheet that rises from the
 * bottom edge on a phone and a centred dialog from `sm` up.
 *
 * It carries a header and a scrolling body and nothing else - the journey
 * brings its own step tracker and its own Back / Continue / Send request row,
 * so a second set of actions here would compete with them.
 *
 * Built the way `TutorProfileSectionModal` is, and for the same reason: a plain
 * overlay with a light Tab cycle rather than a library focus trap, so a nested
 * overlay (a location picker, a date field) can open on top without two traps
 * fighting over the keyboard.
 *
 * Closing never discards anything. The journey saves its draft to session
 * storage as the Guardian types, so a sheet dismissed halfway reopens where it
 * was left.
 */
export function GuardianHireSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    // The page behind must not scroll under the sheet on a phone, where the
    // sheet covers most of it and the two scroll areas read as one broken one.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Land on the first field rather than the Close button.
    (focusableWithin(bodyRef.current)[0] ?? panelRef.current)?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  const onPanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = focusableWithin(panelRef.current);
    if (!panelRef.current || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !panelRef.current.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  };

  return <div
    // Only a click that lands on the backdrop itself closes; the panel stops
    // its own clicks from reaching here.
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    className="fixed inset-0 z-50 flex items-end justify-center bg-[#173b60]/35 backdrop-blur-[3px] animate-in fade-in duration-300 sm:items-start sm:overflow-y-auto sm:p-4 sm:py-8 motion-reduce:animate-none"
  >
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      onClick={event => event.stopPropagation()}
      onKeyDown={onPanelKeyDown}
      className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_28px_70px_-18px_rgba(23,59,96,0.35)] ring-1 ring-[#cadff0] focus:outline-none animate-in slide-in-from-bottom-4 duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] sm:max-h-none sm:max-w-3xl sm:rounded-2xl sm:slide-in-from-bottom-0 sm:fade-in motion-reduce:animate-none"
    >
      <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#d3e7f6] bg-gradient-to-b from-[#f7fbfe] to-[#e9f4fc] px-4 py-3 sm:px-5">
        <h2 id={titleId} className={`min-w-0 truncate text-base ${tp.heading}`}>{title}</h2>
        <button type="button" aria-label="Close" onClick={onClose} className={`-mr-1 shrink-0 ${tp.ghostIconButton}`}>
          <X size={18} />
        </button>
      </div>

      {/* The body is the only scroll area, so the header stays put while a
          long step scrolls under it. */}
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto bg-[#f4f9fd] px-4 py-4 sm:px-5">
        {children}
      </div>
    </div>
  </div>;
}
