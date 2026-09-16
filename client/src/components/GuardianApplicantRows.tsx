import { ChevronRight, Star } from "lucide-react";
import { Link } from "wouter";
import { WaitingTuitionRequestMark, type WaitingTuitionRequest } from "@/components/GuardianTuitionRequestDialog";
import RecordTable, { type RecordColumn } from "@/components/RecordTable";
import TutorVerifiedBadge from "@/components/TutorVerifiedBadge";

/**
 * An applicant as a Guardian reads one: the Admin's row without the part that
 * is the Admin's business - profile status - and with the
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
  /** At least one of the Tutor's tuitions is Confirmed. */
  verified: boolean;
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
  /** The Guardian's own Confirm, Remove or Cancel request waiting on the tuition, if any. */
  tuitionRequest?: WaitingTuitionRequest;
  /** Whether the appointed Tutor can be asked about now: Appointed, with nothing waiting. The server holds the same rule. */
  canAskAboutAppointed?: boolean;
  onAskConfirm?: (tutor: GuardianApplicantRow) => void;
  onAskRemove?: (tutor: GuardianApplicantRow) => void;
  onWithdrawTuitionRequest?: () => void;
};

function Value({ value }: { value: string }) {
  return <span className={value ? "text-j-ink-strong" : "italic text-j-ink-faint"}>{value || "Not set"}</span>;
}

function MobileValue({ tutor }: { tutor: GuardianApplicantRow }) {
  if (!tutor.phoneHidden) return <Value value={tutor.phone ?? ""} />;
  return <span className="whitespace-nowrap">
    <span className="text-j-ink-strong">+880</span>
    <span aria-hidden="true" className="ml-1 tracking-wider text-j-ink-faint">••••••••••</span>
    <span className="sr-only">, hidden</span>
  </span>;
}

function ShortlistButton({ tutor, actions }: { tutor: GuardianApplicantRow; actions: GuardianApplicantActions }) {
  return <button
    type="button"
    aria-pressed={tutor.shortlisted}
    aria-label={`${tutor.shortlisted ? "Remove from shortlist" : "Shortlist"} ${tutor.name}`}
    disabled={actions.busy}
    onClick={() => actions.onShortlist(tutor, !tutor.shortlisted)}
    className={`inline-grid size-8 place-items-center rounded-lg border disabled:opacity-40 ${tutor.shortlisted ? "border-amber-200 bg-amber-50 text-amber-500" : "border-j-border text-j-ink-faint hover:text-amber-500"}`}
  >
    <Star size={16} fill={tutor.shortlisted ? "currentColor" : "none"} aria-hidden="true" />
  </button>;
}

function AppointmentControl({ tutor, actions }: { tutor: GuardianApplicantRow; actions: GuardianApplicantActions }) {
  if (tutor.appointed) {
    // After the demo class the Guardian can ask to keep this Tutor or to have them removed - one request at a time.
    const waiting = actions.tuitionRequest;
    return <span className="inline-flex flex-wrap items-center gap-2">
      <span className="inline-flex whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-2xs font-bold text-emerald-800">Appointed</span>
      {waiting && waiting.tutorId === tutor.id && actions.onWithdrawTuitionRequest
        ? <WaitingTuitionRequestMark type={waiting.type} busy={actions.busy} onWithdraw={actions.onWithdrawTuitionRequest} />
        : actions.canAskAboutAppointed && actions.onAskConfirm && actions.onAskRemove
          ? <>
              <button
                type="button"
                disabled={actions.busy}
                onClick={() => actions.onAskConfirm?.(tutor)}
                aria-label={`Ask to confirm ${tutor.name}`}
                className="inline-flex h-8 items-center rounded-lg bg-[#0f7048] px-3 text-2xs font-bold text-white hover:bg-[#0c5b3a] disabled:opacity-40"
              >Confirm</button>
              <button
                type="button"
                disabled={actions.busy}
                onClick={() => actions.onAskRemove?.(tutor)}
                aria-label={`Ask to remove ${tutor.name}`}
                className="inline-flex h-8 items-center rounded-lg border border-red-200 bg-white px-3 text-2xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-40"
              >Remove</button>
            </>
          : null}
    </span>;
  }
  if (tutor.appointmentRequested) {
    return <span className="inline-flex items-center gap-2 whitespace-nowrap">
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
  }
  return <button
    type="button"
    disabled={actions.busy || !actions.canRequestAppointment}
    onClick={() => actions.onRequestAppointment(tutor)}
    aria-label={`Appoint ${tutor.name}`}
    className="inline-flex h-8 items-center rounded-lg bg-j-accent px-3 text-2xs font-bold text-white hover:bg-j-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
  >
    Appoint
  </button>;
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
  const columns: RecordColumn<GuardianApplicantRow>[] = [
    { key: "serial", label: "#", place: "head", cell: (_tutor, index) => <span className="tabular-nums text-2xs text-j-ink-muted">{serialFrom + index}</span> },
    { key: "tutorNumber", label: "Tutor ID", place: "head", cell: tutor => <span className="font-mono text-2xs text-j-ink-muted">{tutor.tutorNumber ?? <span className="font-sans italic text-j-ink-faint">Not set</span>}</span> },
    { key: "name", label: "Name", place: "head", cell: tutor => <span className="inline-flex flex-wrap items-center gap-1.5 font-bold text-j-ink">{tutor.name}{tutor.verified ? <TutorVerifiedBadge /> : null}</span> },
    { key: "phone", label: "Mobile", cellClassName: "whitespace-nowrap", cell: tutor => <MobileValue tutor={tutor} /> },
    { key: "institute", label: "Institute", wide: true, cellClassName: "max-w-[16rem]", cell: tutor => <Value value={tutor.instituteName ?? ""} /> },
    { key: "department", label: "Department", cellClassName: "max-w-[12rem]", cell: tutor => <Value value={tutor.departmentName ?? ""} /> },
    { key: "city", label: "City", cell: tutor => <Value value={tutor.cityLabel ?? ""} /> },
    { key: "location", label: "Location", cell: tutor => <Value value={tutor.locationLabel ?? ""} /> },
    { key: "experience", label: "Experience", cell: tutor => <Value value={tutor.teachingExperienceYears == null ? "" : `${tutor.teachingExperienceYears} yr`} /> },
    { key: "shortlist", label: "Shortlist", place: "action", cell: tutor => <ShortlistButton tutor={tutor} actions={actions} /> },
    { key: "appointment", label: "Appointment", place: "action", cell: tutor => <AppointmentControl tutor={tutor} actions={actions} /> },
    {
      key: "profile", label: "Profile", place: "action", headingHidden: true, cellClassName: "text-right",
      cell: tutor => <Link href={`/guardian/dashboard/applied-tutors/${requestId}/${encodeURIComponent(tutor.id)}`} aria-label={`Open the profile of ${tutor.name}`} className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50">
        <ChevronRight size={16} />
      </Link>,
    },
  ];

  return <RecordTable
    caption="Tutors who applied to this tuition"
    columns={columns}
    rows={tutors}
    rowKey={tutor => tutor.id}
    empty={emptyLabel}
    tableClassName="min-w-[72rem]"
  />;
}
