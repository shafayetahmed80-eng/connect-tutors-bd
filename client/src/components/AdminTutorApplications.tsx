import StatusTabRow from "@/components/StatusTabRow";
import { trpc } from "@/lib/trpc";
import { formatSubjects } from "@shared/job-card";
import { jobIdForRequest } from "@shared/job-id";
import {
  countTutorApplicationStages,
  filterTutorApplicationsByStage,
  getTutorApplicationStage,
  tutorApplicationStages,
  type TutorApplicationRecord,
  type TutorApplicationStage,
} from "@shared/tutor-application-stages";
import { ChevronRight } from "lucide-react";
import { LoadingCradle } from "@/components/BrandMark";
import { useState } from "react";
import { Link } from "wouter";
import { JobIdTag } from "@/components/JobIdTag";

type Application = TutorApplicationRecord & {
  interestId: number;
  requestId: number;
  createdAt: Date | string;
  classCourse: string;
  category: string;
  /** Stored as a JSON list on the job, so it is always read through `formatSubjects`. */
  subjects: unknown;
  locationLabel: string | null;
};

const appliedOn = (value: Date | string) =>
  new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const stageBadgeStyles: Record<TutorApplicationStage, string> = {
  applied: "bg-sky-50 text-sky-700 border-sky-200",
  shortlisted: "bg-purple-50 text-purple-700 border-purple-200",
  appointed: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

/**
 * One Tutor's applications on their Admin profile page: the job-status row
 * the Tutor Profiles list carries, counted for this Tutor alone. Choosing a
 * stage lists those applications, each leading to its tuition's applicants;
 * choosing it again returns to showing all applications.
 */
export default function AdminTutorApplications({ tutorId }: { tutorId: string }) {
  const applicationsQuery = trpc.admin.listTutorApplications.useQuery({ tutorId }, { retry: false });
  const applications = (applicationsQuery.data ?? []) as Application[];
  const counts = countTutorApplicationStages(applications);
  const [stage, setStage] = useState<TutorApplicationStage | null>(null);
  const visible = stage ? filterTutorApplicationsByStage(applications, stage) : applications;
  const stageLabel = stage ? (tutorApplicationStages.find(item => item.key === stage)?.label ?? "") : "All Applications";

  return <div className="space-y-3">
    <StatusTabRow
      label="Job status"
      toggle
      items={tutorApplicationStages.map(item => ({ key: item.key, label: item.label.replace(/\s*Jobs$/, ""), wideSuffix: "Jobs", count: counts[item.key] }))}
      selected={stage}
      onSelect={setStage}
    />

    <div className="overflow-hidden rounded-xl border border-j-border bg-white shadow-sm">
      {applicationsQuery.isLoading
        ? <p className="flex items-center justify-center px-4 py-6 text-sm text-j-ink-soft"><LoadingCradle className="mr-2" /> Loading applications…</p>
        : applicationsQuery.isError
          ? <p className="px-4 py-6 text-center text-sm text-red-800">This Tutor's applications could not be loaded.</p>
          : visible.length === 0
            ? <p className="px-4 py-6 text-center text-sm text-j-ink-muted">
                {stage ? `No ${stageLabel.toLowerCase()}.` : "This Tutor has not applied to any tuition jobs yet."}
              </p>
            : <ul aria-label={stageLabel} className="divide-y divide-[#eef4f9]">
                {visible.map(application => {
                  const currentStage = getTutorApplicationStage(application, { adminView: true });
                  return <li key={application.interestId}>
                    <Link
                      href={`/admin/applied-tutors/${application.requestId}`}
                      aria-label={`Open the applicants of Job ID ${jobIdForRequest(application.requestId)}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-j-surface-sunken/60"
                    >
                      <JobIdTag bare className="w-16 shrink-0 text-2xs" jobId={jobIdForRequest(application.requestId)} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-bold text-j-ink">{application.classCourse} · {application.category}</span>
                          {!stage && (
                            <span className={`rounded-full border px-2 py-0.5 text-3xs font-bold uppercase tracking-wide ${stageBadgeStyles[currentStage] ?? "bg-j-surface-sunken text-j-ink-soft border-j-border"}`}>
                              {currentStage}
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-2xs text-j-ink-soft">{[formatSubjects(application.subjects), application.locationLabel].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="hidden shrink-0 text-2xs text-j-ink-muted sm:block">Applied {appliedOn(application.createdAt)}</span>
                      <ChevronRight size={16} className="shrink-0 text-j-accent" aria-hidden={true} />
                    </Link>
                  </li>;
                })}
              </ul>}
    </div>
  </div>;
}
