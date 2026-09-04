import {
  buildMapsDirectionUrl,
  formatDaysPerWeek,
  formatLocation,
  formatNotes,
  formatStudentCount,
  formatStudentGender,
  formatSubjects,
  formatTuitionType,
  formatTutorPreference,
} from "@shared/job-card";
import { formatSalaryAmount } from "@shared/salary-amount";
import { AlignLeft, BookOpen, CalendarClock, CalendarDays, Hash, House, MapPin, UserRound, Users, UsersRound, Wallet, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { TutorPreferenceIcon, type JobCardData } from "./JobCard";

export type JobDetailsData = JobCardData & {
  studentGender: string | null;
  daysPerWeek: number | null;
  studentCount: number | null;
  notes: string | null;
};

/**
 * One `label | value` line of the record.
 *
 * Label and value sit side by side rather than stacked: a stacked pair reads
 * as two facts, and at this size the eye has to work out which caption belongs
 * to which line. Side by side, the labels form a column you can run down.
 *
 * A blank is grey when the question was optional and red when it was not, the
 * same distinction the Tutor profile draws between an unanswered optional
 * field and a missing required one.
 */
function Row({ label, value, muted, required, icon, valueIcon }: {
  label: string;
  value: string;
  /** The value is a blank rather than an answer. */
  muted?: boolean;
  /** A blank here is a gap in the record, not a question left unanswered. */
  required?: boolean;
  icon?: React.ReactNode;
  valueIcon?: React.ReactNode;
}) {
  const blankTone = required ? "font-medium text-j-err" : "italic text-j-ink-faint";
  return <div className="flex min-w-0 items-baseline gap-3 border-b border-[#eef4f9] py-1.5 last:border-b-0">
    <p className="flex w-[104px] shrink-0 items-center gap-1.5 text-2xs text-j-ink-muted">
      <span aria-hidden="true" className="shrink-0 text-[#8fb4d0]">{icon}</span>{label}
    </p>
    <p className={`flex min-w-0 flex-1 items-center gap-1.5 break-words text-2xs leading-[1.5] ${muted ? blankTone : "text-[#173d60]"}`}>
      {valueIcon}{value}
    </p>
  </div>;
}

/**
 * The details a job carries, in the order the Guardian asked for.
 *
 * The same dialog serves the Job Board; only the action at the foot changes.
 * The country is added here and left off the card, because the card has one
 * line for a place and the details have room to be exact.
 */
export default function JobDetailsModal({
  job,
  onClose,
  action,
  showMapLink = true,
}: {
  job: JobDetailsData;
  onClose: () => void;
  action: React.ReactNode;
  /** Off in the Guardian panel: a Guardian already knows where their own tuition is. */
  showMapLink?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const mapUrl = showMapLink ? buildMapsDirectionUrl(job.tuitionType === "online" ? null : job.locationLabel) : null;

  return (
    <div
      role="presentation"
      // Clicking the backdrop closes; clicking the panel must not, which is why
      // the panel stops the event rather than the backdrop checking its target.
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-end bg-[#0f283f]/40 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-6"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-details-title"
        tabIndex={-1}
        onClick={event => event.stopPropagation()}
        className="w-full max-h-[92vh] overflow-y-auto rounded-t-2xl bg-white shadow-[0_24px_60px_rgba(15,40,63,.3)] focus:outline-none sm:max-w-[560px] sm:rounded-2xl animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#dce9f1] px-[18px] py-4">
          <div className="min-w-0">
            <h2 id="job-details-title" className="text-sm font-semibold leading-[1.35] text-[#173d60]">{job.title}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-2xs tabular-nums text-j-ink-muted">
              <span className="inline-flex items-center gap-1"><Hash aria-hidden="true" size={11} className="text-[#8fb4d0]" />Job ID : {job.jobId}</span>
              <span aria-hidden className="text-[#dce9f1]">|</span>
              <span className="inline-flex items-center gap-1"><CalendarClock aria-hidden="true" size={11} className="text-[#8fb4d0]" />Posted : {job.postedAt}</span>
              <span aria-hidden className="text-[#dce9f1]">|</span>
              <span className="font-bold">{job.statusLabel}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="grid size-7 shrink-0 place-items-center rounded-lg text-j-ink-muted hover:bg-[#eef4f9] hover:text-[#173d60] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677e8]"
          ><X size={14} /></button>
        </div>

        <div className="grid grid-cols-1 gap-x-6 px-[18px] py-3 sm:grid-cols-2">
          <Row icon={<House size={12} />} label="Tuition Type" value={formatTuitionType(job.tuitionType)} required />
          <Row
            icon={<UserRound size={12} />}
            label="Student Gender"
            value={formatStudentGender(job.studentGender)}
            muted={!job.studentGender}
            valueIcon={job.studentGender ? <TutorPreferenceIcon preference={job.studentGender} className="text-[#1677e8]" /> : undefined}
          />
          <Row
            icon={<UsersRound size={12} />}
            label="Preferred Tutor"
            value={formatTutorPreference(job.preferredTutorGender)}
            required
            valueIcon={<TutorPreferenceIcon preference={job.preferredTutorGender} className="text-[#1677e8]" />}
          />
          <Row icon={<CalendarDays size={12} />} label="Days / Week" value={formatDaysPerWeek(job.daysPerWeek)} required />
          <Row icon={<Users size={12} />} label="No. of Students" value={formatStudentCount(job.studentCount)} required />
          <Row icon={<Wallet size={12} />} label="Salary" value={formatSalaryAmount(job.budgetAmount)} muted={job.budgetAmount === null} required />
          <div className="sm:col-span-2"><Row icon={<BookOpen size={12} />} label="Subjects" value={formatSubjects(job.subjects)} required /></div>
          <div className="sm:col-span-2">
            <div className="flex min-w-0 items-baseline gap-3 border-b border-[#eef4f9] py-1.5">
              <p className="flex w-[104px] shrink-0 items-center gap-1.5 text-2xs text-j-ink-muted">
                <span aria-hidden="true" className="shrink-0 text-[#8fb4d0]"><MapPin size={12} /></span>Location
              </p>
              <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-2xs leading-[1.5] text-[#173d60]">
                {formatLocation({ tuitionType: job.tuitionType, locationLabel: job.locationLabel, withCountry: true })}
                {mapUrl
                  ? <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#1267c8] hover:underline"><MapPin size={12} /> View on map</a>
                  : null}
              </p>
            </div>
          </div>
          <div className="sm:col-span-2">
            <Row icon={<AlignLeft size={12} />} label="Notes" value={formatNotes(job.notes)} muted={!job.notes?.trim()} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#dce9f1] bg-[#f1f6fa] px-[18px] py-3">
          {action}
        </div>
      </div>
    </div>
  );
}
