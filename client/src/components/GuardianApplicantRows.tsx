import { ChevronRight } from "lucide-react";
import { Link } from "wouter";

/**
 * An applicant as a Guardian reads one: the Admin's row without the parts that
 * are the Admin's business - profile status, verification - and with the
 * mobile number held back until this Tutor is appointed. The holding back
 * happens on the server; `phoneHidden` only says it did. The arrow opens the
 * profile as a Guardian may read it, not the Admin's review page.
 */
export type GuardianApplicantRow = {
  /** The internal key: it addresses the profile page and is never shown. */
  id: string;
  /** The Tutor ID people see. */
  tutorNumber: number | null;
  name: string;
  phone: string | null;
  phoneHidden: boolean;
  instituteName: string | null;
  departmentName: string | null;
  cityLabel: string | null;
  locationLabel: string | null;
  teachingExperienceYears: number | null;
};

function Cell({ value, className = "" }: { value: string; className?: string }) {
  return <td className={`px-3 py-2.5 align-top ${className}`}>
    <span className={value ? "text-j-ink-strong" : "italic text-j-ink-faint"}>{value || "Not set"}</span>
  </td>;
}

function MobileCell({ tutor }: { tutor: GuardianApplicantRow }) {
  if (!tutor.phoneHidden) return <Cell value={tutor.phone ?? ""} className="whitespace-nowrap" />;
  return <td className="whitespace-nowrap px-3 py-2.5 align-top">
    <span className="text-j-ink-strong">+880</span>
    <span aria-hidden="true" className="ml-1 tracking-wider text-j-ink-faint">••••••••••</span>
    <span className="sr-only">, hidden</span>
  </td>;
}

export default function GuardianApplicantRows({ tutors, requestId, emptyLabel, serialFrom }: {
  tutors: GuardianApplicantRow[];
  /** The tuition these Tutors applied to; a profile is only ever opened through it. */
  requestId: number;
  emptyLabel: string;
  /** The number the first row carries: application order, continued across pages. */
  serialFrom: number;
}) {
  return <div className="overflow-x-auto rounded-xl border border-j-border bg-white shadow-sm">
    <table className="w-full min-w-[60rem] border-collapse text-sm">
      <caption className="sr-only">Tutors who applied to this tuition</caption>
      <thead>
        <tr className="border-b border-j-border text-left text-2xs font-bold uppercase tracking-wide text-j-ink-muted">
          <th scope="col" className="px-3 py-2.5">#</th>
          <th scope="col" className="px-3 py-2.5">Tutor ID</th>
          <th scope="col" className="px-3 py-2.5">Name</th>
          <th scope="col" className="px-3 py-2.5">Mobile</th>
          <th scope="col" className="px-3 py-2.5">Institute</th>
          <th scope="col" className="px-3 py-2.5">Department</th>
          <th scope="col" className="px-3 py-2.5">City</th>
          <th scope="col" className="px-3 py-2.5">Location</th>
          <th scope="col" className="px-3 py-2.5">Experience</th>
          <th scope="col" className="px-3 py-2.5"><span className="sr-only">Profile</span></th>
        </tr>
      </thead>
      <tbody>
        {tutors.map((tutor, index) => <tr key={tutor.id} className="border-b border-[#eef4f9] last:border-b-0 hover:bg-j-surface-sunken/60">
          <td className="px-3 py-2.5 align-top tabular-nums text-2xs text-j-ink-muted">{serialFrom + index}</td>
          <td className="px-3 py-2.5 align-top font-mono text-2xs text-j-ink-muted">{tutor.tutorNumber ?? <span className="font-sans italic text-j-ink-faint">Not set</span>}</td>
          <td className="px-3 py-2.5 align-top font-bold text-j-ink">{tutor.name}</td>
          <MobileCell tutor={tutor} />
          <Cell value={tutor.instituteName ?? ""} className="max-w-[16rem]" />
          <Cell value={tutor.departmentName ?? ""} className="max-w-[12rem]" />
          <Cell value={tutor.cityLabel ?? ""} />
          <Cell value={tutor.locationLabel ?? ""} />
          <Cell value={tutor.teachingExperienceYears == null ? "" : `${tutor.teachingExperienceYears} yr`} />
          <td className="px-3 py-2.5 align-top text-right">
            <Link href={`/guardian/dashboard/applied-tutors/${requestId}/${encodeURIComponent(tutor.id)}`} aria-label={`Open the profile of ${tutor.name}`} className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50">
              <ChevronRight size={16} />
            </Link>
          </td>
        </tr>)}
        {tutors.length === 0 ? <tr><td colSpan={10} className="px-3 py-10 text-center text-sm text-j-ink-soft">{emptyLabel}</td></tr> : null}
      </tbody>
    </table>
  </div>;
}
