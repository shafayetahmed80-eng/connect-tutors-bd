import React, { useEffect, useId, useRef } from "react";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type TutorProfileSectionModalProps = {
  title: string;
  submitting?: boolean;
  notice?: { tone: "error" | "success"; text: string } | null;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
};

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

  return <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0b2a44]/45 p-4 py-8 sm:py-12">
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="w-full max-w-2xl rounded-3xl bg-white shadow-[0_30px_80px_rgba(11,42,68,0.35)]"
      onClick={event => event.stopPropagation()}
      onKeyDown={onPanelKeyDown}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#e6eff4] p-5 sm:p-6">
        <h2 id={titleId} className="text-lg font-bold tracking-[-0.02em] text-[#173b60]">Edit {title}</h2>
        <button
          type="button"
          aria-label="Close"
          disabled={submitting}
          onClick={onClose}
          className="-mr-1 -mt-1 rounded-lg p-1.5 text-[#5d7b91] transition hover:bg-[#f0f5f9] hover:text-[#173b60] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167ddd] disabled:opacity-50"
        >
          <X size={18} />
        </button>
      </div>

      <div ref={bodyRef} className="max-h-[70vh] overflow-y-auto p-5 sm:p-6">
        {notice ? <p role={notice.tone === "error" ? "alert" : "status"} aria-live="polite" className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${notice.tone === "error" ? "border-[#f2c3c3] bg-[#fff6f6] text-[#a83b3b]" : "border-[#bde6d1] bg-[#f1fbf5] text-[#17714c]"}`}>{notice.text}</p> : null}
        {children}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-[#e6eff4] p-5 sm:p-6">
        <Button type="button" variant="outline" disabled={submitting} onClick={onClose} className="rounded-xl">Cancel</Button>
        <Button type="button" disabled={submitting} onClick={onSubmit} className="rounded-xl bg-[#167ddd] font-bold hover:bg-[#0e6dc2]">
          {submitting ? "Submitting…" : <>Submit <ArrowRight size={16} /></>}
        </Button>
      </div>
    </div>
  </div>;
}
