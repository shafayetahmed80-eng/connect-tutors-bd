import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import JobCard, { DetailsAction } from "@/components/JobCard";
import JobDetailsModal, { JobDetailRow } from "@/components/JobDetailsModal";
import { getGuardianRequestLifecycle } from "@/pages/GuardianRequestTracking";
import { formatPostedDate } from "@shared/job-card";
import { jobIdForRequest } from "@shared/job-id";
import { buildJobTitle } from "@shared/job-title";
import { formatInstituteName, formatRequestSource } from "@shared/request-source";
import { trpc } from "@/lib/trpc";
import { AlignLeft, ChevronLeft, ChevronRight, FilePenLine, Loader2, MapPin, Phone, Plus, RefreshCcw, School, Search, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type StageKey = "pending" | "live" | "appointed" | "confirmed" | "cancelled";

const stages: Array<{ key: StageKey; label: string }> = [
  { key: "pending", label: "Pending" }, { key: "live", label: "Live" }, { key: "appointed", label: "Appointed" },
  { key: "confirmed", label: "Confirmed" }, { key: "cancelled", label: "Cancelled" },
];

const PAGE_SIZE = 12;

/**
 * The Admin's copy of the Guardian "Posted jobs" board - the same five stages,
 * the same cards and the same details dialog, but across every Guardian, with
 * a search box and paging the Guardian's own short list does not need.
 *
 * Add Tuition / Change Status / Edit are placed but not wired yet; their
 * behaviour is still being specified.
 */
export function AdminPostedJobsContent() {
  const [stage, setStage] = useState<StageKey>("pending");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const jobs = trpc.admin.listPostedJobs.useQuery({ stage, query, page, pageSize: PAGE_SIZE });
  const items = jobs.data?.items ?? [];
  const counts = jobs.data?.counts;
  const totalPages = jobs.data?.totalPages ?? 1;
  const openJob = expandedId ? items.find(item => item.id === expandedId) ?? null : null;

  const notWiredYet = () => toast("Coming soon.");
  const changeStage = (next: StageKey) => { setStage(next); setPage(1); setExpandedId(null); };

  return <div className="mx-auto w-full max-w-7xl space-y-5 pb-10">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#dce9f1]">
      <div role="tablist" aria-label="Request stages" className="flex flex-wrap items-end gap-5">
        {stages.map(step => {
          const selected = step.key === stage;
          return <button
            key={step.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => changeStage(step.key)}
            className={`relative pb-2.5 pt-1.5 text-xs font-semibold transition-colors ${selected ? "font-bold text-[#1267c8]" : "text-j-ink-muted hover:text-[#173d60]"}`}
          >
            {step.label} <span className={`ml-1 tabular-nums ${selected ? "text-[#1267c8]" : "text-j-ink-faint"}`}>{String(counts?.[step.key] ?? 0).padStart(2, "0")}</span>
            {selected ? <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 rounded-t bg-[#1677e8]" /> : null}
          </button>;
        })}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <label className="relative">
          <span className="sr-only">Search posted jobs</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-j-ink-faint" />
          <input
            value={query}
            onChange={event => { setQuery(event.target.value); setPage(1); }}
            placeholder="Search subject, class, location or Guardian"
            className="h-10 w-64 rounded-xl border border-j-border bg-j-surface-sunken pl-10 pr-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100"
          />
        </label>
        <button type="button" onClick={notWiredYet} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1677e8] px-4 text-sm font-bold text-white hover:bg-[#0e5fbd]">
          <Plus size={16} /> Add Tuition
        </button>
      </div>
    </div>

    {jobs.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading posted jobs…</div> : null}
    {jobs.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Posted jobs could not be loaded.</div> : null}

    {!jobs.isLoading && !jobs.isError && items.length === 0
      ? <p className="rounded-xl border border-dashed border-[#c9dce9] bg-white px-4 py-10 text-center text-sm text-j-ink-muted">
          No {stages.find(step => step.key === stage)?.label.toLowerCase()} jobs{query.trim() ? " for this search" : ""}. The other stages are in the tabs above.
        </p>
      : null}

    {items.length > 0
      ? <div className="grid items-stretch gap-3.5 lg:grid-cols-2">
          {items.map(job => {
            const lifecycle = getGuardianRequestLifecycle(job);
            return <JobCard
              key={job.id}
              job={{
                jobId: jobIdForRequest(job.id),
                title: buildJobTitle({ category: job.category, classCourse: job.classCourse, studentCount: job.studentCount ?? 1, daysPerWeek: job.daysPerWeek }),
                postedAt: formatPostedDate(job.createdAt),
                statusLabel: lifecycle.label,
                statusTone: lifecycle.key,
                tuitionType: job.tuitionType,
                budgetAmount: job.budgetAmount,
                subjects: job.subjects,
                locationLabel: job.tuitionLocationLabel ?? job.locationText ?? null,
                preferredTutorGender: job.preferredGender,
              }}
              onOpen={() => setExpandedId(job.id)}
              action={<DetailsAction />}
              showMapLink={false}
            />;
          })}
        </div>
      : null}

    {totalPages > 1 ? <nav aria-label="Posted job pages" className="flex items-center justify-between rounded-xl border border-j-border bg-white p-3 shadow-sm">
      <p className="text-sm text-j-ink-soft">Page {page} of {totalPages}</p>
      <div className="flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => setPage(current => current - 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-j-border px-3 text-sm font-bold disabled:opacity-40"><ChevronLeft size={15} /> Previous</button>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage(current => current + 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-j-border px-3 text-sm font-bold disabled:opacity-40">Next <ChevronRight size={15} /></button>
      </div>
    </nav> : null}

    {openJob ? <JobDetailsModal
      job={{
        jobId: jobIdForRequest(openJob.id),
        title: buildJobTitle({ category: openJob.category, classCourse: openJob.classCourse, studentCount: openJob.studentCount ?? 1, daysPerWeek: openJob.daysPerWeek }),
        postedAt: formatPostedDate(openJob.createdAt),
        statusLabel: getGuardianRequestLifecycle(openJob).label,
        statusTone: getGuardianRequestLifecycle(openJob).key,
        tuitionType: openJob.tuitionType,
        budgetAmount: openJob.budgetAmount,
        subjects: openJob.subjects,
        locationLabel: openJob.tuitionLocationLabel ?? openJob.locationText ?? null,
        preferredTutorGender: openJob.preferredGender,
        studentGender: openJob.studentGender,
        daysPerWeek: openJob.daysPerWeek,
        studentCount: openJob.studentCount,
        notes: openJob.notes,
      }}
      onClose={() => setExpandedId(null)}
      showMapLink={false}
      extraRows={<>
        {/* Admin-only tail: the private address, where the request came from,
            and the Guardian behind it. */}
        <div className="sm:col-span-2"><JobDetailRow icon={<AlignLeft size={12} />} label="Address" value={openJob.addressDetails?.trim() || "Not given"} muted={!openJob.addressDetails?.trim()} /></div>
        <JobDetailRow icon={<School size={12} />} label="Institute" value={formatInstituteName(openJob.instituteName)} muted={!openJob.instituteName?.trim()} />
        <JobDetailRow icon={<MapPin size={12} />} label="Heard via" value={formatRequestSource(openJob.heardAboutUs)} muted={!openJob.heardAboutUs} />
        <JobDetailRow icon={<UserRound size={12} />} label="Guardian" value={openJob.guardianName || "Not given"} muted={!openJob.guardianName} />
        <JobDetailRow icon={<Phone size={12} />} label="Guardian phone" value={openJob.guardianPhone || "Not given"} muted={!openJob.guardianPhone} />
      </>}
      action={<>
        <button type="button" onClick={() => setExpandedId(null)} className="h-8 rounded-lg border border-[#dce9f1] bg-white px-3.5 text-xs font-bold text-[#173d60] hover:bg-[#f1f6fa]">Close</button>
        <button type="button" onClick={notWiredYet} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dce9f1] bg-white px-3.5 text-xs font-bold text-[#173d60] hover:bg-[#f1f6fa]"><RefreshCcw size={13} /> Change Status</button>
        <button type="button" onClick={notWiredYet} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#1677e8] px-4 text-xs font-bold text-white hover:bg-[#1267c8]"><FilePenLine size={13} /> Edit</button>
      </>}
    /> : null}
  </div>;
}

export default function AdminPostedJobs() {
  return <AdminWorkspaceLayout title="Posted jobs"><AdminPostedJobsContent /></AdminWorkspaceLayout>;
}
