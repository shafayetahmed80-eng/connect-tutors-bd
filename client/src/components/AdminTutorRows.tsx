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
  /** The Guardian's own marks - applied-Tutor rows only. `profileStatus` above is unrelated. */
  guardianShortlistedAt?: Date | string | null;
  appointmentRequestedAt?: Date | string | null;
  /** The application itself, which the appointment actions act on. Applied-Tutor rows only. */
  interestId?: number;
  /** Holds this tuition's appointment. */
  appointed?: boolean;
};

/** Approve and Decline on a row whose Guardian asked for an appointment. */
export type AdminAppointmentRequestActions = {
  busy: boolean;
  onApprove: (tutor: AdminTutorRow) => void;
  onDecline: (tutor: AdminTutorRow) => void;
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

export default function AdminTutorRows({ tutors, caption, emptyLabel, serialFrom, showGuardianMarks = false, appointmentActions }: {
  tutors: AdminTutorRow[];
  caption: string;
  emptyLabel: string;
  /**
   * The number the first row carries, when the list is numbered. The
   * applied-Tutor list is: there the row number is application order, so it
   * has to continue across pages rather than restart at one.
   */
  serialFrom?: number;
  /** A column for the Guardian's shortlist and appointment request, on one tuition's applicants. */
  showGuardianMarks?: boolean;
  appointmentActions?: AdminAppointmentRequestActions;
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
          {showGuardianMarks ? <th scope="col" className="px-3 py-2.5">Guardian</th> : null}
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
          {showGuardianMarks ? <td className="px-3 py-2.5 align-top">
            <span className="flex flex-wrap items-center gap-1">
              {tutor.appointed ? <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-2xs font-bold text-emerald-800">Appointed</span> : null}
              {tutor.appointmentRequestedAt ? <span className="whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-2xs font-bold text-amber-800">Appointment requested</span> : null}
              {tutor.guardianShortlistedAt ? <span className="whitespace-nowrap rounded-full bg-sky-50 px-2.5 py-1 text-2xs font-bold text-sky-800">Shortlisted</span> : null}
            </span>
            {tutor.appointmentRequestedAt && appointmentActions ? <span className="mt-1.5 flex gap-1.5">
              <button type="button" disabled={appointmentActions.busy} onClick={() => appointmentActions.onApprove(tutor)} aria-label={`Approve the appointment of ${tutor.name}`} className="inline-flex h-7 items-center rounded-lg bg-j-accent px-2.5 text-2xs font-bold text-white hover:bg-j-accent-hover disabled:opacity-40">Approve</button>
              <button type="button" disabled={appointmentActions.busy} onClick={() => appointmentActions.onDecline(tutor)} aria-label={`Decline the appointment request for ${tutor.name}`} className="inline-flex h-7 items-center rounded-lg border border-j-border px-2.5 text-2xs font-bold text-j-ink-soft hover:bg-j-surface-sunken disabled:opacity-40">Decline</button>
            </span> : null}
          </td> : null}
          <td className="px-3 py-2.5 align-top text-right">
            <Link href={`/admin/tutor-profiles/${tutor.id}`} aria-label={`Open the full profile of ${tutor.name}`} className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50">
              <ChevronRight size={16} />
            </Link>
          </td>
        </tr>)}
        {tutors.length === 0 ? <tr><td colSpan={(numbered ? 12 : 11) + (showGuardianMarks ? 1 : 0)} className="px-3 py-10 text-center text-sm text-j-ink-soft">{emptyLabel}</td></tr> : null}
      </tbody>
    </table>
  </div>;
}
