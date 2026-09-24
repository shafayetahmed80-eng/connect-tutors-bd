import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { tutorProfileResponsiveClasses } from "./TutorProfileResponsive";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";

const bar = "rounded-full bg-tp-accent-wash";

/**
 * The profile's own shape while it loads - the rail, the tab strip and two
 * cards of rows - so the page does not first render an empty profile, every
 * answer "Not given", and then fill itself in.
 */
export function TutorProfileSkeleton() {
  return <section role="status" aria-busy="true" aria-label="Loading your profile" className={tutorProfileResponsiveClasses.workspaceShell}>
    <div className={`${tutorProfileResponsiveClasses.identityRail} ${tp.card} p-5`}>
      <div className="flex items-center gap-4 lg:flex-col">
        <Skeleton className="size-24 shrink-0 rounded-full bg-tp-accent-wash sm:size-28 lg:size-32" />
        <div className="w-full space-y-2 lg:flex lg:flex-col lg:items-center">
          <Skeleton className={`h-4 w-32 ${bar}`} />
          <Skeleton className={`h-3 w-20 ${bar}`} />
        </div>
      </div>
      <Skeleton className={`mt-5 h-1.5 w-full ${bar}`} />
      <div className="mt-5 space-y-3 max-lg:hidden">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className={`h-3 ${index % 2 ? "w-3/4" : "w-full"} ${bar}`} />)}
      </div>
    </div>
    <div className={`min-w-0 ${tp.stack}`}>
      <Skeleton className="nav-tab-outer h-11 w-full rounded-xl bg-j-surface-sunken" />
      {[6, 4].map((rows, card) => <div key={card} className={`${tp.card} ${tp.cardPad}`}>
        <Skeleton className={`h-4 w-40 ${bar}`} />
        <div className="mt-5 grid gap-x-10 gap-y-4 lg:grid-cols-2">
          {Array.from({ length: rows }, (_, index) => <div key={index} className="flex gap-3">
            <Skeleton className={`h-3 w-24 shrink-0 ${bar}`} />
            <Skeleton className={`h-3 ${index % 3 ? "w-28" : "w-40"} ${bar}`} />
          </div>)}
        </div>
      </div>)}
    </div>
    <span className="sr-only">Loading your profile…</span>
  </section>;
}
