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
import { MapPin, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { TutorPreferenceIcon, type JobCardData } from "./JobCard";

export type JobDetailsData = JobCardData & {
  studentGender: string | null;
  daysPerWeek: number | null;
  studentCount: number | null;
  notes: string | null;
};

function Row({ label, value, muted, icon }: { label: string; value: string; muted?: boolean; icon?: React.ReactNode }) {
  return <div className="min-w-0">
    <p className="text-[11px] text-[#6c879e]">{label}</p>
    <p className={`mt-0.5 flex items-center gap-1.5 break-words text-[11px] leading-[1.5] ${muted ? "italic text-[#8ba3b6]" : "text-[#173d60]"}`}>
      {icon}{value}
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
            <h2 id="job-details-title" className="text-[13px] font-semibold leading-[1.35] text-[#173d60]">{job.title}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] tabular-nums text-[#6c879e]">
              <span>Job ID : {job.jobId}</span>
              <span aria-hidden className="text-[#dce9f1]">|</span>
              <span>Posted : {job.postedAt}</span>
              <span aria-hidden className="text-[#dce9f1]">|</span>
              <span className="font-bold">{job.statusLabel}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="grid size-7 shrink-0 place-items-center rounded-md text-[#6c879e] hover:bg-[#eef4f9] hover:text-[#173d60] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677e8]"
          ><X size={14} /></button>
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-3 px-[18px] py-4 sm:grid-cols-2">
          <Row label="Tuition Type" value={formatTuitionType(job.tuitionType)} />
          <Row label="Student Gender" value={formatStudentGender(job.studentGender)} muted={!job.studentGender} />
          <Row
            label="Preferred Tutor"
            value={formatTutorPreference(job.preferredTutorGender)}
            icon={<TutorPreferenceIcon preference={job.preferredTutorGender} className="text-[#1677e8]" />}
          />
          <Row label="Days / Week" value={formatDaysPerWeek(job.daysPerWeek)} />
          <Row label="No. of Students" value={formatStudentCount(job.studentCount)} />
          <Row label="Salary" value={formatSalaryAmount(job.budgetAmount)} muted={job.budgetAmount === null} />
          <div className="sm:col-span-2"><Row label="Subjects" value={formatSubjects(job.subjects)} /></div>
          <div className="sm:col-span-2">
            <p className="text-[11px] text-[#6c879e]">Location</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-[1.5] text-[#173d60]">
              {formatLocation({ tuitionType: job.tuitionType, locationLabel: job.locationLabel, withCountry: true })}
              {mapUrl
                ? <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#1267c8] hover:underline"><MapPin size={12} /> View on map</a>
                : null}
            </p>
          </div>
          <div className="sm:col-span-2">
            <Row label="Notes" value={formatNotes(job.notes)} muted={!job.notes?.trim()} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#dce9f1] bg-[#f1f6fa] px-[18px] py-3">
          {action}
        </div>
      </div>
    </div>
  );
}
