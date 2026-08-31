import React from "react";
import { ArrowRight, LockKeyhole, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import { tutorProfileResponsiveClasses } from "./TutorProfileResponsive";
import type { TutorProfileStatusCard } from "./TutorProfileStatusCard";

const PROFILE_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending: "Pending review",
  changes_requested: "Changes requested",
  approved: "Approved",
  suspended: "Suspended",
};

const TONE: Record<TutorProfileStatusCard["tone"], { card: string; pill: string; bar: string; pillText: string }> = {
  attention: { card: "border-[#f1dbaa] bg-[#fff9ed]", pill: "bg-[#fff0cf] text-[#9b6411]", bar: "bg-[#e6a23c]", pillText: "Action needed" },
  review: { card: "border-[#bfe4f6] bg-[#f0faff]", pill: "bg-white text-j-accent", bar: "bg-j-accent", pillText: "Review" },
  success: { card: "border-[#c7e7d7] bg-[#f3fbf6]", pill: "bg-[#e5f8ed] text-[#16714a]", bar: "bg-[#22a06b]", pillText: "Approved" },
};

/** Local, human-readable "last saved" string — no timezone surprises in tests. */
export function formatTutorProfileLastUpdated(value: Date | string | null | undefined) {
  if (!value) return "not saved yet";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "not saved yet" : date.toLocaleString();
}

/**
 * The single status band at the top of the Tutor Profile. Replaces what used to
 * be a hero card plus a separate "Profile review" + "System information" block:
 * one state-aware action (from `statusCard`), a completion bar, and one quiet
 * caption line with the profile status and last-saved time.
 */
export function TutorProfileStatusHeader({
  statusCard,
  completionPercentage,
  photoUrl,
  profileStatus,
  lastUpdatedAt,
  submitting,
  actionPending,
  onAction,
}: {
  statusCard: TutorProfileStatusCard;
  completionPercentage: number;
  photoUrl?: string | null;
  profileStatus: string | null | undefined;
  lastUpdatedAt: Date | string | null | undefined;
  submitting: boolean;
  actionPending: boolean;
  onAction: () => void;
}) {
  const tone = TONE[statusCard.tone];
  const statusLabel = profileStatus ? PROFILE_STATUS_LABEL[profileStatus] ?? profileStatus : null;

  return <section aria-label="Profile status" className={`${tutorProfileResponsiveClasses.completionCard} ${tone.card}`}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/70 text-[#8fb0c4] ring-1 ring-j-border">
        {photoUrl ? <img src={photoUrl} alt="Your Tutor profile photo" className="h-full w-full object-cover" /> : <UserRound size={20} aria-hidden="true" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className={`text-[15px] ${tp.heading}`}>{statusCard.title}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${tone.pill}`}>{tone.pillText}</span>
        </div>
        <p className={`mt-0.5 text-xs leading-5 ${tp.bodySoft}`}>{statusCard.description}</p>

        {statusCard.showProgress ? <div className="mt-2 flex items-center gap-2.5">
          <span
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/70 ring-1 ring-inset ring-j-border sm:max-w-[220px]"
            role="progressbar"
            aria-label="Profile completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completionPercentage}
          >
            <span className={`block h-full rounded-full ${tone.bar} transition-[width] duration-200`} style={{ width: `${completionPercentage}%` }} />
          </span>
          <span className={`shrink-0 text-[11px] font-bold ${tp.bodySoft}`}>{completionPercentage}%</span>
        </div> : null}

        {statusLabel ? <p className="mt-1.5 text-[11px] text-[#8496a6]">{statusLabel} · saved {formatTutorProfileLastUpdated(lastUpdatedAt)}</p> : null}
      </div>

      {statusCard.action !== "none" ? <div className="shrink-0 sm:pt-0.5">
        <Button
          type="button"
          disabled={submitting}
          onClick={onAction}
          className={`${tp.primaryButton} ${tutorProfileResponsiveClasses.completionActionButton} sm:w-auto`}
        >
          {statusCard.action === "submit" ? <LockKeyhole size={15} /> : null}
          {actionPending ? (statusCard.action === "save" ? "Saving…" : "Submitting…") : statusCard.actionLabel}
          {statusCard.action === "complete" ? <ArrowRight size={15} /> : null}
        </Button>
      </div> : null}
    </div>
  </section>;
}
