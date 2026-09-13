import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import AdminTutorRows from "@/components/AdminTutorRows";
import { CollapsiblePanel } from "@/components/CollapsiblePanel";
import { countActiveFilters } from "@/components/activeFilterCount";
import { TutorListPager } from "@/components/TutorListPager";
import { trpc } from "@/lib/trpc";
import { Loader2, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

type ProfileStatus = "all" | "draft" | "pending" | "changes_requested" | "approved" | "suspended";
export type TutorFilters = {
  query: string;
  profileStatus: ProfileStatus;
  verified: "all" | "verified" | "unverified";
  location: string;
  subject: string;
  tuitionType: "all" | "home" | "online" | "both";
  page: number;
  pageSize: number;
};

export const defaultTutorFilters: TutorFilters = { query: "", profileStatus: "all", verified: "all", location: "", subject: "", tuitionType: "all", page: 1, pageSize: 20 };

/**
 * The filter set both Tutor lists carry - the whole directory, and the Tutors
 * who applied to one tuition. Shared so the two screens filter by the same
 * things, in the same order, with the same wording.
 */
export function TutorDirectoryFilters({ filters, onChange, onClear }: {
  filters: TutorFilters;
  onChange: (change: Partial<TutorFilters>) => void;
  onClear: () => void;
}) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <label className="relative sm:col-span-2">
      <span className="sr-only">Search Tutors</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-j-ink-faint" />
      <input value={filters.query} onChange={event => onChange({ query: event.target.value })} placeholder="Search Tutor name, ID, institution or headline" className="h-11 w-full rounded-xl border border-j-border bg-j-surface-sunken pl-10 pr-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100" />
    </label>
    <select value={filters.profileStatus} onChange={event => onChange({ profileStatus: event.target.value as ProfileStatus })} aria-label="Profile status" className="h-11 rounded-xl border border-j-border bg-white px-3 text-sm"><option value="all">All profile statuses</option><option value="pending">Pending review</option><option value="changes_requested">Changes requested</option><option value="approved">Approved</option><option value="suspended">Suspended</option><option value="draft">Draft</option></select>
    <select value={filters.verified} onChange={event => onChange({ verified: event.target.value as TutorFilters["verified"] })} aria-label="Verification status" className="h-11 rounded-xl border border-j-border bg-white px-3 text-sm"><option value="all">All verification states</option><option value="verified">Verified</option><option value="unverified">Unverified</option></select>
    <input value={filters.location} onChange={event => onChange({ location: event.target.value })} placeholder="Location" className="h-11 rounded-xl border border-j-border px-3 text-sm" />
    <input value={filters.subject} onChange={event => onChange({ subject: event.target.value })} placeholder="Subject" className="h-11 rounded-xl border border-j-border px-3 text-sm" />
    <select value={filters.tuitionType} onChange={event => onChange({ tuitionType: event.target.value as TutorFilters["tuitionType"] })} aria-label="Tuition type" className="h-11 rounded-xl border border-j-border bg-white px-3 text-sm"><option value="all">All tuition modes</option><option value="home">Home tuition</option><option value="online">Online tuition</option><option value="both">Both</option></select>
    <button type="button" onClick={onClear} className="h-11 rounded-xl border border-j-border px-3 text-sm font-bold text-j-ink-soft hover:bg-j-surface-sunken">Clear filters</button>
  </div>;
}

/** The pager both Tutor lists carry. */
/** Every Tutor's record, one per row. */
export function AdminTutorProfilesContent() {
  const [filters, setFilters] = useState<TutorFilters>(defaultTutorFilters);
  const activeFilterCount = countActiveFilters(filters, defaultTutorFilters, { ignore: ["page", "pageSize"] });
  const tutors = trpc.admin.listTutorDirectory.useQuery(filters);
  const updateFilter = (change: Partial<TutorFilters>) => setFilters(current => ({ ...current, ...change, page: change.page ?? 1 }));

  return <div className="mx-auto w-full max-w-[100rem] space-y-5 pb-10">
    <CollapsiblePanel title="Filters" icon={<SlidersHorizontal className="h-4 w-4" />} activeCount={activeFilterCount}>
      <TutorDirectoryFilters filters={filters} onChange={updateFilter} onClear={() => setFilters(defaultTutorFilters)} />
    </CollapsiblePanel>

    {tutors.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading Tutor profiles…</div> : null}
    {tutors.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Tutor profiles could not be loaded.</div> : null}

    {!tutors.isLoading && !tutors.isError
      ? <AdminTutorRows tutors={tutors.data?.items ?? []} caption="Every Tutor profile" emptyLabel="No Tutor profile matches the active filters." />
      : null}

    <TutorListPager page={filters.page} totalPages={tutors.data?.totalPages ?? 1} onPage={next => updateFilter({ page: next })} label="Tutor profile pages" />
  </div>;
}

export default function AdminTutorProfiles() {
  return <AdminWorkspaceLayout title="Tutor Profiles"><AdminTutorProfilesContent /></AdminWorkspaceLayout>;
}
