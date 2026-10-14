import { useMemo, useState } from "react";
import { useSearch } from "wouter";
import { Clock } from "lucide-react";
import PaymentStatusPill from "@/components/PaymentStatusPill";
import { PhoneContact } from "@/components/PhoneContact";
import RecordTable, { type RecordColumn } from "@/components/RecordTable";
import { RecordIcon } from "@/components/recordIcons";
import StatusTabRow from "@/components/StatusTabRow";
import { SearchInput } from "@/components/SearchInput";
import { JobIdTag } from "@/components/JobIdTag";
import { TutorApplicationTimelineModal, type ApplicationTimelineData } from "@/components/TutorApplicationTimelineModal";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { formatSubjects, formatTuitionType } from "@shared/job-card";
import type { JobPaymentStatus } from "@shared/job-payment-status";
import {
  countTutorApplicationStages,
  filterTutorApplicationsByStage,
  isTutorApplicationStage,
  stageShowsGuardianContact,
  tutorApplicationStages,
  type TutorApplicationStage,
} from "@shared/tutor-application-stages";

type ApplicationRow = ApplicationTimelineData;

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

const notGiven = <span className="italic text-j-ink-faint">Not given</span>;

/** The Guardian's name: plain text in the headings' typeface, with no fill or border to read as a button. */
function GuardianName({ name, size }: { name: string | null | undefined; size: "table" | "card" }) {
  if (!name) return notGiven;
  return <span className={cn("break-words font-heading font-bold text-[#1680c2]", size === "card" ? "text-[13px]" : "inline-block max-w-[14rem] text-sm")}>{name}</span>;
}

/**
 * Where an appointed Tutor reaches the Guardian: name and number, the number
 * one press from a call and one from a WhatsApp chat. The labels are the Job
 * ID's blue, set in the headings' typeface. They come last on a card and in a
 * row, after everything about the tuition itself.
 */
