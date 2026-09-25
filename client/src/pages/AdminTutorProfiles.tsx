import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import AdminTutorRows from "@/components/AdminTutorRows";
import CharacterRemaining from "@/components/CharacterRemaining";
import { CollapsiblePanel } from "@/components/CollapsiblePanel";
import { NotificationHistoryModal } from "@/components/NotificationHistoryModal";
import StatusTabRow from "@/components/StatusTabRow";
import { countActiveFilters } from "@/components/activeFilterCount";
import { TutorListPager } from "@/components/TutorListPager";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import { tutorApplicationStages, type TutorApplicationStage } from "@shared/tutor-application-stages";
import { History, Megaphone, Search, SlidersHorizontal } from "lucide-react";
import { LoadingCradle } from "@/components/BrandMark";
import { useState } from "react";
import { toast } from "sonner";

type ProfileStatus = "all" | "draft" | "pending" | "changes_requested" | "approved" | "suspended";
export type TutorFilters = {
  query: string;
  profileStatus: ProfileStatus;
  jobStage: "all" | TutorApplicationStage;
  verified: "all" | "verified" | "unverified";
  location: string;
  subject: string;
  tuitionType: "all" | "home" | "online" | "group" | "package";
  page: number;
  pageSize: number;
};

export const defaultTutorFilters: TutorFilters = { query: "", profileStatus: "all", jobStage: "all", verified: "all", location: "", subject: "", tuitionType: "all", page: 1, pageSize: 20 };

/** The profile statuses, in the order the dropdown has always listed them. */
const profileStatusTabs: Array<{ key: ProfileStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending review" },
  { key: "changes_requested", label: "Changes requested" },
  { key: "approved", label: "Approved" },
  { key: "suspended", label: "Suspended" },
  { key: "draft", label: "Draft" },
];

/**
 * The filter set both Tutor lists carry - the whole directory, and the Tutors
 * who applied to one tuition. Shared so the two screens filter by the same
 * things, in the same order, with the same wording. The directory shows its
 * profile status as tabs instead, so it leaves the dropdown out.
 */
export function TutorDirectoryFilters({ filters, onChange, onClear, showProfileStatus = true }: {
  filters: TutorFilters;
  onChange: (change: Partial<TutorFilters>) => void;
  onClear: () => void;
  showProfileStatus?: boolean;
}) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <label className="relative sm:col-span-2">
      <span className="sr-only">Search Tutors</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-j-ink-faint" />
      <input value={filters.query} onChange={event => onChange({ query: event.target.value })} placeholder="Search Tutor name, ID, institution or headline" className="h-11 w-full rounded-xl border border-j-border bg-j-surface-sunken pl-10 pr-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100" />
    </label>
    {showProfileStatus ? <select value={filters.profileStatus} onChange={event => onChange({ profileStatus: event.target.value as ProfileStatus })} aria-label="Profile status" className="h-11 rounded-xl border border-j-border bg-white px-3 text-sm"><option value="all">All profile statuses</option><option value="pending">Pending review</option><option value="changes_requested">Changes requested</option><option value="approved">Approved</option><option value="suspended">Suspended</option><option value="draft">Draft</option></select> : null}
    <select value={filters.verified} onChange={event => onChange({ verified: event.target.value as TutorFilters["verified"] })} aria-label="Verification status" className="h-11 rounded-xl border border-j-border bg-white px-3 text-sm"><option value="all">All verification states</option><option value="verified">Verified</option><option value="unverified">Unverified</option></select>
    <input value={filters.location} onChange={event => onChange({ location: event.target.value })} placeholder="Location" className="h-11 rounded-xl border border-j-border px-3 text-sm" />
    <input value={filters.subject} onChange={event => onChange({ subject: event.target.value })} placeholder="Subject" className="h-11 rounded-xl border border-j-border px-3 text-sm" />
    <select value={filters.tuitionType} onChange={event => onChange({ tuitionType: event.target.value as TutorFilters["tuitionType"] })} aria-label="Tuition type" className="h-11 rounded-xl border border-j-border bg-white px-3 text-sm"><option value="all">All tuition modes</option><option value="home">Home tuition</option><option value="online">Online tuition</option><option value="group">Group tuition</option><option value="package">Package tuition</option></select>
    <button type="button" onClick={onClear} className="h-11 rounded-xl border border-j-border px-3 text-sm font-bold text-j-ink-soft hover:bg-j-surface-sunken">Clear filters</button>
  </div>;
}

/**
 * Every Tutor's record, one per row, under two rows of counted tabs: the
 * profile status, and the stage of the Tutor's job applications. Both narrow
 * the list, together with the filter set.
 */
