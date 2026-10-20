import AccountChangeHistory from "@/components/AccountChangeHistory";
import { AdminTutorRatings } from "@/components/TutorRating";
import { AdminPasswordResetLink } from "@/components/AdminPasswordResetLink";
import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { SiteContentProvider } from "@/lib/siteContent";
import { trpc } from "@/lib/trpc";
import { hydrateTeachingProfile } from "./TutorProfileWorkspace";
import { getTutorProfileReadoutSections, type TutorProfileReadoutResolvers } from "./TutorProfileSectionReadout";
import { TutorProfileSummaryView } from "./TutorProfileSummaryView";
import { defaultTutorProfileFieldConfig, indexResolvedFields } from "@shared/tutor-profile-field-registry";
import { tutorSupportingDocumentLabels, type TutorSupportingDocumentType } from "@shared/tutor-documents";
import { ArrowRight, BadgeCheck, CalendarClock, CalendarPlus, ChevronDown, CircleAlert, Copy, FileText, Gauge, History, IdCard, Layers, Mail, MessageCircle, Phone, ShieldAlert, UserRound, UserRoundCog } from "lucide-react";
import { LoadingCradle } from "@/components/BrandMark";
import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import AdminTutorApplications from "@/components/AdminTutorApplications";
import BackLink from "@/components/BackLink";
import { TutorCvPreviewModal } from "@/components/TutorCvPreviewModal";
import { toast } from "sonner";

function formatWhatsAppUrl(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const standard = digits.startsWith("88") ? digits : digits.startsWith("0") ? `88${digits}` : `880${digits}`;
  return `https://wa.me/${standard}`;
}

export type AdminTutorDetailTabKey = "all" | "overview" | "applications" | "documents" | "profile" | "history";

export const adminTutorDetailTabs: { key: AdminTutorDetailTabKey; label: string; icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }> }[] = [
  { key: "all", label: "All Sections", icon: Layers },
  { key: "overview", label: "Overview", icon: UserRound },
  { key: "applications", label: "Applications", icon: Gauge },
  { key: "documents", label: "Documents & CV", icon: FileText },
  { key: "profile", label: "Profile Data", icon: IdCard },
  { key: "history", label: "Moderation & Logs", icon: History },
];

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
  changes_requested: ["suspended"],
  approved: ["changes_requested", "suspended"],
  // A suspension can be lifted: reinstated as it was, or sent back for changes.
  suspended: ["approved", "changes_requested"],
};

const moderationLabels: Record<ModerationTarget, string> = {
  approved: "Approve profile",
  changes_requested: "Request changes",
  suspended: "Suspend profile",
};

/** Approving a suspended profile reinstates it, so it reads that way. */
const moderationLabel = (from: string, to: ModerationTarget) =>
  from === "suspended" && to === "approved" ? "Reinstate profile" : moderationLabels[to];

