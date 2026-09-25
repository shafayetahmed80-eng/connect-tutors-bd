import StatusTabRow from "@/components/StatusTabRow";
import { trpc } from "@/lib/trpc";
import { formatSubjects } from "@shared/job-card";
import { jobIdForRequest } from "@shared/job-id";
import {
  countTutorApplicationStages,
  filterTutorApplicationsByStage,
  tutorApplicationStages,
  type TutorApplicationRecord,
  type TutorApplicationStage,
} from "@shared/tutor-application-stages";
import { ChevronRight } from "lucide-react";
import { LoadingCradle } from "@/components/BrandMark";
import { useState } from "react";
import { Link } from "wouter";

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

/**
 * One Tutor's applications on their Admin profile page: the job-status row
 * the Tutor Profiles list carries, counted for this Tutor alone. Choosing a
 * stage lists those applications, each leading to its tuition's applicants;
 * choosing it again closes the list.
 */
export default function AdminTutorApplications({ tutorId }: { tutorId: string }) {
  const applicationsQuery = trpc.admin.listTutorApplications.useQuery({ tutorId }, { retry: false });
  const applications = (applicationsQuery.data ?? []) as Application[];
  const counts = countTutorApplicationStages(applications);
  const [stage, setStage] = useState<TutorApplicationStage | null>(null);
  const visible = stage ? filterTutorApplicationsByStage(applications, stage) : [];
  const stageLabel = tutorApplicationStages.find(item => item.key === stage)?.label ?? "";

  return <div className="space-y-3">
    <StatusTabRow
      label="Job status"
      toggle
      items={tutorApplicationStages.map(item => ({ key: item.key, label: item.label.replace(/\s*Jobs$/, ""), wideSuffix: "Jobs", count: counts[item.key] }))}
      selected={stage}
      onSelect={setStage}
    />

    {stage ? <div className="overflow-hidden rounded-xl border border-j-border bg-white shadow-sm">
      {applicationsQuery.isLoading
        ? <p className="flex items-center justify-center px-4 py-6 text-sm text-j-ink-soft"><LoadingCradle className="mr-2" /> Loading applications…</p>
        : applicationsQuery.isError
          ? <p className="px-4 py-6 text-center text-sm text-red-800">This Tutor's applications could not be loaded.</p>
          : visible.length === 0
            ? <p className="px-4 py-6 text-center text-sm text-j-ink-muted">No {stageLabel.toLowerCase()}.</p>
            : <ul aria-label={stageLabel} className="divide-y divide-[#eef4f9]">
                {visible.map(application => <li key={application.interestId}>
                  <Link
                    href={`/admin/applied-tutors/${application.requestId}`}
                    aria-label={`Open the applicants of Job ID ${jobIdForRequest(application.requestId)}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-j-surface-sunken/60"
                  >
                    <span className="w-12 shrink-0 font-mono text-2xs text-j-ink-muted">{jobIdForRequest(application.requestId)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-j-ink">{application.classCourse} · {application.category}</span>
                      <span className="block truncate text-2xs text-j-ink-soft">{[formatSubjects(application.subjects), application.locationLabel].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="hidden shrink-0 text-2xs text-j-ink-muted sm:block">Applied {appliedOn(application.createdAt)}</span>
                    <ChevronRight size={16} className="shrink-0 text-j-accent" aria-hidden={true} />
                  </Link>
                </li>)}
              </ul>}
    </div> : null}
  </div>;
}