export function AdminTutorProfilesContent() {
  const [filters, setFilters] = useState<TutorFilters>(defaultTutorFilters);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // The tab rows show their own choices, so the Filters badge counts the rest.
  const activeFilterCount = countActiveFilters(filters, defaultTutorFilters, { ignore: ["page", "pageSize", "profileStatus", "jobStage"] });
  const tutors = trpc.admin.listTutorDirectory.useQuery(filters);
  const counts = tutors.data?.counts;
  const matchCount = tutors.data?.total ?? 0;
  const updateFilter = (change: Partial<TutorFilters>) => setFilters(current => ({ ...current, ...change, page: change.page ?? 1 }));
  const toggleSelected = (tutorId: string) => setSelectedIds(current => {
    const next = new Set(current);
    if (next.has(tutorId)) next.delete(tutorId); else next.add(tutorId);
    return next;
  });

  return <div className="mx-auto w-full max-w-[100rem] space-y-5 pb-10">
    <div>
      <StatusTabRow
        label="Profile status"
        items={profileStatusTabs.map(tab => ({ ...tab, count: counts?.profileStatus[tab.key] }))}
        selected={filters.profileStatus}
        onSelect={key => updateFilter({ profileStatus: key ?? "all" })}
      />
      <StatusTabRow
        label="Job status"
        toggle
        compact
        items={tutorApplicationStages.map(stage => ({ key: stage.key, label: stage.label.replace(/\s*Jobs$/, ""), wideSuffix: "Jobs", count: counts?.jobStage[stage.key] }))}
        selected={filters.jobStage === "all" ? null : filters.jobStage}
        onSelect={key => updateFilter({ jobStage: key ?? "all" })}
      />
    </div>

    <CollapsiblePanel title="Filters" icon={<SlidersHorizontal className="h-4 w-4" />} activeCount={activeFilterCount}>
      <TutorDirectoryFilters filters={filters} onChange={updateFilter} onClear={() => setFilters(defaultTutorFilters)} showProfileStatus={false} />
    </CollapsiblePanel>

    {/* Sends to exactly who the two tab rows and the Filters panel above are
        currently showing - or, when an Admin ticks specific rows below,
        exactly those - never a separate hand-picked list built elsewhere. */}
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-j-border bg-white px-4 py-3">
      <p data-testid="notify-match-count" className="text-sm text-j-ink-soft">
        {selectedIds.size > 0
          ? <><span className="font-bold text-j-ink">{selectedIds.size}</span> Tutor{selectedIds.size === 1 ? "" : "s"} selected. <button type="button" onClick={() => setSelectedIds(new Set())} className="font-bold text-j-accent hover:underline">Clear selection</button></>
          : <><span className="font-bold text-j-ink">{matchCount}</span> Tutor{matchCount === 1 ? "" : "s"} match{matchCount === 1 ? "es" : ""} the current filters.</>}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft hover:bg-j-surface-sunken"
        >
          <History className="h-4 w-4" aria-hidden="true" /> History
        </button>
        <button
          type="button"
          onClick={() => setNotifyOpen(true)}
          disabled={matchCount === 0 && selectedIds.size === 0}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-j-accent px-4 text-sm font-bold text-white hover:bg-[#0e6dc2] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Megaphone className="h-4 w-4" aria-hidden="true" /> Notify
        </button>
      </div>
    </div>
    {notifyOpen ? <NotifyTutorsModal
      filters={filters}
      matchCount={matchCount}
      selectedIds={Array.from(selectedIds)}
      onSent={() => setSelectedIds(new Set())}
      onClose={() => setNotifyOpen(false)}
    /> : null}
    {historyOpen ? <NotificationHistoryModal audience="tutor" onClose={() => setHistoryOpen(false)} /> : null}

    {tutors.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><LoadingCradle className="mr-2" /> Loading Tutor profiles…</div> : null}
    {tutors.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Tutor profiles could not be loaded.</div> : null}

    {!tutors.isLoading && !tutors.isError
      ? <AdminTutorRows
          tutors={tutors.data?.items ?? []}
          caption="Every Tutor profile"
          emptyLabel="No Tutor profile matches the active filters."
          selection={{ isSelected: id => selectedIds.has(id), onToggle: toggleSelected }}
        />
      : null}

    <TutorListPager
      page={filters.page}
      totalPages={tutors.data?.totalPages ?? 1}
      onPage={next => updateFilter({ page: next })}
      label="Tutor profile pages"
      pageSize={filters.pageSize}
      pageSizeOptions={[20, 50, 100]}
      onPageSize={next => updateFilter({ pageSize: next })}
      totalItems={tutors.data?.total}
    />
  </div>;
}

const NOTIFY_TITLE_MAX = 120;
const NOTIFY_MESSAGE_MAX = 360;

/**
 * One message, sent either to every Tutor the directory's active filters
 * currently match, or - when the Admin ticked specific rows first - to
 * exactly those. Lands in each Tutor's own Notifications tab.
 */
function NotifyTutorsModal({ filters, matchCount, selectedIds, onSent, onClose }: {
  filters: TutorFilters;
  matchCount: number;
  /** Hand-picked Tutor ids; a non-empty list overrides the filters entirely. */
  selectedIds: string[];
  /** Called once the send succeeds, so the caller can clear the selection. */
  onSent: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const usingSelection = selectedIds.length > 0;
  const recipientCount = usingSelection ? selectedIds.length : matchCount;
  const notify = trpc.admin.notifyTutorDirectory.useMutation({
    onSuccess: result => {
      toast.success(`Sent to ${result.sent} Tutor${result.sent === 1 ? "" : "s"}.`);
      if (usingSelection) onSent();
      onClose();
    },
    onError: error => toast.error(error.message),
  });
  const ready = title.trim().length > 0 && message.trim().length > 0;
  const { page: _page, pageSize: _pageSize, ...directoryFilters } = filters;
  const recipientLine = usingSelection
    ? `${recipientCount} hand-picked Tutor${recipientCount === 1 ? "" : "s"}`
    : `${recipientCount} Tutor${recipientCount === 1 ? "" : "s"} match the current filters`;
  const send = () => notify.mutate(usingSelection
    ? { ...defaultTutorFilters, tutorIds: selectedIds, title: title.trim(), message: message.trim() }
    : { ...directoryFilters, title: title.trim(), message: message.trim() });

  if (confirming) {
    return <Modal size="sm" onClose={onClose} busy={notify.isPending}>
      <ModalHeader title="Send this to Tutors?" meta={recipientLine} />
      <ModalBody className="space-y-3">
        <p className="text-sm leading-6 text-j-ink-soft">This is exactly what every recipient will see in their Notifications tab. It cannot be recalled once sent.</p>
        <div className="rounded-xl border border-j-border bg-j-surface-sunken p-3.5">
          <p className="font-bold text-j-ink">{title.trim()}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-j-ink-soft">{message.trim()}</p>
        </div>
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={() => setConfirming(false)} disabled={notify.isPending} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Back</button>
        <button
          type="button"
          disabled={notify.isPending}
          onClick={send}
          className="h-10 rounded-xl bg-j-accent px-4 text-sm font-bold text-white hover:bg-[#0e6dc2] disabled:cursor-not-allowed disabled:opacity-50"
        >{notify.isPending ? "Sending…" : `Confirm & send to ${recipientCount}`}</button>
      </ModalFooter>
    </Modal>;
  }

  return <Modal size="sm" onClose={onClose} busy={notify.isPending}>
    <ModalHeader title="Notify these Tutors" meta={recipientLine} />
    <ModalBody className="space-y-4">
      <div>
        <label htmlFor="notify-tutors-title" className="text-sm font-bold text-j-ink">Title <span className="text-red-600">*</span></label>
        <input id="notify-tutors-title" value={title} maxLength={NOTIFY_TITLE_MAX} onChange={event => setTitle(event.target.value)}
          className="mt-1.5 h-10 w-full rounded-xl border border-j-border bg-white px-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100" />
      </div>
      <div>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="notify-tutors-message" className="text-sm font-bold text-j-ink">Message <span className="text-red-600">*</span></label>
          <CharacterRemaining value={message} maxLength={NOTIFY_MESSAGE_MAX} />
        </div>
        <textarea id="notify-tutors-message" value={message} maxLength={NOTIFY_MESSAGE_MAX} rows={4} onChange={event => setMessage(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-j-border bg-white px-3 py-2 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100" />
      </div>
    </ModalBody>
    <ModalFooter>
      <button type="button" onClick={onClose} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Cancel</button>
      <button
        type="button"
        disabled={!ready}
        onClick={() => setConfirming(true)}
        className="h-10 rounded-xl bg-j-accent px-4 text-sm font-bold text-white hover:bg-[#0e6dc2] disabled:cursor-not-allowed disabled:opacity-50"
      >Review &amp; send to {recipientCount}</button>
    </ModalFooter>
  </Modal>;
}

export default function AdminTutorProfiles() {
  return <AdminWorkspaceLayout title="Tutor Profiles"><AdminTutorProfilesContent /></AdminWorkspaceLayout>;
}
