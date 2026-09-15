import { RecordIcon, type RecordIconName } from "@/components/recordIcons";
import { formatDaysPerWeek, formatSubjects, formatTutorPreference } from "@shared/job-card";
import { formatSalaryAmount } from "@shared/salary-amount";
import { jobIdForRequest } from "@shared/job-id";
import type { ReactNode } from "react";

/**
 * One fact of the tuition, in the strip the applicants are read against.
 *
 * Below `lg` a fact wraps rather than being cut - "Mirpur, D…" said nothing -
 * and a `wide` one (a place, a mobile number) takes both columns. From `lg`
 * the strip is one flowing line again, so each fact keeps to one line there.
 */
export function JobFact({ icon, value, wide = false }: { icon: RecordIconName; value: string; wide?: boolean }) {
  return <span className={`inline-flex min-w-0 items-start gap-1.5 lg:items-center ${wide ? "col-span-2 lg:col-span-1" : ""}`}>
    <RecordIcon name={icon} size={12} className="mt-px shrink-0 text-[#8fb4d0] lg:mt-0" />
    <span className="min-w-0 break-words text-[#173d60] lg:truncate">{value}</span>
  </span>;
}

export type AppliedJobSummary = {
  id: number;
  classCourse: string;
  subjects: Parameters<typeof formatSubjects>[0];
  preferredGender: Parameters<typeof formatTutorPreference>[0];
  daysPerWeek: Parameters<typeof formatDaysPerWeek>[0];
  budgetAmount: Parameters<typeof formatSalaryAmount>[0];
  tuitionLocationLabel: string | null;
  locationText: string | null;
};

/**
 * The tuition an applicant list is read against. The Admin and the Guardian
 * see the same strip; the Admin's ends with the Guardian's own number.
 *
 * Below `lg` - a phone, or a tablet beside the sidebar - it drops under the
 * row's other controls to the full width and lays its facts out in two
 * columns; from `lg` it sits between them as one flowing line.
 */
export default function AppliedJobFacts({ job, afterJobId, children }: {
  job: AppliedJobSummary;
  /** Read right after the Job ID - the Admin's Posted By. */
  afterJobId?: ReactNode;
  children?: ReactNode;
}) {
  return <div className="order-last grid min-w-0 basis-full grid-cols-2 items-start gap-x-3 gap-y-2 rounded-xl bg-j-surface-sunken px-3.5 py-3 text-2xs lg:order-none lg:flex lg:flex-1 lg:basis-0 lg:flex-wrap lg:items-center lg:gap-x-4 lg:gap-y-1.5 lg:py-2.5">
    <span className="inline-flex items-center gap-1.5 font-bold text-[#173d60]">
      <RecordIcon name="jobId" size={12} className="text-[#8fb4d0]" />Job ID {jobIdForRequest(job.id)}
    </span>
    {afterJobId}
    <JobFact icon="tutorGender" value={`${formatTutorPreference(job.preferredGender)} Tutor`} />
    <JobFact icon="location" value={job.tuitionLocationLabel ?? job.locationText ?? "Online"} wide />
    <JobFact icon="classLevel" value={job.classCourse} />
    <JobFact icon="subjects" value={formatSubjects(job.subjects)} />
    <JobFact icon="salary" value={formatSalaryAmount(job.budgetAmount)} />
    <JobFact icon="daysPerWeek" value={formatDaysPerWeek(job.daysPerWeek)} />
    {children}
  </div>;
}
