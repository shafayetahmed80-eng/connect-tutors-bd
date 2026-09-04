import { ArrowRight } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { tutorProfileTheme as tp } from "@/pages/tutorProfileTheme";

type TutorProfileSectionModalProps = {
  title: string;
  submitting?: boolean;
  notice?: { tone: "error" | "success"; text: string } | null;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
};

/** The profile photo cropper mounts as a sibling overlay; while it is open it owns Escape and Tab. */
function photoCropperIsOpen(): boolean {
  return Boolean(document.querySelector('[data-testid="tutor-profile-photo-editor-panel"]'));
}

/**
 * Focused single-section editor — one thin caller of the shared `<Modal>`.
 * The only panel-specific parts are the "Edit section" framing and the
 * Cancel / Submit footer; everything else (surface, motion, focus, scroll
 * lock, the yield to the photo cropper) is the shell's.
 */
export function TutorProfileSectionModal({ title, submitting = false, notice, onClose, onSubmit, children }: TutorProfileSectionModalProps) {
  return (
    <Modal size="md" onClose={onClose} busy={submitting} isSuspended={photoCropperIsOpen}>
      <ModalHeader title={title} eyebrow="Edit section" srPrefix="Edit" />
      <ModalBody className="space-y-3.5">
        {notice ? <p role={notice.tone === "error" ? "alert" : "status"} aria-live="polite" className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${notice.tone === "error" ? "border-j-err-border bg-j-err-wash text-j-err" : "border-[#bde6d1] bg-[#f1fbf5] text-[#17714c]"}`}>{notice.text}</p> : null}
        {children}
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="outline" disabled={submitting} onClick={onClose} className="rounded-xl">Cancel</Button>
        <Button type="button" disabled={submitting} onClick={onSubmit} className={tp.primaryButton}>
          {submitting ? "Submitting…" : <>Submit <ArrowRight size={16} /></>}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
