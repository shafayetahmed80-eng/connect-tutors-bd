import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { SiteContentProvider } from "@/lib/siteContent";
import { trpc } from "@/lib/trpc";
import { hydrateTeachingProfile } from "./TutorProfileWorkspace";
import { getTutorProfileReadoutSections, type TutorProfileReadoutResolvers } from "./TutorProfileSectionReadout";
import { TutorProfileSummaryView } from "./TutorProfileSummaryView";
import { defaultTutorProfileFieldConfig, indexResolvedFields } from "@shared/tutor-profile-field-registry";
import { tutorSupportingDocumentLabels, type TutorSupportingDocumentType } from "@shared/tutor-documents";
import { ArrowLeft, BadgeCheck, CalendarClock, CalendarPlus, CircleAlert, FileText, IdCard, Loader2, UserRound } from "lucide-react";
import { useMemo } from "react";
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
 * call. Above it sits what only an Admin gets: the identity strip and the
 * private documents.
 */
export function AdminTutorProfileDetailContent({ tutorId }: { tutorId: string }) {
  const profileQuery = trpc.admin.getTutorProfile.useQuery({ tutorId }, { retry: false });
  const profile = profileQuery.data;

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
            <span className="inline-flex items-center gap-1"><IdCard size={13} />Tutor ID {profile.tutorId}</span>
            {profile.tutorNumber ? <span>No. {profile.tutorNumber}</span> : null}
            <span>Profile completed: {profile.completionPercentage}%</span>
            {profile.phone ? <span>{profile.phone}</span> : null}
            {profile.contactEmail ? <span>{profile.contactEmail}</span> : null}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-j-ink-muted">
            <span className="inline-flex items-center gap-1"><CalendarPlus size={13} />Created: {recordDate(profile.createdAt)}</span>
            <span className="inline-flex items-center gap-1"><CalendarClock size={13} />Updated: {recordDate(profile.updatedAt)}</span>
          </p>
        </div>
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
  </div>;
}

export default function AdminTutorProfileDetail() {
  const [, params] = useRoute("/admin/tutor-profiles/:tutorId");
  const tutorId = params?.tutorId ?? "";
  return <AdminWorkspaceLayout title="Tutor Profiles">
    {tutorId ? <AdminTutorProfileDetailContent tutorId={tutorId} /> : null}
  </AdminWorkspaceLayout>;
}