function StatusPill({ status }: { status: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-2xs font-bold ${statusStyles[status] ?? statusStyles.draft}`}>{status.replaceAll("_", " ")}</span>;
}

const decidedAt = (value: Date | string) =>
  new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Every decision taken from Review & moderate on this profile, newest first:
 * when, which Admin, the move it made and the reason written with it.
 */
function ModerationHistory({ tutorId }: { tutorId: string }) {
  const history = trpc.admin.getTutorModerationHistory.useQuery({ tutorId });
  const events = history.data ?? [];
  const [isOpen, setIsOpen] = useState(true);

  return <section aria-labelledby="moderation-history-heading" className="relative rounded-xl border border-j-border bg-white p-5 shadow-sm">
    <div className="absolute right-4 top-4 sm:right-5 sm:top-5 flex items-center gap-2">
      <span className="rounded-full bg-j-surface-sunken px-2 py-0.5 text-3xs font-bold text-j-ink-soft">{events.length}</span>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Collapse moderation history" : "Expand moderation history"}
        className="inline-flex size-7 items-center justify-center rounded-lg border border-j-border text-j-ink-soft hover:bg-j-surface-sunken transition"
        title={isOpen ? "Collapse moderation history" : "Expand moderation history"}
      >
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
    </div>
    <h3 id="moderation-history-heading" className="mb-3 flex items-center gap-2 font-bold tracking-[-0.02em] text-j-ink">
      <History size={16} className="text-[#8fb4d0]" aria-hidden={true} />Moderation history
    </h3>
    {isOpen ? (
      history.isLoading
        ? <p className="flex items-center gap-2 text-sm text-j-ink-soft"><LoadingCradle /> Loading moderation history…</p>
        : history.isError
          ? <p className="text-sm text-red-700">Moderation history could not be loaded.</p>
          : events.length === 0
            ? <p className="text-sm text-j-ink-soft">No moderation decisions yet.</p>
            : <ol className="divide-y divide-[#eef4f9]">
                {events.map(event => <li key={event.id} className="grid gap-1.5 py-3 first:pt-0 last:pb-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
                  <div className="text-2xs text-j-ink-muted">
                    <time dateTime={new Date(event.createdAt).toISOString()} className="font-bold text-j-ink-strong">{decidedAt(event.createdAt)}</time>
                    <span className="block">{event.adminName ?? "Admin"}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5">
                      <StatusPill status={event.previousStatus} />
                      <ArrowRight size={13} className="text-j-ink-faint" aria-hidden={true} /><span className="sr-only">to</span>
                      <StatusPill status={event.nextStatus} />
                    </p>
                    {event.reason ? <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-j-ink-strong">{event.reason}</p> : null}
                  </div>
                </li>)}
              </ol>
    ) : null}
  </section>;
}

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
  const [cvOpen, setCvOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<ModerationTarget>("approved");
  const [reason, setReason] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTutorDetailTabKey>("all");
  const [isDocsOpen, setIsDocsOpen] = useState(true);
  const moderation = trpc.admin.moderateTutorProfile.useMutation({
    onSuccess: () => {
      void utils.admin.getTutorProfile.invalidate({ tutorId });
      void utils.admin.getTutorModerationHistory.invalidate({ tutorId });
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
    return <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><LoadingCradle className="mr-2" /> Loading Tutor profile…</div>;
  }
  if (profileQuery.isError || !profile) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{profileQuery.error?.message ?? "This Tutor profile is unavailable."}</div>;
  }

  const supporting = Object.keys(tutorSupportingDocumentLabels) as TutorSupportingDocumentType[];
  const decisions = moderationOptions[profile.profileStatus] ?? [];

  return <div className="mx-auto w-full max-w-5xl space-y-4 pb-20 sm:pb-10">
    {/* Applications is first in DOM order for document position compatibility */}
    <div className={activeTab === "all" || activeTab === "applications" ? "block" : "hidden"}>
      <AdminTutorApplications tutorId={tutorId} />
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <BackLink href="/admin/tutor-profiles">Back to Tutor Profiles</BackLink>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCvOpen(true)}
          className="inline-flex h-control items-center gap-2 rounded-xl bg-[#0d5fae] px-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0a4c8c]"
        >
          <FileText size={15} /> View Official CV
        </button>
        <Link href={`/admin/tutor-chats?tutorId=${encodeURIComponent(tutorId)}`} className="inline-flex h-control items-center gap-1.5 rounded-lg border border-j-border px-3 text-sm font-bold text-j-ink-soft hover:bg-j-surface-sunken">
          <MessageCircle size={15} /> Message
        </Link>
      </div>
    </div>

    {/* Sticky Segmented Mobile Tab HUD */}
    <nav aria-label="Profile sections" className="sticky top-0 z-20 -mx-3 mb-4 rounded-xl border border-j-border bg-white/95 p-1.5 shadow-sm backdrop-blur sm:mx-0">
      <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
        {adminTutorDetailTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                isActive
                  ? "bg-j-accent text-white shadow-xs"
                  : "text-j-ink-soft hover:bg-j-surface-sunken hover:text-j-ink"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>

    {/*
      Identity strip - the Admin's own header above the Tutor's own view.
      One grid, two shapes. On a phone the photo and the name share a row, the
      details take the full width beneath in two columns (the long phone and
      email lines span both), and the moderation action spans the card. From
      `sm` it is the wide strip: photo, then name over the details, then the
      action on the right.
    */}
    <section className={`rounded-xl border border-j-border bg-white p-4 shadow-sm sm:p-5 ${activeTab === "all" || activeTab === "overview" ? "block" : "hidden"}`}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:gap-x-4 sm:gap-y-1.5">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-dashed border-sky-200 bg-[#f4f9fd] text-j-ink-faint sm:row-span-2 sm:size-20">
          {profile.profilePhotoUrl
            ? <img src={profile.profilePhotoUrl} alt={`${profile.name} profile photo`} className="size-full object-cover" />
            : <UserRound size={28} aria-hidden={true} />}
        </span>
        <div className="min-w-0 sm:self-end">
          <h2 className="break-words text-base font-bold leading-snug tracking-[-0.02em] text-j-ink sm:text-lg">{profile.name}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusPill status={profile.profileStatus} />
            <span className="inline-flex items-center gap-1 text-2xs font-bold text-j-ink-soft">
              {profile.verified ? <BadgeCheck size={14} className="text-emerald-600" /> : <CircleAlert size={14} className="text-amber-600" />}
              {profile.verified ? "Verified" : "Not verified"}
            </span>
          </div>
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#eef4f9] pt-3 text-2xs text-j-ink-muted sm:col-span-1 sm:col-start-2 sm:flex sm:flex-wrap sm:gap-x-4 sm:gap-y-1 sm:border-0 sm:pt-0">
          {/* The registered number is the Tutor ID; `tutorId` is the internal key the URL uses. */}
          {profile.tutorNumber ? <span className="inline-flex min-w-0 items-center gap-1.5"><IdCard size={13} className="shrink-0 text-[#8fb4d0]" aria-hidden={true} />Tutor ID {profile.tutorNumber}</span> : null}
          <span className="inline-flex min-w-0 items-center gap-1.5"><Gauge size={13} className="shrink-0 text-[#8fb4d0]" aria-hidden={true} />Profile completed: {profile.completionPercentage}%</span>
          <span className="inline-flex min-w-0 items-center gap-1.5"><CalendarPlus size={13} className="shrink-0 text-[#8fb4d0]" aria-hidden={true} />Created: {recordDate(profile.createdAt)}</span>
          <span className="inline-flex min-w-0 items-center gap-1.5"><CalendarClock size={13} className="shrink-0 text-[#8fb4d0]" aria-hidden={true} />Updated: {recordDate(profile.updatedAt)}</span>
          {profile.phone ? <span className="col-span-2 inline-flex min-w-0 items-center gap-1.5"><Phone size={13} className="shrink-0 text-[#8fb4d0]" aria-hidden={true} />{profile.phone}</span> : null}
          {profile.contactEmail ? <span className="col-span-2 inline-flex min-w-0 items-center gap-1.5"><Mail size={13} className="shrink-0 text-[#8fb4d0]" aria-hidden={true} /><span className="truncate">{profile.contactEmail}</span></span> : null}
        </div>
        {decisions.length > 0
          ? <button type="button" onClick={() => { setNextStatus(decisions[0]); setReason(""); setModerating(true); }} className="col-span-2 inline-flex h-control w-full items-center justify-center gap-2 rounded-xl bg-j-accent px-4 text-sm font-bold text-white hover:bg-j-accent-hover sm:col-span-1 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:w-auto">
              <UserRoundCog size={16} /> Review &amp; moderate
            </button>
          : <p className="col-span-2 rounded-xl bg-j-surface-sunken px-3 py-2 text-2xs font-medium text-j-ink-soft sm:col-span-1 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:max-w-[16rem]">No Admin status action is currently available for this profile.</p>}

        {/* Glanceable Hero Metrics Bar */}
        <div className="col-span-2 grid grid-cols-2 gap-2 border-t border-[#eef4f9] pt-3 sm:col-span-3 sm:grid-cols-4">
          <div className="rounded-xl border border-j-border bg-j-surface-sunken p-2.5 text-center">
            <span className="block text-3xs font-bold uppercase tracking-wider text-j-ink-faint">Tutor ID</span>
            <span className="mt-0.5 block text-sm font-extrabold text-j-ink">{profile.tutorNumber ? `#${profile.tutorNumber}` : "—"}</span>
          </div>
          <div className="rounded-xl border border-j-border bg-j-surface-sunken p-2.5 text-center">
            <span className="block text-3xs font-bold uppercase tracking-wider text-j-ink-faint">Completion</span>
            <span className="mt-0.5 block text-sm font-extrabold text-j-accent">{profile.completionPercentage}%</span>
          </div>
          <div className="rounded-xl border border-j-border bg-j-surface-sunken p-2.5 text-center">
            <span className="block text-3xs font-bold uppercase tracking-wider text-j-ink-faint">Status</span>
            <span className="mt-0.5 block text-xs font-bold uppercase tracking-wider text-j-ink">{profile.profileStatus.replaceAll("_", " ").toUpperCase()}</span>
          </div>
          <div className="rounded-xl border border-j-border bg-j-surface-sunken p-2.5 text-center">
            <span className="block text-3xs font-bold uppercase tracking-wider text-j-ink-faint">Verification</span>
            <span className={`mt-0.5 block text-xs font-bold uppercase tracking-wider ${profile.verified ? "text-emerald-700" : "text-amber-700"}`}>
              {profile.verified ? "VERIFIED" : "UNVERIFIED"}
            </span>
          </div>
        </div>

        {/* Quick 1-Tap Action Row */}
        <div className="col-span-2 flex flex-wrap items-center gap-2 border-t border-[#eef4f9] pt-3 sm:col-span-3">
          {profile.phone ? (
            <>
              <a
                href={`tel:${profile.phone}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
              >
                <Phone size={13} /> Call
              </a>
              {formatWhatsAppUrl(profile.phone) && (
                <a
                  href={formatWhatsAppUrl(profile.phone)!}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                >
                  <MessageCircle size={13} /> WhatsApp
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  if (profile.phone) {
                    navigator.clipboard.writeText(profile.phone);
                    toast.success("Phone number copied to clipboard");
                  }
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-j-border px-2 text-xs font-bold text-j-ink-soft hover:bg-j-surface-sunken transition"
                title="Copy phone number"
              >
                <Copy size={13} /> Copy Phone
              </button>
            </>
          ) : null}
          <Link
            href={`/admin/tutor-chats?tutorId=${encodeURIComponent(tutorId)}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-j-border px-2.5 text-xs font-bold text-j-ink-soft hover:bg-j-surface-sunken transition"
          >
            <MessageCircle size={13} /> Chat Thread
          </Link>
        </div>
      </div>
    </section>

    <div className={activeTab === "all" || activeTab === "history" ? "block" : "hidden"}>
      <ModerationHistory tutorId={tutorId} />
    </div>

    <div className={activeTab === "all" || activeTab === "overview" ? "block" : "hidden"}>
      <AdminTutorRatings tutorId={tutorId} />
    </div>

    <div className={activeTab === "all" || activeTab === "history" ? "space-y-4" : "hidden"}>
      {profile.userId ? <AccountChangeHistory userId={profile.userId} /> : null}
      {profile.userId ? <AdminPasswordResetLink userId={profile.userId} phone={profile.phone} /> : null}
    </div>

    {/* Official Tutor CV & Biodata Banner */}
    <div className={activeTab === "all" || activeTab === "documents" ? "block" : "hidden"}>
      <section className="rounded-xl border border-sky-200 bg-gradient-to-r from-[#eff6ff] to-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#0d5fae] text-white shadow-sm">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-bold text-j-ink">Official Tutor CV &amp; Biodata</h3>
              <p className="text-2xs text-j-ink-soft">Executive 1-page printable biodata with Inter typography and verification seal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCvOpen(true)}
            className="inline-flex h-control items-center gap-2 rounded-xl bg-[#0d5fae] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#0a4c8c]"
          >
            <FileText size={15} /> Preview &amp; Download PDF
          </button>
        </div>
      </section>
    </div>

    {/* Private documents - Admin-only signed URLs. */}
    <div className={activeTab === "all" || activeTab === "documents" ? "block" : "hidden"}>
      <section className="relative rounded-xl border border-j-border bg-white p-4 shadow-sm sm:p-5">
        <div className="absolute right-4 top-4 sm:right-5 sm:top-5">
          <button
            type="button"
            onClick={() => setIsDocsOpen(!isDocsOpen)}
            aria-expanded={isDocsOpen}
            aria-label={isDocsOpen ? "Collapse documents" : "Expand documents"}
            className="inline-flex size-7 items-center justify-center rounded-lg border border-j-border text-j-ink-soft hover:bg-j-surface-sunken transition"
            title={isDocsOpen ? "Collapse documents" : "Expand documents"}
          >
            <ChevronDown size={14} className={`transition-transform duration-200 ${isDocsOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
        <h3 className="mb-3 font-bold tracking-[-0.02em] text-j-ink">Documents</h3>
        {isDocsOpen ? (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <DocumentTile label="University ID" url={profile.documents.universityId} />
            {supporting.map(type => <DocumentTile key={type} label={tutorSupportingDocumentLabels[type]} url={profile.documents.supporting[type] ?? null} />)}
          </div>
        ) : null}
      </section>
    </div>

    {/* The Tutor's own read-only view, unchanged. */}
    <div className={activeTab === "all" || activeTab === "profile" ? "block" : "hidden"}>
      <SiteContentProvider page="tutor-profile">
        <TutorProfileSummaryView sections={sections} />
      </SiteContentProvider>
    </div>

    {moderating ? <Modal size="dialog" onClose={() => setModerating(false)} busy={moderation.isPending}>
      <ModalHeader title={`Moderate ${profile.name}`} />
      <ModalBody className="space-y-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-j-accent" />
          <p className="text-sm leading-6 text-j-ink-soft">Correction requests and suspensions require an Admin reason that is stored in the moderation history.</p>
        </div>
        <label className="block text-sm font-bold text-j-ink-strong">Next status
          <select value={nextStatus} onChange={event => setNextStatus(event.target.value as ModerationTarget)} className="mt-2 h-control w-full rounded-xl border border-j-field-border bg-white px-3 font-normal">
            {decisions.map(status => <option key={status} value={status}>{moderationLabel(profile.profileStatus, status)}</option>)}
          </select>
        </label>
        <label className="block text-sm font-bold text-j-ink-strong">Admin reason{nextStatus === "approved" ? null : " (required)"}
          <textarea value={reason} onChange={event => setReason(event.target.value)} rows={4} placeholder={nextStatus === "approved" ? (profile.profileStatus === "suspended" ? "Reinstatement note" : "Approval note") : "Explain the required correction or suspension reason"} className="mt-2 w-full rounded-xl border border-j-field-border p-3 text-sm font-normal outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100" />
        </label>
        {moderation.isError ? <p className="text-sm text-red-700">{moderation.error.message}</p> : null}
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={() => setModerating(false)} className="h-control rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Cancel</button>
        <button type="button" disabled={moderation.isPending || (nextStatus !== "approved" && !reason.trim())} onClick={() => moderation.mutate({ tutorId, nextStatus, reason: reason.trim() || undefined })} className="h-control rounded-xl bg-j-accent px-4 text-sm font-bold text-white disabled:opacity-50">{moderation.isPending ? "Saving…" : "Save moderation"}</button>
      </ModalFooter>
    </Modal> : null}

    <TutorCvPreviewModal
      isOpen={cvOpen}
      onClose={() => setCvOpen(false)}
      tutorId={tutorId}
      tutorName={profile.name}
      tutorNumber={profile.tutorNumber}
    />

    {/* Mobile Floating Moderation Action Bar */}
    <aside aria-label="Mobile actions bar" className="fixed inset-x-0 bottom-0 z-30 border-t border-j-border bg-white/95 p-3 shadow-lg backdrop-blur sm:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-sky-200 bg-[#f4f9fd] text-j-ink-faint">
            {profile.profilePhotoUrl
              ? <img src={profile.profilePhotoUrl} alt="" className="size-full object-cover" />
              : <UserRound size={16} aria-hidden={true} />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-j-ink">{profile.name}</p>
            <p className="flex items-center gap-1 text-3xs text-j-ink-soft">
              <span>Tutor #{profile.tutorNumber || "—"}</span>
              <span>•</span>
              <span className="font-medium">Status: {profile.profileStatus.replace("_", " ")}</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {decisions.length > 0 ? (
            <button
              type="button"
              onClick={() => { setNextStatus(decisions[0]); setReason(""); setModerating(true); }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-j-accent px-3 text-xs font-bold text-white shadow-xs hover:bg-j-accent-hover"
            >
              <UserRoundCog size={14} /> Moderate
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setCvOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-j-border px-2.5 text-xs font-bold text-j-ink-soft hover:bg-j-surface-sunken"
            title="View Official CV"
          >
            <FileText size={14} /> CV
          </button>
        </div>
      </div>
    </aside>
  </div>;
}

export default function AdminTutorProfileDetail() {
  const [, params] = useRoute("/admin/tutor-profiles/:tutorId");
  const tutorId = params?.tutorId ?? "";
  return <AdminWorkspaceLayout title="Tutor Profiles">
    {tutorId ? <AdminTutorProfileDetailContent tutorId={tutorId} /> : null}
  </AdminWorkspaceLayout>;
}
