import { LabelIcon, RecordIcon } from "@/components/recordIcons";
import { trpc } from "@/lib/trpc";
import { formatTuitionType } from "@shared/job-card";
import {
  countTutorApplicationStages,
  filterTutorApplicationsByStage,
  tutorApplicationStages,
  type TutorApplicationStage,
} from "@shared/tutor-application-stages";
import { useMemo, useState } from "react";

type ApplicationRow = {
  interestId: number;
  status: "interested" | "shortlisted" | "declined" | "matched" | "withdrawn";
  appointmentConfirmedAt: string | Date | null;
  createdAt: string | Date;
  publicJobId: string;
  tuitionType: string;
  category: string;
  classCourse: string;
  subjects: string;
  daysPerWeek: number;
  locationLabel: string | null;
  budgetAmount: number | null;
};

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0">
    <p className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-[.12em] text-j-ink-muted">
      <LabelIcon label={label} />{label}
    </p>
    <p className="mt-1 truncate text-sm font-semibold text-j-ink">{value}</p>
  </div>;
}

export function TutorApplicationStatus() {
  const interestsQuery = trpc.jobBoard.myInterests.useQuery();
  const applications = (interestsQuery.data ?? []) as ApplicationRow[];
  const counts = useMemo(() => countTutorApplicationStages(applications), [applications]);
  const [activeStage, setActiveStage] = useState<TutorApplicationStage>("applied");
  const visible = useMemo(() => filterTutorApplicationsByStage(applications, activeStage), [applications, activeStage]);
  const activeLabel = tutorApplicationStages.find(stage => stage.key === activeStage)?.label ?? "";

  return <section>
    <div role="tablist" aria-label="Application stages" className="flex flex-wrap items-end gap-5 border-b border-[#dce9f1]">
      {tutorApplicationStages.map(stage => {
        const selected = stage.key === activeStage;
        return <button
          key={stage.key}
          type="button"
          role="tab"
          aria-selected={selected}
          onClick={() => setActiveStage(stage.key)}
          className={`relative pb-2.5 pt-1.5 text-xs font-semibold transition-colors ${selected ? "font-bold text-[#1267c8]" : "text-j-ink-muted hover:text-[#173d60]"}`}
        >
          {stage.label} <span className={`ml-1 tabular-nums ${selected ? "text-[#1267c8]" : "text-j-ink-faint"}`}>{String(counts[stage.key]).padStart(2, "0")}</span>
          {selected ? <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 rounded-t bg-[#1677e8]" /> : null}
        </button>;
      })}
    </div>

    {interestsQuery.isLoading
      ? <p className="mt-6 rounded-xl border border-j-border bg-white px-4 py-8 text-center text-sm font-semibold text-j-ink-muted">Loading your applications…</p>
      : null}

    {!interestsQuery.isLoading && interestsQuery.isError
      ? <p role="alert" className="mt-6 rounded-xl border border-j-err-border bg-j-err-wash px-4 py-8 text-center text-sm font-semibold text-j-err">Your applications could not be loaded just now. Please try again.</p>
      : null}

    {!interestsQuery.isLoading && !interestsQuery.isError && visible.length === 0
      ? <p className="mt-6 rounded-xl border border-dashed border-[#c9dce9] bg-white px-4 py-8 text-center text-sm text-j-ink-muted">
          No {activeLabel.toLowerCase()}. Your other applications are under the stages above.
        </p>
      : null}

    <ul className="mt-5 space-y-3">
      {visible.map(application => <li key={application.interestId} className="rounded-xl border border-j-border bg-white p-4 shadow-[0_10px_26px_-18px_rgba(38,83,117,0.5)] sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.16em] text-[#1680c2]">
            <RecordIcon name="jobId" size={12} className="text-[#8fb4d0]" />Job ID : {application.publicJobId}
          </p>
          <p className="flex items-center gap-1.5 text-2xs font-semibold text-j-ink-faint">
            <RecordIcon name="posted" size={12} className="text-[#8fb4d0]" />Applied : {formatDate(application.createdAt)}
          </p>
        </div>
        <h3 className="mt-1.5 text-base font-bold text-j-ink">{application.classCourse} · {application.category}</h3>
        <p className="mt-1 text-sm text-j-ink-soft">{application.subjects}</p>
        <div className="mt-4 grid gap-3 border-t border-[#e8f0f5] pt-4 sm:grid-cols-4">
          <Fact label="Tuition type" value={formatTuitionType(application.tuitionType)} />
          <Fact label="Location" value={application.locationLabel ?? "Not set"} />
          <Fact label="Days per week" value={String(application.daysPerWeek)} />
          <Fact label="Salary" value={application.budgetAmount ? `${application.budgetAmount.toLocaleString("en-US")} Taka` : "Not set"} />
        </div>
      </li>)}
    </ul>
  </section>;
}
