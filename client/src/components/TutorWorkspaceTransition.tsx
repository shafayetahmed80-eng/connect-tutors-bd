import { LoaderCircle, Sparkles } from "lucide-react";
import React from "react";

export function TutorWorkspaceTransition() {
  return (
    <section
      aria-busy="true"
      aria-label="Preparing your Tutor workspace"
      aria-live="polite"
      className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-[#d6e9f5] bg-[#f7fbfe] px-6 py-10 text-center"
      role="status"
    >
      <div className="relative grid size-20 place-items-center" aria-hidden="true">
        <div className="absolute inset-0 rounded-full border border-[#a9d8f2] motion-safe:animate-ping motion-reduce:animate-none" />
        <div className="grid size-16 place-items-center rounded-full bg-white shadow-[0_12px_26px_rgba(36,132,200,0.16)]">
          <LoaderCircle className="size-7 text-[#147fc0] motion-safe:animate-spin motion-reduce:animate-none" />
        </div>
        <Sparkles className="absolute -right-1 -top-1 size-5 text-[#e7a528]" />
      </div>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#2782c7]">Tutor sign in complete</p>
      <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[#173b60]">Preparing your Tutor Dashboard…</h3>
      <p className="mt-2 max-w-xs text-sm leading-6 text-[#728ba0]">Loading your private workspace securely.</p>
    </section>
  );
}
