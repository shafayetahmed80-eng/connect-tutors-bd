import RecordTable, { type RecordColumn } from "@/components/RecordTable";
import { applicantActionLabels, applicantStageLabels, type ApplicantAction, type ApplicantActionOption } from "@shared/admin-applicant-actions";
import type { TutorApplicationRecord, TutorApplicationStage } from "@shared/tutor-application-stages";
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
  /** Where this application stands, by the Tutor's own rule. Applied-Tutor rows only. */
  applicationStage?: TutorApplicationStage;
  /** The application's own status, which the Action column reads. Applied-Tutor rows only. */
  applicationStatus?: TutorApplicationRecord["status"];
};

/** Approve and Decline on a row whose Guardian asked for an appointment. */
export type AdminAppointmentRequestActions = {
  busy: boolean;
  onApprove: (tutor: AdminTutorRow) => void;
  onDecline: (tutor: AdminTutorRow) => void;
};

/** The Action column on one tuition's applicants: what each row can do, and what doing it means. */
export type AdminApplicantRowActions = {
  busy: boolean;
  optionsFor: (tutor: AdminTutorRow) => ApplicantActionOption[];
  onAction: (tutor: AdminTutorRow, action: ApplicantAction) => void;
};

export type AdminTutorRowStatus = "draft" | "pending" | "changes_requested" | "approved" | "suspended";

export const adminTutorStatusStyles: Record<AdminTutorRowStatus, string> = {
  draft: "bg-j-surface-muted text-j-ink-soft",
  pending: "bg-amber-50 text-amber-800",
  changes_requested: "bg-orange-50 text-orange-800",
  approved: "bg-emerald-50 text-emerald-800",
  suspended: "bg-red-50 text-red-800",
};

const applicationStageStyles: Record<TutorApplicationStage, string> = {
  applied: "bg-j-surface-muted text-j-ink-soft",
  shortlisted: "bg-violet-50 text-violet-800",
  appointed: "bg-emerald-50 text-emerald-800",
  confirmed: "bg-indigo-50 text-indigo-800",
  cancelled: "bg-slate-100 text-slate-600",
};

const applicantActionStyles: Record<ApplicantAction, string> = {
  shortlist: "border border-j-border bg-white text-j-ink-strong hover:bg-j-surface-sunken",
  unshortlist: "border border-j-border bg-white text-j-ink-soft hover:bg-j-surface-sunken",
  appoint: "bg-j-accent text-white hover:bg-j-accent-hover",
  confirm: "bg-[#0f7048] text-white hover:bg-[#0c5b3a]",
  remove_appointed: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  remove_confirmed: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
};

const applicantActionNames: Record<ApplicantAction, (name: string) => string> = {
  shortlist: name => `Shortlist ${name}`,
  unshortlist: name => `Remove ${name} from the shortlist`,
  appoint: name => `Appoint ${name}`,
  confirm: name => `Confirm ${name}`,
  remove_appointed: name => `Remove ${name} from this tuition`,
  remove_confirmed: name => `Remove ${name} from this tuition`,
};

function Value({ value }: { value: string }) {
  return <span className={value ? "text-j-ink-strong" : "italic text-j-ink-faint"}>{value || "Not set"}</span>;
}

