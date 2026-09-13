import { BadgeCheck, ChevronRight, CircleAlert } from "lucide-react";
import { Link } from "wouter";

/**
 * A Tutor as an Admin scans one: Tutor Profiles and the applied-Tutor list of
 * one tuition show the very same row, so it lives here rather than in either
 * screen. Subjects, class levels, tuition mode and the professional headline
 * are deliberately absent - they are long, they push the identifying columns
 * off the screen, and the whole profile is one arrow away.
 */
export type AdminTutorRow = {
  /** The internal key: it addresses the profile page and is never shown. */
  id: string;
  /** The Tutor ID people see; null for a directory row that never registered. */
  tutorNumber: number | null;
  name: string;
  phone: string | null;
  instituteName: string | null;
  departmentName: string | null;
  cityLabel: string | null;
  locationLabel: string | null;
  teachingExperienceYears: number | null;
  profileStatus: AdminTutorRowStatus;
  verified: number | boolean;
};

export type AdminTutorRowStatus = "draft" | "pending" | "changes_requested" | "approved" | "suspended";

export const adminTutorStatusStyles: Record<AdminTutorRowStatus, string> = {
  draft: "bg-j-surface-muted text-j-ink-soft",
  pending: "bg-amber-50 text-amber-800",
  changes_requested: "bg-orange-50 text-orange-800",
  approved: "bg-emerald-50 text-emerald-800",
  suspended: "bg-red-50 text-red-800",
};

function Cell({ value, className = "" }: { value: string; className?: string }) {
  return <td className={`px-3 py-2.5 align-top ${className}`}>
    <span className={value ? "text-j-ink-strong" : "italic text-j-ink-faint"}>{value || "Not set"}</span>
  </td>;
}

export default function AdminTutorRows({ tutors, caption, emptyLabel, serialFrom }: {
  tutors: AdminTutorRow[];
  caption: string;
  emptyLabel: string;
  /**
   * The number the first row carries, when the list is numbered. The
   * applied-Tutor list is: there the row number is application order, so it
   * has to continue across pages rather than restart at one.
   */
  serialFrom?: number;
}) {
  const numbered = serialFrom !== undefined;
  return <div className="overflow-x-auto rounded-xl border border-j-border bg-white shadow-sm">
    <table className="w-full min-w-[72rem] border-collapse text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-j-border text-left text-2xs font-bold uppercase tracking-wide text-j-ink-muted">
          {numbered ? <th scope="col" className="px-3 py-2.5">#</th> : null}
          <th scope="col" className="px-3 py-2.5">Tutor ID</th>
          <th scope="col" className="px-3 py-2.5">Name</th>
          <th scope="col" className="px-3 py-2.5">Mobile</th>
          <th scope="col" className="px-3 py-2.5">Institute</th>
          <th scope="col" className="px-3 py-2.5">Department</th>
          <th scope="col" className="px-3 py-2.5">City</th>
          <th scope="col" className="px-3 py-2.5">Location</th>
          <th scope="col" className="px-3 py-2.5">Experience</th>
          <th scope="col" className="px-3 py-2.5">Status</th>
          <th scope="col" className="px-3 py-2.5">Verified</th>
          <th scope="col" className="px-3 py-2.5"><span className="sr-only">Details</span></th>
        </tr>
      </thead>
      <tbody>
        {tutors.map((tutor, index) => <tr key={tutor.id} className="border-b border-[#eef4f9] last:border-b-0 hover:bg-j-surface-sunken/60">
          {numbered ? <td className="px-3 py-2.5 align-top tabular-nums text-2xs text-j-ink-muted">{serialFrom + index}</td> : null}
          <td className="px-3 py-2.5 align-top font-mono text-2xs text-j-ink-muted">{tutor.tutorNumber ?? <span className="font-sans italic text-j-ink-faint">Not set</span>}</td>
          <td className="px-3 py-2.5 align-top font-bold text-j-ink">{tutor.name}</td>
          <Cell value={tutor.phone ?? ""} className="whitespace-nowrap" />
          <Cell value={tutor.instituteName ?? ""} className="max-w-[16rem]" />
          <Cell value={tutor.departmentName ?? ""} className="max-w-[12rem]" />
          <Cell value={tutor.cityLabel ?? ""} />
          <Cell value={tutor.locationLabel ?? ""} />
          <Cell value={tutor.teachingExperienceYears == null ? "" : `${tutor.teachingExperienceYears} yr`} />
          <td className="px-3 py-2.5 align-top"><span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-2xs font-bold ${adminTutorStatusStyles[tutor.profileStatus]}`}>{tutor.profileStatus.replaceAll("_", " ")}</span></td>
          <td className="px-3 py-2.5 align-top">{tutor.verified ? <BadgeCheck size={16} className="text-emerald-600" aria-label="Verified" /> : <CircleAlert size={16} className="text-amber-600" aria-label="Not verified" />}</td>
          <td className="px-3 py-2.5 align-top text-right">
            <Link href={`/admin/tutor-profiles/${tutor.id}`} aria-label={`Open the full profile of ${tutor.name}`} className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50">
              <ChevronRight size={16} />
            </Link>
          </td>
        </tr>)}
        {tutors.length === 0 ? <tr><td colSpan={numbered ? 12 : 11} className="px-3 py-10 text-center text-sm text-j-ink-soft">{emptyLabel}</td></tr> : null}
      </tbody>
    </table>
  </div>;
}
