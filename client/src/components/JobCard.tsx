import {
  buildMapsDirectionUrl,
  formatLocation,
  formatSubjects,
  formatTuitionType,
  formatTutorPreference,
} from "@shared/job-card";
import { formatSalaryAmount } from "@shared/salary-amount";
import { AlignLeft, BookOpen, House, MapPin, Wallet } from "lucide-react";

/**
 * One job, as the Guardian's Posted jobs tab and the public Job Board both show
 * it. Only the action at the foot differs, so that is a prop rather than a
 * second component - two cards for the same thing would drift apart.
 */
export type JobCardData = {
  jobId: string;
  title: string;
  postedAt: string;
  statusLabel: string;
  statusTone: "pending" | "live" | "appointed" | "confirmed" | "cancelled";
  tuitionType: string;
  budgetAmount: number | null;
  subjects: unknown;
  locationLabel: string | null;
  preferredTutorGender: string;
};

const statusToneClass: Record<JobCardData["statusTone"], string> = {
  pending: "text-[#92610b]",
  live: "text-[#0f7048]",
  appointed: "text-[#116fc4]",
  confirmed: "text-[#0f7048]",
  cancelled: "text-[#8a94a0]",
};

/**
 * Lucide carries no Mars or Venus glyph, so the three marks are drawn here: one
 * figure for a man, one with the female symbol, two for no preference. The word
 * is always beside it - the icon supports the label rather than replacing it.
 */
export function TutorPreferenceIcon({ preference, className }: { preference: string; className?: string }) {
  const shared = { width: 13, height: 13, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, className, "aria-hidden": true } as const;
  if (preference === "male") {
    return <svg {...shared}><circle cx="12" cy="7.5" r="3.4" /><path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" /></svg>;
  }
  if (preference === "female") {
    return <svg {...shared}><circle cx="12" cy="7.5" r="3.4" /><path d="M12 11v9" /><path d="M8.5 16.5h7" /></svg>;
  }
  return <svg {...shared}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><circle cx="17.5" cy="8" r="2.6" /><path d="M16 15c3 .2 5 1.9 5 5" /></svg>;
}

function Fact({ icon, label, value, muted, wide }: { icon: React.ReactNode; label: string; value: string; muted?: boolean; wide?: boolean }) {
  return <div className={`min-w-0 ${wide ? "col-span-2" : ""}`}>
    <p className="flex items-center gap-1 text-[11px] text-[#6c879e]"><span className="shrink-0 text-[#1677e8]">{icon}</span>{label}</p>
    {/* Subjects and long place names wrap onto a second line rather than being
        cut; the grid stretches every card in the row to match. */}
    <p className={`mt-0.5 break-words text-[11px] leading-[1.45] ${muted ? "italic text-[#8ba3b6]" : "text-[#173d60]"}`}>{value}</p>
  </div>;
}

export default function JobCard({ job, onOpen, action }: { job: JobCardData; onOpen: () => void; action: React.ReactNode }) {
  const salary = formatSalaryAmount(job.budgetAmount);
  const place = formatLocation({ tuitionType: job.tuitionType, locationLabel: job.locationLabel });
  const mapUrl = buildMapsDirectionUrl(job.tuitionType === "online" ? null : job.locationLabel);

  return (
    <article
      // The whole card opens the details, so it is a button to a keyboard too.
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } }}
      aria-label={`${job.title}, Job ID ${job.jobId}`}
      className="flex h-full cursor-pointer flex-col rounded-xl border border-[#dce9f1] bg-white px-4 pb-3 pt-3.5 shadow-[0_1px_2px_rgba(36,86,129,.05)] transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(.23,1,.32,1)] hover:-translate-y-[3px] hover:border-[#1677e8] hover:shadow-[0_14px_27px_rgba(36,86,129,.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677e8] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <h3 className="text-[13px] font-semibold leading-[1.35] tracking-[-.005em] text-[#173d60]">{job.title}</h3>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] tabular-nums text-[#6c879e]">
        <span>Job ID : {job.jobId}</span>
        <span aria-hidden className="text-[#dce9f1]">|</span>
        <span>Posted : {job.postedAt}</span>
        <span aria-hidden className="text-[#dce9f1]">|</span>
        <span className={`font-bold ${statusToneClass[job.statusTone]}`}>{job.statusLabel}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3">
        <Fact icon={<House size={12} />} label="Tuition Type" value={formatTuitionType(job.tuitionType)} />
        <Fact icon={<Wallet size={12} />} label="Salary" value={salary} muted={job.budgetAmount === null} />
        <Fact icon={<BookOpen size={12} />} label="Subjects" value={formatSubjects(job.subjects)} />
        <Fact icon={<MapPin size={12} />} label="Location" value={place} wide />
      </div>

      <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#6c879e]">
        <TutorPreferenceIcon preference={job.preferredTutorGender} className="text-[#1677e8]" />
        <span><strong className="font-semibold text-[#173d60]">{formatTutorPreference(job.preferredTutorGender)}</strong> tutor preferred</span>
      </p>

      {/* Pushed to the foot so every card in a row ends level. */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#eaf1f6] pt-2.5" style={{ marginTop: "auto", paddingTop: "10px" }}>
        {mapUrl
          ? <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
              onClick={event => event.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6c879e] hover:text-[#1267c8] hover:underline"
            ><MapPin size={12} /> View on map</a>
          : <span />}
        {action}
      </div>
    </article>
  );
}

/** The Guardian's action; the Job Board passes its own. */
export function DetailsAction() {
  return <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1267c8]"><AlignLeft size={12} /> Details</span>;
}
