import RecordTable, { type RecordColumn } from "@/components/RecordTable";
import { RecordIcon } from "@/components/recordIcons";
import StatusTabRow from "@/components/StatusTabRow";
import { trpc } from "@/lib/trpc";
import { formatSubjects, formatTuitionType } from "@shared/job-card";
import { jobPaymentStatusLabels, type JobPaymentStatus } from "@shared/job-payment-status";
import {
  countTutorApplicationStages,
  filterTutorApplicationsByStage,
  isTutorApplicationStage,
  tutorApplicationStages,
  type TutorApplicationStage,
} from "@shared/tutor-application-stages";
import { useMemo, useState } from "react";
import { useSearch } from "wouter";

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
  shortlistedAt: string | Date | null;
  appointedAt: string | Date | null;
  endedAt: string | Date | null;
  tuitionCancelledAt: string | Date | null;
  paymentStatus: JobPaymentStatus;
};

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatSalary(amount: number | null) {
  return amount ? `${amount.toLocaleString("en-US")} Taka` : "Not set";
}

const notRecorded = <span className="italic text-j-ink-faint">Not recorded</span>;

function StageDate({ value }: { value: string | Date | null }) {
  return value ? <span className="tabular-nums text-j-ink-strong">{formatDate(value)}</span> : notRecorded;
}

/** Owed reads warm, paid reads green, the two part-payments sit between. */
const paymentTone: Record<JobPaymentStatus, string> = {
  full_due: "border-red-200 bg-red-50 text-red-800",
  half_paid: "border-amber-200 bg-amber-50 text-amber-800",
  partial_paid: "border-sky-200 bg-sky-50 text-sky-800",
  full_paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

/**
 * Each stage carries the date it happened, and the one column that belongs to
 * it alone. A Tutor reading Confirmed Jobs wants the confirmation date and how
 * much of the fee has been paid; on Applied Jobs neither exists yet.
 */
function stageColumns(stage: TutorApplicationStage): RecordColumn<ApplicationRow>[] {
  if (stage === "shortlisted") return [{ key: "shortlistedAt", label: "Shortlisted", cellClassName: "whitespace-nowrap", cell: application => <StageDate value={application.shortlistedAt} /> }];
  if (stage === "appointed") return [{ key: "appointedAt", label: "Appointed", cellClassName: "whitespace-nowrap", cell: application => <StageDate value={application.appointedAt} /> }];
  if (stage === "confirmed") return [
    { key: "confirmedAt", label: "Confirmation Date", cellClassName: "whitespace-nowrap", cell: application => <StageDate value={application.appointmentConfirmedAt} /> },
    {
      key: "paymentStatus", label: "Payment Status", cellClassName: "whitespace-nowrap",
      cell: application => <span className={`inline-flex rounded-full border px-2.5 py-1 text-2xs font-bold ${paymentTone[application.paymentStatus]}`}>
        {jobPaymentStatusLabels[application.paymentStatus]}
      </span>,
    },
  ];
  if (stage === "cancelled") return [{ key: "cancelledAt", label: "Cancelled", cellClassName: "whitespace-nowrap", cell: application => <StageDate value={application.endedAt ?? application.tuitionCancelledAt} /> }];
  return [];
}

export function TutorApplicationStatus() {
  const interestsQuery = trpc.jobBoard.myInterests.useQuery();
  const applications = (interestsQuery.data ?? []) as ApplicationRow[];
  const counts = useMemo(() => countTutorApplicationStages(applications), [applications]);
  // The Dashboard's stage buttons open this tab on their own stage.
  const requestedStage = new URLSearchParams(useSearch()).get("stage");
  const [activeStage, setActiveStage] = useState<TutorApplicationStage>(isTutorApplicationStage(requestedStage) ? requestedStage : "applied");
  const visible = useMemo(() => filterTutorApplicationsByStage(applications, activeStage), [applications, activeStage]);
  const activeLabel = tutorApplicationStages.find(stage => stage.key === activeStage)?.label ?? "";

  // One column list in two shapes: the table a laptop has room for, and one
  // card per application on a phone, where nine columns can only be read
  // sideways. The Applied Tutors screens are built the same way.
  const columns: RecordColumn<ApplicationRow>[] = [
    {
      key: "jobId", label: "Job ID", place: "head",
      cell: application => <span className="font-mono text-2xs text-j-ink-muted">{application.publicJobId}</span>,
      cardCell: application => <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.16em] text-[#1680c2]">
        <RecordIcon name="jobId" size={12} className="text-[#8fb4d0]" />Job ID : {application.publicJobId}
      </span>,
    },
    { key: "classCourse", label: "Class / Course", cell: application => <span className="font-bold text-j-ink">{application.classCourse}</span> },
    { key: "category", label: "Category", cell: application => <span className="text-j-ink-strong">{application.category}</span> },
    { key: "subjects", label: "Subjects", wide: true, cellClassName: "max-w-[16rem]", cell: application => <span className="text-j-ink-strong">{formatSubjects(application.subjects)}</span> },
    { key: "tuitionType", label: "Tuition type", cell: application => <span className="text-j-ink-strong">{formatTuitionType(application.tuitionType)}</span> },
    { key: "location", label: "Location", cell: application => <span className="text-j-ink-strong">{application.locationLabel ?? "Not set"}</span> },
    { key: "days", label: "Days / Week", cell: application => <span className="tabular-nums text-j-ink-strong">{application.daysPerWeek}</span> },
    { key: "salary", label: "Salary", cell: application => <span className="tabular-nums text-j-ink-strong">{formatSalary(application.budgetAmount)}</span> },
    {
      key: "applied", label: "Applied", place: "head",
      cell: application => <span className="tabular-nums text-j-ink-strong">{formatDate(application.createdAt)}</span>,
      cardCell: application => <span className="flex items-center gap-1.5 text-2xs font-semibold text-j-ink-faint">
        <RecordIcon name="posted" size={12} className="text-[#8fb4d0]" />Applied : {formatDate(application.createdAt)}
      </span>,
    },
    ...stageColumns(activeStage),
  ];

  return <section>
    <StatusTabRow
      label="Application stages"
      items={tutorApplicationStages.map(stage => ({ key: stage.key, label: stage.label.replace(/\s*Jobs$/, ""), wideSuffix: "Jobs", count: counts[stage.key] }))}
      selected={activeStage}
      onSelect={key => { if (key) setActiveStage(key); }}
    />

    {interestsQuery.isLoading
      ? <p className="mt-6 rounded-xl border border-j-border bg-white px-4 py-8 text-center text-sm font-semibold text-j-ink-muted">Loading your applications…</p>
      : null}

    {!interestsQuery.isLoading && interestsQuery.isError
      ? <p role="alert" className="mt-6 rounded-xl border border-j-err-border bg-j-err-wash px-4 py-8 text-center text-sm font-semibold text-j-err">Your applications could not be loaded just now. Please try again.</p>
      : null}

    {!interestsQuery.isLoading && !interestsQuery.isError ? <div className="mt-5">
      <RecordTable
        caption={`Your ${activeLabel.toLowerCase()}`}
        columns={columns}
        rows={visible}
        rowKey={application => application.interestId}
        empty={`No ${activeLabel.toLowerCase()}. Your other applications are under the stages above.`}
        tableClassName="min-w-[64rem]"
      />
    </div> : null}
  </section>;
}
