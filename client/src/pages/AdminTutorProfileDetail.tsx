import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { SiteContentProvider } from "@/lib/siteContent";
import { trpc } from "@/lib/trpc";
import { hydrateTeachingProfile } from "./TutorProfileWorkspace";
import { getTutorProfileReadoutSections, type TutorProfileReadoutResolvers } from "./TutorProfileSectionReadout";
import { TutorProfileSummaryView } from "./TutorProfileSummaryView";
import { defaultTutorProfileFieldConfig, indexResolvedFields } from "@shared/tutor-profile-field-registry";
import { tutorSupportingDocumentLabels, type TutorSupportingDocumentType } from "@shared/tutor-documents";
import { ArrowLeft, BadgeCheck, CalendarClock, CalendarPlus, CircleAlert, FileText, IdCard, Loader2, ShieldAlert, UserRound, UserRoundCog } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";

const statusStyles: Record<string, string> = {
  draft: "bg-j-surface-muted text-j-ink-soft",
  pending: "bg-amber-50 text-amber-800",
  changes_requested: "bg-orange-50 text-orange-800",
  approved: "bg-emerald-50 text-emerald-800",
  suspended: "bg-red-50 text-red-800",
};

const recordDate = (value: Date | string | null | undefined) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

type ModerationTarget = "approved" | "changes_requested" | "suspended";

/**
 * The client's half of the lifecycle the server enforces in
 * `validateTutorModerationAction`: which decisions an Admin may take from the
 * status a profile is in right now. A status not listed here offers none.
 */
const moderationOptions: Record<string, ModerationTarget[]> = {
  draft: [],
  pending: ["approved", "changes_requested", "suspended"],
  changes_requested: [],
  approved: ["suspended"],
  suspended: [],
};

const moderationLabels: Record<ModerationTarget, string> = {
  approved: "Approve profile",
  changes_requested: "Request changes",
  suspended: "Suspend profile",
};

function DocumentTile({ label, url }: { label: string; url: string | null }) {
  return <div className="rounded-xl border border-j-border bg-j-surface-sunken p-3">
    <p className="flex items-center gap-1.5 text-2xs font-bold text-j-ink-strong"><FileText size={12} className="text-[#8fb4d0]" aria-hidden={true} />{label}</p>
    {url
      ? <a href={url} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-lg border border-j-border">
          <img src={url} alt={label} className="h-32 w-full object-cover" />
        </a>
      : <div className="mt-2 grid h-32 place-items-center rounded-lg border border-dashed border-j-field-border text-2xs text-j-ink-faint">Not uploaded</div>}
  </div>;
}

/**
 * One Tutor's whole record, as an Admin.
 *
 * The body is the very same `TutorProfileSummaryView` a Tutor sees behind
 * "View Profile" - not a copy. It can be, because `admin.getTutorProfile`
 * ships the catalog labels and the field config the shared component needs,
 * which the Tutor's screen otherwise fetches from procedures only a Tutor can
 * call. Above it sits what only an Admin gets: the identity strip, the
 * moderation decision, and the private documents.
 *
 * Moderation lives here rather than on the row because the decision is made
 * after reading the profile, and this is the screen the whole profile is on.
 */
