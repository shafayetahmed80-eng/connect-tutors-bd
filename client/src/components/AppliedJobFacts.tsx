import { RecordIcon, type RecordIconName } from "@/components/recordIcons";
import { formatDaysPerWeek, formatSubjects, formatTutorPreference } from "@shared/job-card";
import { formatSalaryAmount } from "@shared/salary-amount";
import { jobIdForRequest } from "@shared/job-id";
import type { ReactNode } from "react";

/** One fact of the tuition, in the strip the applicants are read against. */
export function JobFact({ icon, value }: { icon: RecordIconName; value: string }) {
  return <span className="inline-flex min-w-0 items-center gap-1.5">
    <RecordIcon name={icon} size={12} className="shrink-0 text-[#8fb4d0]" />
    <span className="truncate text-[#173d60]">{value}</span>
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
 */
export default function AppliedJobFacts({ job, afterJobId, children }: {
  job: AppliedJobSummary;
  /** Read right after the Job ID - the Admin's Posted By. */
  afterJobId?: ReactNode;
  children?: ReactNode;
}) {
  return <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl bg-j-surface-sunken px-3.5 py-2.5 text-2xs">
    <span className="inline-flex items-center gap-1.5 font-bold text-[#173d60]">
      <RecordIcon name="jobId" size={12} className="text-[#8fb4d0]" />Job ID {jobIdForRequest(job.id)}
    </span>
    {afterJobId}
    <JobFact icon="tutorGender" value={`${formatTutorPreference(job.preferredGender)} Tutor`} />
    <JobFact icon="location" value={job.tuitionLocationLabel ?? job.locationText ?? "Online"} />
    <JobFact icon="classLevel" value={job.classCourse} />
    <JobFact icon="subjects" value={formatSubjects(job.subjects)} />
    <JobFact icon="salary" value={formatSalaryAmount(job.budgetAmount)} />
    <JobFact icon="daysPerWeek" value={formatDaysPerWeek(job.daysPerWeek)} />
    {children}
  </div>;
}
