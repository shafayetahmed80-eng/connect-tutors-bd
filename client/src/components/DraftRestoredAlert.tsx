import React from "react";
import { Sparkles, Trash2, X } from "lucide-react";

export interface DraftRestoredAlertProps {
  onClear: () => void;
  onDismiss?: () => void;
  message?: string;
  clearLabel?: string;
  className?: string;
}

export function DraftRestoredAlert({
  onClear,
  onDismiss,
  message = "আপনার পূর্বের সংরক্ষিত ড্রাফট স্বয়ংক্রিয়ভাবে লোড করা হয়েছে",
  clearLabel = "মুছে ফেলুন",
  className = "",
}: DraftRestoredAlertProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-j-accent/25 bg-j-accent/[0.08] px-3.5 py-2.5 text-xs text-j-ink shadow-sm motion-safe:animate-in motion-safe:fade-in ${className}`}
    >
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="text-j-accent shrink-0 animate-pulse" aria-hidden="true" />
        <span className="font-semibold">{message}</span>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 font-bold text-j-err hover:underline underline-offset-2 transition px-1.5 py-0.5 rounded focus:outline-none focus:ring-2 focus:ring-j-err/40"
          title="ড্রাফট মুছে ফর্ম খালি করুন"
        >
          <Trash2 size={13} aria-hidden="true" />
          <span>{clearLabel}</span>
        </button>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="text-j-ink-muted hover:text-j-ink transition p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-j-accent/40"
            aria-label="বিজ্ঞপ্তি বন্ধ করুন"
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