export function AdminTutorProfileDetailContent({ tutorId }: { tutorId: string }) {
  const utils = trpc.useUtils();
  const profileQuery = trpc.admin.getTutorProfile.useQuery({ tutorId }, { retry: false });
  const profile = profileQuery.data;

  const [moderating, setModerating] = useState(false);
  const [nextStatus, setNextStatus] = useState<ModerationTarget>("approved");
  const [reason, setReason] = useState("");
  const moderation = trpc.admin.moderateTutorProfile.useMutation({
    onSuccess: () => {
      void utils.admin.getTutorProfile.invalidate({ tutorId });
      void utils.admin.listTutorDirectory.invalidate();
      setModerating(false);
      setReason("");
    },
  });

  const sections = useMemo(() => {
    if (!profile) return [];
    const labels = profile.catalogLabels;
    // Pass-through resolvers: the server already turned every id on this
    // profile into a name, so there is nothing to look up here.
    const from = (map: Record<string, string>): ((id: string) => string) => id => map[id] ?? "";
    const resolvers: TutorProfileReadoutResolvers = {
      subject: from(labels.subjects),
      classLevel: from(labels.classLevels),
      curriculum: from(labels.curricula),
      university: from(labels.universities),
      department: from(labels.facultyDepartments),
      location: from(labels.locations),
      area: from(labels.locations),
    };
    const config = profile.fieldConfig ? indexResolvedFields(profile.fieldConfig) : defaultTutorProfileFieldConfig();
    return getTutorProfileReadoutSections(hydrateTeachingProfile(profile as never, null), resolvers, config);
  }, [profile]);

  if (profileQuery.isLoading) {
    return <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading Tutor profile…</div>;
  }
  if (profileQuery.isError || !profile) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{profileQuery.error?.message ?? "This Tutor profile is unavailable."}</div>;
  }

  const supporting = Object.keys(tutorSupportingDocumentLabels) as TutorSupportingDocumentType[];
  const decisions = moderationOptions[profile.profileStatus] ?? [];

  return <div className="mx-auto w-full max-w-5xl space-y-4 pb-10">
    <Link href="/admin/tutor-profiles" className="inline-flex items-center gap-1.5 text-sm font-bold text-j-accent hover:underline">
      <ArrowLeft size={15} /> Back to Tutor Profiles
    </Link>

    {/* Identity strip - the Admin's own header above the Tutor's own view. */}
    <section className="rounded-2xl border border-j-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start gap-4">
        <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-dashed border-sky-200 bg-[#f4f9fd] text-j-ink-faint">
          {profile.profilePhotoUrl
            ? <img src={profile.profilePhotoUrl} alt={`${profile.name} profile photo`} className="size-full object-cover" />
            : <UserRound size={30} aria-hidden={true} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold tracking-[-0.02em] text-j-ink">{profile.name}</h2>
            <span className={`rounded-full px-2.5 py-1 text-2xs font-bold ${statusStyles[profile.profileStatus] ?? statusStyles.draft}`}>{profile.profileStatus.replaceAll("_", " ")}</span>
            <span className="inline-flex items-center gap-1 text-2xs font-bold text-j-ink-soft">
              {profile.verified ? <BadgeCheck size={14} className="text-emerald-600" /> : <CircleAlert size={14} className="text-amber-600" />}
              {profile.verified ? "Verified" : "Not verified"}
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-j-ink-muted">
            {/* The registered number is the Tutor ID; `tutorId` is the internal key the URL uses. */}
            {profile.tutorNumber ? <span className="inline-flex items-center gap-1"><IdCard size={13} />Tutor ID {profile.tutorNumber}</span> : null}
            <span>Profile completed: {profile.completionPercentage}%</span>
            {profile.phone ? <span>{profile.phone}</span> : null}
            {profile.contactEmail ? <span>{profile.contactEmail}</span> : null}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-j-ink-muted">
            <span className="inline-flex items-center gap-1"><CalendarPlus size={13} />Created: {recordDate(profile.createdAt)}</span>
            <span className="inline-flex items-center gap-1"><CalendarClock size={13} />Updated: {recordDate(profile.updatedAt)}</span>
          </p>
        </div>
        {decisions.length > 0
          ? <button type="button" onClick={() => { setNextStatus(decisions[0]); setReason(""); setModerating(true); }} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-j-accent px-4 text-sm font-bold text-white hover:bg-j-accent-hover">
              <UserRoundCog size={16} /> Review &amp; moderate
            </button>
          : <p className="shrink-0 rounded-xl bg-j-surface-sunken px-3 py-2 text-2xs font-medium text-j-ink-soft">No Admin status action is currently available for this profile.</p>}
      </div>
    </section>

    {/* Private documents - Admin-only signed URLs. */}
    <section className="rounded-2xl border border-j-border bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-bold tracking-[-0.02em] text-j-ink">Documents</h3>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <DocumentTile label="University ID" url={profile.documents.universityId} />
        {supporting.map(type => <DocumentTile key={type} label={tutorSupportingDocumentLabels[type]} url={profile.documents.supporting[type] ?? null} />)}
      </div>
    </section>

    {/* The Tutor's own read-only view, unchanged. */}
    <SiteContentProvider page="tutor-profile">
      <TutorProfileSummaryView sections={sections} />
    </SiteContentProvider>

    {moderating ? <Modal size="md" onClose={() => setModerating(false)} busy={moderation.isPending}>
      <ModalHeader title={`Moderate ${profile.name}`} />
      <ModalBody className="space-y-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-j-accent" />
          <p className="text-sm leading-6 text-j-ink-soft">Correction requests and suspensions require an Admin reason that is stored in the moderation history.</p>
        </div>
        <label className="block text-sm font-bold text-j-ink-strong">Next status
          <select value={nextStatus} onChange={event => setNextStatus(event.target.value as ModerationTarget)} className="mt-2 h-11 w-full rounded-xl border border-j-field-border bg-white px-3 font-normal">
            {decisions.map(status => <option key={status} value={status}>{moderationLabels[status]}</option>)}
          </select>
        </label>
        <label className="block text-sm font-bold text-j-ink-strong">Admin reason {nextStatus === "approved" ? "(optional)" : "(required)"}
          <textarea value={reason} onChange={event => setReason(event.target.value)} rows={4} placeholder={nextStatus === "approved" ? "Optional approval note" : "Explain the required correction or suspension reason"} className="mt-2 w-full rounded-xl border border-j-field-border p-3 text-sm font-normal outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100" />
        </label>
        {moderation.isError ? <p className="text-sm text-red-700">{moderation.error.message}</p> : null}
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={() => setModerating(false)} className="h-11 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Cancel</button>
        <button type="button" disabled={moderation.isPending || (nextStatus !== "approved" && !reason.trim())} onClick={() => moderation.mutate({ tutorId, nextStatus, reason: reason.trim() || undefined })} className="h-11 rounded-xl bg-j-accent px-4 text-sm font-bold text-white disabled:opacity-50">{moderation.isPending ? "Saving…" : "Save moderation"}</button>
      </ModalFooter>
    </Modal> : null}
  </div>;
}

export default function AdminTutorProfileDetail() {
  const [, params] = useRoute("/admin/tutor-profiles/:tutorId");
  const tutorId = params?.tutorId ?? "";
  return <AdminWorkspaceLayout title="Tutor Profiles">
    {tutorId ? <AdminTutorProfileDetailContent tutorId={tutorId} /> : null}
  </AdminWorkspaceLayout>;
}