export default function AdminTutorRows({ tutors, caption, emptyLabel, serialFrom, showApplicationStage = false, showGuardianMarks = false, appointmentActions, applicantRowActions }: {
  tutors: AdminTutorRow[];
  caption: string;
  emptyLabel: string;
  /**
   * The number the first row carries, when the list is numbered. The
   * applied-Tutor list is: there the row number is application order, so it
   * has to continue across pages rather than restart at one.
   */
  serialFrom?: number;
  /** A column for each application's stage, on one tuition's applicants. */
  showApplicationStage?: boolean;
  /** A column for the Guardian's shortlist and appointment request, on one tuition's applicants. */
  showGuardianMarks?: boolean;
  appointmentActions?: AdminAppointmentRequestActions;
  /** The Action column on one tuition's applicants. */
  applicantRowActions?: AdminApplicantRowActions;
}) {
  const numbered = serialFrom !== undefined;
  const columns: RecordColumn<AdminTutorRow>[] = [
    ...(numbered ? [{ key: "serial", label: "#", place: "head" as const, cell: (_tutor: AdminTutorRow, index: number) => <span className="tabular-nums text-2xs text-j-ink-muted">{serialFrom + index}</span> }] : []),
    { key: "tutorNumber", label: "Tutor ID", place: "head", cell: tutor => <span className="font-mono text-2xs text-j-ink-muted">{tutor.tutorNumber ?? <span className="font-sans italic text-j-ink-faint">Not set</span>}</span> },
    { key: "name", label: "Name", place: "head", cell: tutor => <span className="font-bold text-j-ink">{tutor.name}</span> },
    { key: "phone", label: "Mobile", cellClassName: "whitespace-nowrap", cell: tutor => <Value value={tutor.phone ?? ""} /> },
    { key: "institute", label: "Institute", wide: true, cellClassName: "max-w-[16rem]", cell: tutor => <Value value={tutor.instituteName ?? ""} /> },
    { key: "department", label: "Department", cellClassName: "max-w-[12rem]", cell: tutor => <Value value={tutor.departmentName ?? ""} /> },
    { key: "city", label: "City", cell: tutor => <Value value={tutor.cityLabel ?? ""} /> },
    { key: "location", label: "Location", cell: tutor => <Value value={tutor.locationLabel ?? ""} /> },
    { key: "experience", label: "Experience", cell: tutor => <Value value={tutor.teachingExperienceYears == null ? "" : `${tutor.teachingExperienceYears} yr`} /> },
    // Status, Verified and the application stage keep their place in the table
    // and lead the card, where a row's standing is the first thing read.
    { key: "status", label: "Status", place: "head", cell: tutor => <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-2xs font-bold ${adminTutorStatusStyles[tutor.profileStatus]}`}>{tutor.profileStatus.replaceAll("_", " ")}</span> },
    { key: "verified", label: "Verified", place: "head", cell: tutor => tutor.verified ? <BadgeCheck size={16} className="text-emerald-600" aria-label="Verified" /> : <CircleAlert size={16} className="text-amber-600" aria-label="Not verified" /> },
    ...(showApplicationStage ? [{
      key: "applicationStage", label: "Application", place: "head" as const,
      cell: (tutor: AdminTutorRow) => tutor.applicationStage ? <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-2xs font-bold ${applicationStageStyles[tutor.applicationStage]}`}>{applicantStageLabels[tutor.applicationStage]}</span> : null,
    }] : []),
    ...(showGuardianMarks ? [{
      // The Guardian's own marks and the Admin's answer to them travel together.
      key: "guardian", label: "Guardian", place: "action" as const,
      cell: (tutor: AdminTutorRow) => <span className="flex flex-wrap items-center gap-1.5">
        {tutor.appointmentRequestedAt ? <span className="whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-2xs font-bold text-amber-800">Appointment requested</span> : null}
        {tutor.guardianShortlistedAt ? <span className="whitespace-nowrap rounded-full bg-sky-50 px-2.5 py-1 text-2xs font-bold text-sky-800">Shortlisted</span> : null}
        {tutor.appointmentRequestedAt && appointmentActions ? <>
          <button type="button" disabled={appointmentActions.busy} onClick={() => appointmentActions.onApprove(tutor)} aria-label={`Approve the appointment of ${tutor.name}`} className="inline-flex h-7 items-center rounded-lg bg-j-accent px-2.5 text-2xs font-bold text-white hover:bg-j-accent-hover disabled:opacity-40">Approve</button>
          <button type="button" disabled={appointmentActions.busy} onClick={() => appointmentActions.onDecline(tutor)} aria-label={`Decline the appointment request for ${tutor.name}`} className="inline-flex h-7 items-center rounded-lg border border-j-border px-2.5 text-2xs font-bold text-j-ink-soft hover:bg-j-surface-sunken disabled:opacity-40">Decline</button>
        </> : null}
      </span>,
    }] : []),
    ...(applicantRowActions ? [{
      key: "action", label: "Action", place: "action" as const,
      cell: (tutor: AdminTutorRow) => <span className="flex flex-wrap gap-1.5">
        {applicantRowActions.optionsFor(tutor).map(({ action, disabled }) => <button
          key={action}
          type="button"
          disabled={applicantRowActions.busy || disabled}
          onClick={() => applicantRowActions.onAction(tutor, action)}
          aria-label={applicantActionNames[action](tutor.name)}
          className={`inline-flex h-7 items-center whitespace-nowrap rounded-lg px-2.5 text-2xs font-bold disabled:opacity-40 ${applicantActionStyles[action]}`}
        >{applicantActionLabels[action]}</button>)}
      </span>,
    }] : []),
    {
      key: "details", label: "Details", place: "action", headingHidden: true, cellClassName: "text-right",
      cell: tutor => <Link href={`/admin/tutor-profiles/${tutor.id}`} aria-label={`Open the full profile of ${tutor.name}`} className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50">
        <ChevronRight size={16} />
      </Link>,
    },
  ];

  return <RecordTable
    caption={caption}
    columns={columns}
    rows={tutors}
    rowKey={tutor => tutor.id}
    empty={emptyLabel}
    tableClassName="min-w-[72rem]"
  />;
}
