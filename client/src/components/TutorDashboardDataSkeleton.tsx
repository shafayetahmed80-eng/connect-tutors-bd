import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function TutorDashboardDataSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading Tutor Dashboard"
      aria-live="polite"
      className="relative overflow-hidden rounded-[1.75rem] border border-[#dcebf5] bg-white/90 p-5 shadow-[0_18px_45px_rgba(31,105,151,0.08)] sm:p-7"
      data-motion="shimmer"
      role="status"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#dff3ff]/70 blur-3xl" aria-hidden="true" />
      <div className="relative space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-5 w-36 rounded-full bg-[#e8f5fc]" />
            <Skeleton className="h-9 w-64 max-w-full rounded-xl bg-[#e8f5fc]" />
            <p className="text-sm font-medium text-[#6a8292]">Preparing your Tutor workspace</p>
          </div>
          <Skeleton className="hidden h-11 w-11 shrink-0 rounded-xl bg-[#e8f5fc] sm:block" />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-3 rounded-xl border border-[#e4f0f6] bg-[#f8fcfe] p-4">
              <Skeleton className="h-3 w-20 rounded-full bg-[#e8f5fc]" />
              <Skeleton className="h-8 w-16 rounded-lg bg-[#e8f5fc]" />
              <Skeleton className="h-3 w-28 max-w-full rounded-full bg-[#e8f5fc]" />
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4 rounded-xl border border-[#e4f0f6] bg-[#f8fcfe] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-32 rounded-full bg-[#e8f5fc]" />
              <Skeleton className="h-8 w-20 rounded-full bg-[#e8f5fc]" />
            </div>
            <Skeleton className="h-32 w-full rounded-xl bg-[#e8f5fc]" />
          </div>
          <div className="space-y-4 rounded-xl border border-[#e4f0f6] bg-[#f8fcfe] p-4 sm:p-5">
            <Skeleton className="h-4 w-28 rounded-full bg-[#e8f5fc]" />
            <Skeleton className="h-20 w-full rounded-xl bg-[#e8f5fc]" />
            <Skeleton className="h-3 w-3/4 rounded-full bg-[#e8f5fc]" />
          </div>
        </div>
      </div>
    </section>
  );
}
