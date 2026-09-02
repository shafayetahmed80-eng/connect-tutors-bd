import React, { useEffect, useId, useRef } from "react";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tutorProfileTheme as tp } from "@/pages/tutorProfileTheme";

type TutorProfileSectionModalProps = {
  title: string;
  submitting?: boolean;
  notice?: { tone: "error" | "success"; text: string } | null;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
};

/**
 * The dialog's entrance timing, on the same decelerating curve the dashboard
 * sidebar animates with. Long enough to read as motion, short enough that it
 * never delays someone who came to type.
 */
const MODAL_MOTION = "duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]";

const FOCUSABLE_SELECTOR =
  "a[href], button:not([disabled]), input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/** The profile photo cropper mounts as a sibling overlay; while it is open it owns Escape and Tab. */
function photoCropperIsOpen(): boolean {
  return Boolean(document.querySelector('[data-testid="tutor-profile-photo-editor-panel"]'));
}

/** Keyboard-reachable controls inside `root`, in DOM order, skipping the sr-only file inputs. */
function focusableWithin(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    element => !element.classList.contains("sr-only") && !element.hasAttribute("hidden"),
  );
}

/**
 * Focused single-section editor. A plain overlay (not Radix) so the profile
 * photo cropper can open on top of it without a focus-trap conflict — the
 * lightweight Tab cycle here yields whenever the cropper is open.
 */
export function TutorProfileSectionModal({ title, submitting = false, notice, onClose, onSubmit, children }: TutorProfileSectionModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || submitting || photoCropperIsOpen()) return;
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, submitting]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Start on the first real field, not the header Close button or an sr-only file input.
    const firstField = focusableWithin(bodyRef.current)[0] ?? focusableWithin(panelRef.current)[0];
    firstField?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  const onPanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || photoCropperIsOpen()) return;
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

  /**
   * Closes on a click that lands on the backdrop itself.
   *
   * The panel already stopped propagation for this, but nothing ever listened,
   * so clicking away did nothing. Guarded exactly like Escape: never mid-submit,
   * and never while the photo cropper is the thing on top.
   */
  const onBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || submitting || photoCropperIsOpen()) return;
    onClose();
  };

  // A blurred, deeper scrim so the page behind reads as set aside rather than
  // merely dimmed, and the dialog's own edges stay legible against it.
  //
  // The scrim settles first and the panel follows a beat later on the same
  // decelerating curve the sidebar uses, so the dialog reads as arriving rather
  // than appearing. `motion-reduce` drops both.
  return <div onClick={onBackdropClick} className={`fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#173b60]/35 p-4 py-8 backdrop-blur-[3px] animate-in fade-in ${MODAL_MOTION} motion-reduce:animate-none sm:py-12`}>
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={`w-full max-w-[40rem] overflow-hidden rounded-2xl bg-white shadow-[0_28px_70px_-18px_rgba(23,59,96,0.35),0_0_40px_-16px_rgba(22,119,232,0.35)] ring-1 ring-[#cadff0] animate-in fade-in zoom-in-95 slide-in-from-bottom-4 delay-75 fill-mode-backwards ${MODAL_MOTION} motion-reduce:animate-none motion-reduce:delay-0`}
      onClick={event => event.stopPropagation()}
      onKeyDown={onPanelKeyDown}
    >
      {/* Three bands - header, scrolling body, actions - with the outer two
          tinted, so where the content scrolls is obvious at a glance. */}
      <div className="flex items-start justify-between gap-4 border-b-2 border-[#d3e7f6] bg-gradient-to-b from-[#f7fbfe] to-[#e9f4fc] px-4 py-3">
        <div className="min-w-0">
          <p aria-hidden="true" className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7595ad]">Edit section</p>
          {/* The eyebrow carries "Edit" visually; the heading keeps it for a
              screen reader, so the dialog is still announced as an editor. */}
          {/* The space has to sit outside the hidden span: the accessible name
              is built from trimmed text nodes, so "Edit " inside it would join
              the title with no gap. */}
          <h2 id={titleId} className={`mt-0.5 truncate text-base ${tp.heading}`}><span className="sr-only">Edit</span>{" "}{title}</h2>
        </div>
        <button
          type="button"
          aria-label="Close"
          disabled={submitting}
          onClick={onClose}
          className={`-mr-1 shrink-0 ${tp.ghostIconButton}`}
        >
          <X size={18} />
        </button>
      </div>

      <div ref={bodyRef} className="max-h-[72vh] space-y-3.5 overflow-y-auto bg-[#f4f9fd] px-4 py-4 sm:px-5">
        {notice ? <p role={notice.tone === "error" ? "alert" : "status"} aria-live="polite" className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${notice.tone === "error" ? "border-j-err-border bg-j-err-wash text-j-err" : "border-[#bde6d1] bg-[#f1fbf5] text-[#17714c]"}`}>{notice.text}</p> : null}
        {children}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-[#dfeaf2] bg-[#f8fbfd] px-4 py-3">
        <Button type="button" variant="outline" disabled={submitting} onClick={onClose} className="rounded-xl">Cancel</Button>
        <Button type="button" disabled={submitting} onClick={onSubmit} className={tp.primaryButton}>
          {submitting ? "Submitting…" : <>Submit <ArrowRight size={16} /></>}
        </Button>
      </div>
    </div>
  </div>;
}
