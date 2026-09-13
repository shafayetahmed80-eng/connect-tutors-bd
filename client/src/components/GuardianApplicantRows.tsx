import { ChevronRight, Star } from "lucide-react";
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
  /** On the Guardian's own shortlist. */
  shortlisted: boolean;
  /** The Guardian asked the Admin to appoint this Tutor, and the Admin has not acted yet. */
  appointmentRequested: boolean;
  /** Appointed to this tuition. */
  appointed: boolean;
};

export type GuardianApplicantActions = {
  /** Whether an appointment may be asked for now. The server holds the same rule. */
  canRequestAppointment: boolean;
  busy: boolean;
  onShortlist: (tutor: GuardianApplicantRow, shortlisted: boolean) => void;
  onRequestAppointment: (tutor: GuardianApplicantRow) => void;
  onWithdrawAppointment: (tutor: GuardianApplicantRow) => void;
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

function ShortlistCell({ tutor, actions }: { tutor: GuardianApplicantRow; actions: GuardianApplicantActions }) {
  return <td className="px-3 py-2.5 align-top">
    <button
      type="button"
      aria-pressed={tutor.shortlisted}
      aria-label={`${tutor.shortlisted ? "Remove from shortlist" : "Shortlist"} ${tutor.name}`}
      disabled={actions.busy}
      onClick={() => actions.onShortlist(tutor, !tutor.shortlisted)}
      className={`inline-grid size-8 place-items-center rounded-lg border disabled:opacity-40 ${tutor.shortlisted ? "border-amber-200 bg-amber-50 text-amber-500" : "border-j-border text-j-ink-faint hover:text-amber-500"}`}
    >
      <Star size={16} fill={tutor.shortlisted ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  </td>;
}

function AppointmentCell({ tutor, actions }: { tutor: GuardianApplicantRow; actions: GuardianApplicantActions }) {
  let content;
  if (tutor.appointed) {
    content = <span className="inline-flex whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-2xs font-bold text-emerald-800">Appointed</span>;
  } else if (tutor.appointmentRequested) {
    content = <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-2xs font-bold text-amber-800">Requested</span>
      <button
        type="button"
        disabled={actions.busy}
        onClick={() => actions.onWithdrawAppointment(tutor)}
        aria-label={`Withdraw the appointment request for ${tutor.name}`}
        className="text-2xs font-bold text-j-ink-soft underline-offset-2 hover:underline disabled:opacity-40"
      >
        Withdraw
      </button>
    </span>;
  } else {
    content = <button
      type="button"
      disabled={actions.busy || !actions.canRequestAppointment}
      onClick={() => actions.onRequestAppointment(tutor)}
      aria-label={`Appoint ${tutor.name}`}
      className="inline-flex h-8 items-center rounded-lg bg-j-accent px-3 text-2xs font-bold text-white hover:bg-j-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
    >
      Appoint
    </button>;
  }
  return <td className="px-3 py-2.5 align-top">{content}</td>;
}

export default function GuardianApplicantRows({ tutors, requestId, emptyLabel, serialFrom, actions }: {
  tutors: GuardianApplicantRow[];
  /** The tuition these Tutors applied to; a profile is only ever opened through it. */
  requestId: number;
  emptyLabel: string;
  /** The number the first row carries: application order, continued across pages. */
  serialFrom: number;
  actions: GuardianApplicantActions;
}) {
  return <div className="overflow-x-auto rounded-xl border border-j-border bg-white shadow-sm">
    <table className="w-full min-w-[72rem] border-collapse text-sm">
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
          <th scope="col" className="px-3 py-2.5">Shortlist</th>
          <th scope="col" className="px-3 py-2.5">Appointment</th>
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
          <ShortlistCell tutor={tutor} actions={actions} />
          <AppointmentCell tutor={tutor} actions={actions} />
          <td className="px-3 py-2.5 align-top text-right">
            <Link href={`/guardian/dashboard/applied-tutors/${requestId}/${encodeURIComponent(tutor.id)}`} aria-label={`Open the profile of ${tutor.name}`} className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50">
              <ChevronRight size={16} />
            </Link>
          </td>
        </tr>)}
        {tutors.length === 0 ? <tr><td colSpan={12} className="px-3 py-10 text-center text-sm text-j-ink-soft">{emptyLabel}</td></tr> : null}
      </tbody>
    </table>
  </div>;
}
