import React from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { Briefcase, CheckCircle2, Clock, Sparkles } from "lucide-react";

export type TutorSubmissionSuccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onGoToJobBoard: () => void;
  ctaLabel?: string;
};

/**
 * Celebratory dialog shown when a tutor successfully completes and submits their
 * profile for review. Informs them that they are now eligible to apply to tuition
 * jobs on the Job Board even while admin review is pending.
 */
export function TutorSubmissionSuccessModal({
  isOpen,
  onClose,
  onGoToJobBoard,
  ctaLabel,
}: TutorSubmissionSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <Modal size="dialog" onClose={onClose}>
      <ModalHeader title="প্রোফাইল সাবমিশন সফল হয়েছে" />
      <ModalBody>
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <Sparkles className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <h3 className="text-sm font-bold">অভিনন্দন! আপনি এখন টিউশনে আবেদনের যোগ্য</h3>
              </div>
              <p className="mt-1 text-xs leading-5 text-emerald-800">
                আপনার টিউটর প্রোফাইল সফলভাবে পর্যালোচনার জন্য সাবমিট করা হয়েছে।
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-j-border bg-[#f8fafc] p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#245676]">
              <Clock className="h-4 w-4 text-[#1677e8]" aria-hidden="true" />
              <span>স্ট্যাটাস: পেন্ডিং রিভিউ (Pending Review)</span>
            </div>
            <p className="text-xs leading-5 text-j-ink-muted">
              আমাদের টিম দ্রুততম সময়ে আপনার প্রদত্ত তথ্য ও ডকুমেন্টস যাচাই করবে। তবে প্রোফাইল অনুমোদন পেন্ডিং থাকা অবস্থাতেই আপনি জব বোর্ড থেকে সরাসরি টিউশনে আবেদন করতে পারবেন।
            </p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <div className="flex w-full flex-col gap-2 sm:flex-row-reverse sm:justify-end">
          <button
            type="button"
            onClick={onGoToJobBoard}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-j-accent px-4 text-sm font-bold text-white shadow-sm hover:bg-j-accent-hover transition-colors sm:w-auto"
          >
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            <span>{ctaLabel || "জব বোর্ডে যান ও আবেদন করুন"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-j-border bg-white px-4 text-sm font-medium text-j-ink hover:bg-slate-50 transition-colors sm:w-auto"
          >
            প্রোফাইলে থাকুন
          </button>
        </div>
      </ModalFooter>
    </Modal>
  );
}

export default TutorSubmissionSuccessModal;
