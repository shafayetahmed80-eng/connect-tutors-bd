import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { CollapsiblePanel } from "@/components/CollapsiblePanel";
import { countActiveFilters } from "@/components/activeFilterCount";
import { trpc } from "@/lib/trpc";
import { BadgeCheck, ChevronLeft, ChevronRight, CircleAlert, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

type ProfileStatus = "all" | "draft" | "pending" | "changes_requested" | "approved" | "suspended";
type TutorFilters = {
  query: string;
  profileStatus: ProfileStatus;
  verified: "all" | "verified" | "unverified";
  location: string;
  subject: string;
  tuitionType: "all" | "home" | "online" | "both";
  page: number;
  pageSize: number;
};

const defaultFilters: TutorFilters = { query: "", profileStatus: "all", verified: "all", location: "", subject: "", tuitionType: "all", page: 1, pageSize: 20 };

const statusStyles: Record<Exclude<ProfileStatus, "all">, string> = {
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

/**
 * Every Tutor's record, one per row.
 *
 * The row carries only what an Admin scans and searches by. The headline,
 * subjects, class levels and tuition mode are deliberately not here - they are
 * long, they push the identifying columns off the screen, and the whole
 * profile is one arrow away at /admin/tutor-profiles/:tutorId, laid out
 * exactly as the Tutor's own "View Profile".
 */
export function AdminTutorProfilesContent() {
  const [filters, setFilters] = useState<TutorFilters>(defaultFilters);
  const activeFilterCount = countActiveFilters(filters, defaultFilters, { ignore: ["page", "pageSize"] });
  const tutors = trpc.admin.listTutorDirectory.useQuery(filters);
  const updateFilter = (change: Partial<TutorFilters>) => setFilters(current => ({ ...current, ...change, page: change.page ?? 1 }));
  const items = tutors.data?.items ?? [];
  const totalPages = tutors.data?.totalPages ?? 1;

  return <div className="mx-auto w-full max-w-[100rem] space-y-5 pb-10">
    <CollapsiblePanel title="Filters" icon={<SlidersHorizontal className="h-4 w-4" />} activeCount={activeFilterCount}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="relative sm:col-span-2">
          <span className="sr-only">Search Tutors</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-j-ink-faint" />
          <input value={filters.query} onChange={event => updateFilter({ query: event.target.value })} placeholder="Search Tutor name, ID, institution or headline" className="h-11 w-full rounded-xl border border-j-border bg-j-surface-sunken pl-10 pr-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100" />
        </label>
        <select value={filters.profileStatus} onChange={event => updateFilter({ profileStatus: event.target.value as ProfileStatus })} aria-label="Profile status" className="h-11 rounded-xl border border-j-border bg-white px-3 text-sm"><option value="all">All profile statuses</option><option value="pending">Pending review</option><option value="changes_requested">Changes requested</option><option value="approved">Approved</option><option value="suspended">Suspended</option><option value="draft">Draft</option></select>
        <select value={filters.verified} onChange={event => updateFilter({ verified: event.target.value as TutorFilters["verified"] })} aria-label="Verification status" className="h-11 rounded-xl border border-j-border bg-white px-3 text-sm"><option value="all">All verification states</option><option value="verified">Verified</option><option value="unverified">Unverified</option></select>
        <input value={filters.location} onChange={event => updateFilter({ location: event.target.value })} placeholder="Location" className="h-11 rounded-xl border border-j-border px-3 text-sm" />
        <input value={filters.subject} onChange={event => updateFilter({ subject: event.target.value })} placeholder="Subject" className="h-11 rounded-xl border border-j-border px-3 text-sm" />
        <select value={filters.tuitionType} onChange={event => updateFilter({ tuitionType: event.target.value as TutorFilters["tuitionType"] })} aria-label="Tuition type" className="h-11 rounded-xl border border-j-border bg-white px-3 text-sm"><option value="all">All tuition modes</option><option value="home">Home tuition</option><option value="online">Online tuition</option><option value="both">Both</option></select>
        <button type="button" onClick={() => setFilters(defaultFilters)} className="h-11 rounded-xl border border-j-border px-3 text-sm font-bold text-j-ink-soft hover:bg-j-surface-sunken">Clear filters</button>
      </div>
    </CollapsiblePanel>

    {tutors.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading Tutor profiles…</div> : null}
    {tutors.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Tutor profiles could not be loaded.</div> : null}

    {!tutors.isLoading && !tutors.isError ? <div className="overflow-x-auto rounded-xl border border-j-border bg-white shadow-sm">
      <table className="w-full min-w-[72rem] border-collapse text-sm">
        <caption className="sr-only">Every Tutor profile</caption>
        <thead>
          <tr className="border-b border-j-border text-left text-2xs font-bold uppercase tracking-wide text-j-ink-muted">
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
          {items.map(tutor => <tr key={tutor.id} className="border-b border-[#eef4f9] last:border-b-0 hover:bg-j-surface-sunken/60">
            <td className="px-3 py-2.5 align-top font-mono text-2xs text-j-ink-muted">{tutor.id}</td>
            <td className="px-3 py-2.5 align-top font-bold text-j-ink">{tutor.name}</td>
            <Cell value={tutor.phone ?? ""} className="whitespace-nowrap" />
            <Cell value={tutor.instituteName ?? ""} className="max-w-[16rem]" />
            <Cell value={tutor.departmentName ?? ""} className="max-w-[12rem]" />
            <Cell value={tutor.cityLabel ?? ""} />
            <Cell value={tutor.locationLabel ?? ""} />
            <Cell value={tutor.teachingExperienceYears == null ? "" : `${tutor.teachingExperienceYears} yr`} />
            <td className="px-3 py-2.5 align-top"><span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-2xs font-bold ${statusStyles[tutor.profileStatus]}`}>{tutor.profileStatus.replaceAll("_", " ")}</span></td>
            <td className="px-3 py-2.5 align-top">{tutor.verified ? <BadgeCheck size={16} className="text-emerald-600" aria-label="Verified" /> : <CircleAlert size={16} className="text-amber-600" aria-label="Not verified" />}</td>
            <td className="px-3 py-2.5 align-top text-right">
              <Link href={`/admin/tutor-profiles/${tutor.id}`} aria-label={`Open the full profile of ${tutor.name}`} className="inline-grid size-8 place-items-center rounded-lg border border-j-border text-j-accent hover:bg-sky-50">
                <ChevronRight size={16} />
              </Link>
            </td>
          </tr>)}
          {items.length === 0 ? <tr><td colSpan={12} className="px-3 py-10 text-center text-sm text-j-ink-soft">No Tutor profile matches the active filters.</td></tr> : null}
        </tbody>
      </table>
    </div> : null}

    {totalPages > 1 ? <nav aria-label="Tutor profile pages" className="flex items-center justify-between rounded-xl border border-j-border bg-white p-3 shadow-sm">
      <p className="text-sm text-j-ink-soft">Page {filters.page} of {totalPages}</p>
      <div className="flex gap-2">
        <button type="button" disabled={filters.page <= 1} onClick={() => updateFilter({ page: filters.page - 1 })} className="inline-flex h-9 items-center gap-1 rounded-lg border border-j-border px-3 text-sm font-bold disabled:opacity-40"><ChevronLeft size={15} /> Previous</button>
        <button type="button" disabled={filters.page >= totalPages} onClick={() => updateFilter({ page: filters.page + 1 })} className="inline-flex h-9 items-center gap-1 rounded-lg border border-j-border px-3 text-sm font-bold disabled:opacity-40">Next <ChevronRight size={15} /></button>
      </div>
    </nav> : null}
  </div>;
}

export default function AdminTutorProfiles() {
  return <AdminWorkspaceLayout title="Tutor Profiles"><AdminTutorProfilesContent /></AdminWorkspaceLayout>;
}
