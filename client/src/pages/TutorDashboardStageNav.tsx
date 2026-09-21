import { sidebarColourStyle } from "@/components/DashboardLayout";
import { useSiteContentColour } from "@/lib/siteContent";
import { trpc } from "@/lib/trpc";
import { sidebarColourSlotId } from "@shared/sidebar-tabs";
import {
  countTutorApplicationStages,
  tutorApplicationStages,
  type TutorApplicationRecord,
  type TutorApplicationStage,
} from "@shared/tutor-application-stages";
import { BadgeCheck, CalendarCheck2, ChevronRight, CircleX, ListChecks, Send, type LucideIcon } from "lucide-react";
import { Link } from "wouter";

const stageIcon: Record<TutorApplicationStage, LucideIcon> = {
  applied: Send,
  shortlisted: ListChecks,
  appointed: CalendarCheck2,
  confirmed: BadgeCheck,
  cancelled: CircleX,
};

export function tutorStatusStagePath(stage: TutorApplicationStage) {
  return `/tutor/dashboard/status?stage=${stage}`;
}

/**
 * The five buttons themselves, given their counts (or null while loading).
 *
 * They are one strip in the Tutor sidebar's colours, attached to one another,
 * and they follow the colours the Owner sets for that sidebar. One row of five
 * at every width. On a phone each button is centred and
 * small, and its label drops the word "Jobs" - "Applied", "Shortlisted" - so
 * the five fit a 360px screen; from `sm` the icon and count spread apart and
 * the full label returns, and from `lg` the button takes its full size.
 */
export function TutorStageButtons({ counts }: { counts: Record<TutorApplicationStage, number> | null }) {
  const colours = sidebarColourStyle({
    panel: useSiteContentColour(sidebarColourSlotId("tutor", "panel")),
    text: useSiteContentColour(sidebarColourSlotId("tutor", "text")),
    pill: useSiteContentColour(sidebarColourSlotId("tutor", "pill")),
    pillText: useSiteContentColour(sidebarColourSlotId("tutor", "pill-text")),
  });
  return <nav aria-label="Application stages" style={colours} className="sb-strip sb-panel-tutor grid grid-cols-5 overflow-hidden rounded-xl lg:rounded-2xl">
    {tutorApplicationStages.map(stage => {
      const Icon = stageIcon[stage.key];
      const shortLabel = stage.label.replace(/\s*Jobs$/, "");
      return <Link
        key={stage.key}
        href={tutorStatusStagePath(stage.key)}
        aria-label={`${stage.label}: ${counts ? counts[stage.key] : "loading"}`}
        className="sb-strip-item group flex min-w-0 flex-col items-center gap-1.5 px-0.5 py-2.5 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white motion-reduce:transition-none sm:items-stretch sm:gap-2.5 sm:px-3 sm:py-3 sm:text-left lg:gap-3 lg:p-4"
      >
        <span className="flex w-full items-center justify-center gap-1 sm:justify-between sm:gap-2">
          <span className="sb-strip-tile grid size-6 shrink-0 place-items-center rounded-md transition-transform duration-300 ease-[cubic-bezier(.22,.61,.36,1)] group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 sm:size-8 sm:rounded-lg lg:size-10 lg:rounded-xl">
            <Icon aria-hidden={true} className="size-3.5 sm:size-4 lg:size-[19px]" />
          </span>
          <span className="text-sm font-bold leading-none tabular-nums tracking-[-0.02em] sm:text-xl lg:text-2xl">
            {counts ? String(counts[stage.key]).padStart(2, "0") : "–"}
          </span>
        </span>
        <span className="sb-strip-label flex w-full min-w-0 items-center justify-center gap-1 text-[10px] font-medium leading-tight tracking-[-0.02em] max-[359px]:text-[9px] sm:justify-between sm:text-[11px] sm:tracking-normal lg:text-xs">
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
