import { trpc } from "@/lib/trpc";
import {
  countTutorApplicationStages,
  tutorApplicationStages,
  type TutorApplicationRecord,
  type TutorApplicationStage,
} from "@shared/tutor-application-stages";
import { BadgeCheck, CalendarCheck2, ChevronRight, CircleX, ListChecks, Send, type LucideIcon } from "lucide-react";
import { Link } from "wouter";

const stageLook: Record<TutorApplicationStage, { icon: LucideIcon; tile: string }> = {
  applied: { icon: Send, tile: "bg-sky-50 text-sky-700 group-hover:bg-sky-100" },
  shortlisted: { icon: ListChecks, tile: "bg-amber-50 text-amber-700 group-hover:bg-amber-100" },
  appointed: { icon: CalendarCheck2, tile: "bg-violet-50 text-violet-700 group-hover:bg-violet-100" },
  confirmed: { icon: BadgeCheck, tile: "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100" },
  cancelled: { icon: CircleX, tile: "bg-rose-50 text-rose-600 group-hover:bg-rose-100" },
};

export function tutorStatusStagePath(stage: TutorApplicationStage) {
  return `/tutor/dashboard/status?stage=${stage}`;
}

/**
 * The five buttons themselves, given their counts (or null while loading).
 *
 * One row of five at every width. On a phone each button is centred and
 * small, and its label drops the word "Jobs" - "Applied", "Shortlisted" - so
 * the five fit a 360px screen; from `sm` the icon and count spread apart and
 * the full label returns, and from `lg` the button takes its full size.
 */
export function TutorStageButtons({ counts }: { counts: Record<TutorApplicationStage, number> | null }) {
  return <nav aria-label="Application stages" className="grid grid-cols-5 gap-1 sm:gap-2.5 lg:gap-3">
    {tutorApplicationStages.map(stage => {
      const { icon: Icon, tile } = stageLook[stage.key];
      const shortLabel = stage.label.replace(/\s*Jobs$/, "");
      return <Link
        key={stage.key}
        href={tutorStatusStagePath(stage.key)}
        aria-label={`${stage.label}: ${counts ? counts[stage.key] : "loading"}`}
        className="group flex min-w-0 flex-col items-center gap-1.5 rounded-xl border border-[#dce9f1] bg-white px-0.5 py-2.5 text-center shadow-[0_1px_2px_rgba(36,86,129,.05)] transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:border-[#a9cdf0] hover:shadow-[0_12px_28px_-10px_rgba(36,86,129,.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677e8] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:items-stretch sm:gap-2.5 sm:px-3 sm:py-3 sm:text-left lg:gap-3 lg:rounded-2xl lg:p-4"
      >
        <span className="flex w-full items-center justify-center gap-1 sm:justify-between sm:gap-2">
          <span className={`grid size-6 shrink-0 place-items-center rounded-md transition-[background-color,transform] duration-300 ease-[cubic-bezier(.22,.61,.36,1)] group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 sm:size-8 sm:rounded-lg lg:size-10 lg:rounded-xl ${tile}`}>
            <Icon aria-hidden={true} className="size-3.5 sm:size-4 lg:size-[19px]" />
          </span>
          <span className="text-sm font-bold leading-none tabular-nums tracking-[-0.02em] text-j-ink sm:text-xl lg:text-2xl">
            {counts ? String(counts[stage.key]).padStart(2, "0") : "–"}
          </span>
        </span>
        <span className="flex w-full min-w-0 items-center justify-center gap-1 text-[10px] font-semibold leading-tight tracking-[-0.02em] text-j-ink-soft max-[359px]:text-[9px] sm:tracking-normal transition-colors duration-300 group-hover:text-[#1267c8] sm:justify-between sm:text-[11px] lg:text-xs">
          <span className="min-w-0 truncate sm:whitespace-normal">{shortLabel}<span className="hidden sm:inline"> Jobs</span></span>
          <ChevronRight size={14} aria-hidden={true} className="hidden shrink-0 -translate-x-1 opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none lg:block" />
        </span>
      </Link>;
    })}
  </nav>;
}

/**
 * The Dashboard's way into the Status tab: one button per application stage,
 * counted by the same rule the tab uses, each opening the tab on its stage.
 */
export function TutorDashboardStageNav() {
  const interests = trpc.jobBoard.myInterests.useQuery();
  const ready = !interests.isLoading && !interests.isError;
  return <TutorStageButtons counts={ready ? countTutorApplicationStages((interests.data ?? []) as TutorApplicationRecord[]) : null} />;
}