const guardianContactColumns: RecordColumn<ApplicationRow>[] = [
  {
    key: "guardianName", label: "Guardian Name", wide: true, cardInline: true,
    labelClassName: "font-heading font-extrabold tracking-wide text-[#1680c2]",
    cell: application => <GuardianName name={application.guardianName} size="table" />,
    cardCell: application => <GuardianName name={application.guardianName} size="card" />,
  },
  {
    key: "guardianNumber", label: "Guardian Number", wide: true, cellClassName: "whitespace-nowrap", cardInline: true,
    labelClassName: "font-heading font-extrabold tracking-wide text-[#1680c2]",
    cell: application => application.guardianPhone ? <PhoneContact phone={application.guardianPhone} /> : notGiven,
    cardCell: application => application.guardianPhone ? <PhoneContact phone={application.guardianPhone} size="card" /> : notGiven,
  },
];

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
      cell: application => <PaymentStatusPill status={application.paymentStatus} />,
    },
  ];
  // Paid in full: when it was confirmed and the day the last of the fee came in. The status is always Full Paid, so it is not repeated.
  if (stage === "closed") return [
    { key: "confirmedAt", label: "Confirmation Date", cellClassName: "whitespace-nowrap", cell: application => <StageDate value={application.appointmentConfirmedAt} /> },
    { key: "closedAt", label: "Closed", cellClassName: "whitespace-nowrap", cell: application => <StageDate value={application.paymentCompletedAt ?? null} /> },
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

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTimelineApp, setSelectedTimelineApp] = useState<ApplicationRow | null>(null);

  const filteredVisible = useMemo(() => {
    if (!searchQuery.trim()) return visible;
    const q = searchQuery.toLowerCase().trim();
    return visible.filter(app => {
      const idMatch = app.publicJobId.toLowerCase().includes(q) || app.publicJobId.replace(/\D/g, "").includes(q);
      const subjectsMatch = formatSubjects(app.subjects).toLowerCase().includes(q);
      const catMatch = (app.category ?? "").toLowerCase().includes(q);
      const classMatch = (app.classCourse ?? "").toLowerCase().includes(q);
      const locMatch = (app.locationLabel ?? "").toLowerCase().includes(q);
      return idMatch || subjectsMatch || catMatch || classMatch || locMatch;
    });
  }, [visible, searchQuery]);

  // One column list in two shapes: the table a laptop has room for, and one
  // card per application on a phone, where nine columns can only be read
  // sideways. The Applied Tutors screens are built the same way.
  const columns: RecordColumn<ApplicationRow>[] = [
    {
      key: "jobId", label: "Job ID", place: "head",
      cell: application => (
        <div className="flex flex-col items-start gap-1">
          <JobIdTag bare className="text-2xs" jobId={application.publicJobId} />
          <button
            type="button"
            onClick={() => setSelectedTimelineApp(application)}
            aria-label={`View timeline for ${application.publicJobId}`}
            className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 text-2xs font-bold text-j-accent hover:bg-sky-100 transition-colors"
          >
            <Clock size={10} aria-hidden="true" />
            Timeline
          </button>
        </div>
      ),
      cardCell: application => (
        <div className="flex items-center gap-2">
          <JobIdTag className="text-xs" jobId={application.publicJobId} />
          <button
            type="button"
            onClick={() => setSelectedTimelineApp(application)}
            aria-label={`View timeline for ${application.publicJobId}`}
            className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-0.5 text-2xs font-bold text-j-accent hover:bg-sky-100 transition-colors"
          >
            <Clock size={11} aria-hidden="true" />
            Timeline
          </button>
        </div>
      ),
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
    // Last, after everything about the tuition itself: the stage's own date ends the facts, and the Guardian to call follows.
    ...(stageShowsGuardianContact(activeStage) ? guardianContactColumns : []),
  ];

  return <section>
    <StatusTabRow
      label="Application stages"
      items={tutorApplicationStages.map(stage => ({ key: stage.key, label: stage.label.replace(/\s*Jobs$/, ""), wideSuffix: "Jobs", count: counts[stage.key] }))}
      selected={activeStage}
      onSelect={key => { if (key) { setActiveStage(key); setSearchQuery(""); } }}
    />

    {interestsQuery.isLoading
      ? <p className="mt-6 rounded-xl border border-j-border bg-white px-4 py-8 text-center text-sm font-semibold text-j-ink-muted">Loading your applications…</p>
      : null}

    {!interestsQuery.isLoading && interestsQuery.isError
      ? <p role="alert" className="mt-6 rounded-xl border border-j-err-border bg-j-err-wash px-4 py-8 text-center text-sm font-semibold text-j-err">Your applications could not be loaded just now. Please try again.</p>
      : null}

    {!interestsQuery.isLoading && !interestsQuery.isError ? (
      <div className="mt-5 space-y-3">
        {applications.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="w-full sm:max-w-xs">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => setSearchQuery("")}
                placeholder="Search applications..."
                size="sm"
                variant="white"
              />
            </div>
            {searchQuery.trim() && (
              <p className="text-xs text-j-ink-muted">
                Showing {filteredVisible.length} of {visible.length} in {activeLabel.toLowerCase()}
              </p>
            )}
          </div>
        )}

        <RecordTable
          caption={`Your ${activeLabel.toLowerCase()}`}
          columns={columns}
          rows={filteredVisible}
          rowKey={application => application.interestId}
          empty={
            visible.length === 0
              ? `No ${activeLabel.toLowerCase()}. Your other applications are under the stages above.`
              : `No applications match "${searchQuery}". Clear search to view all ${activeLabel.toLowerCase()}.`
          }
          tableClassName="min-w-[64rem]"
        />
      </div>
    ) : null}

    <TutorApplicationTimelineModal
      application={selectedTimelineApp}
      onClose={() => setSelectedTimelineApp(null)}
    />
  </section>;
}
