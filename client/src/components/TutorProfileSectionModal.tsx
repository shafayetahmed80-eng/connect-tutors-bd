import { AlertCircle, ArrowRight } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { tutorProfileTheme as tp } from "@/pages/tutorProfileTheme";
import { SiteText } from "@/lib/siteContent";

type TutorProfileSectionModalProps = {
  title: string;
  submitting?: boolean;
  notice?: { tone: "error" | "success"; text: string; details?: string[] } | null;
  reReviewWarning?: string | null;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
};

/** The profile photo cropper mounts as a sibling overlay; while it is open it owns Escape and Tab. */
function photoCropperIsOpen(): boolean {
  return Boolean(document.querySelector('[data-testid="tutor-profile-photo-editor-panel"]'));
}

/**
 * Focused single-section editor — one thin caller of the shared `<Modal>`,
 * upgraded with modern mobile drawer ergonomics (drag handle, full-width thumb-friendly
 * actions, and safe-area padding).
 */
export function TutorProfileSectionModal({ title, submitting = false, notice, reReviewWarning, onClose, onSubmit, children }: TutorProfileSectionModalProps) {
  const handleSubmitWithHaptic = () => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(10);
      } catch {
        // Safe fallback
      }
    }
    onSubmit();
  };

  return (
    <Modal size="panel" onClose={onClose} busy={submitting} isSuspended={photoCropperIsOpen}>
      {/* Mobile Drawer Drag / Grab Handle */}
      <div
        data-testid="bottom-drawer-pull-handle"
        aria-hidden="true"
        className="mx-auto mt-2.5 -mb-1 h-1.5 w-12 shrink-0 rounded-full bg-slate-300 sm:hidden"
      />
      <ModalHeader title={title} eyebrow="Edit section" srPrefix="Edit" />
      <ModalBody className="space-y-3.5 overscroll-contain">
        {reReviewWarning ? (
          <div role="note" className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-xs leading-5 text-amber-900">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
            <p>{reReviewWarning}</p>
          </div>
        ) : null}
        {notice ? <div role={notice.tone === "error" ? "alert" : "status"} aria-live="polite" className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${notice.tone === "error" ? "border-j-err-border bg-j-err-wash text-tp-danger-ink" : "border-j-ok-border bg-j-ok-wash text-j-ok"}`}>
          <p>{notice.text}</p>
          {notice.details?.length ? <ul className="mt-2 list-disc space-y-1 pl-5 font-normal">{notice.details.map(detail => <li key={detail}>{detail}</li>)}</ul> : null}
        </div> : null}
        {children}
      </ModalBody>
      <ModalFooter>
        <div className="flex w-full items-center justify-end gap-2.5 max-sm:justify-between max-sm:pb-[max(0.25rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={onClose}
            className="rounded-xl max-sm:flex-1 max-sm:min-h-11 max-sm:text-sm font-medium active:scale-[0.99] transition-all"
          >
            <SiteText slotId="button-section.profile.cancel" fallback="Cancel" />
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={handleSubmitWithHaptic}
            className={`${tp.primaryButton} max-sm:flex-1 max-sm:min-h-11 max-sm:text-sm font-semibold shadow-xs active:scale-[0.99] transition-all`}
          >
            {submitting ? "Submitting…" : <><SiteText slotId="button-section.profile.submit" fallback="Submit" /> <ArrowRight size={16} /></>}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
