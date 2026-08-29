import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { buildTutorApplyProfilePath, buildTutorApplyReturnPath, buildTutorApplySignInPath, getTutorApplyReturnFromLocation, storeTutorApplyReturnPath } from "@/lib/tutorApplyReturn";
import { BriefcaseBusiness, ChevronLeft, ChevronRight, Compass, ExternalLink, Filter, HeartHandshake, MapPinned, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLocation } from "wouter";

type TutorGender = "male" | "female" | "any";
type TuitionType = "home" | "online" | "both" | "group" | "package";
type TutorInterestStatus = "interested" | "shortlisted" | "declined" | "matched" | "withdrawn";
type TutorJobInterest = { interestId: number; status: TutorInterestStatus };

type JobBoardFilterState = {
  page: number;
  cityId: string;
  locationId: string;
  tuitionType: "" | TuitionType;
  preferredTutorGender: "" | TutorGender;
  category: string;
  subject: string;
  budgetMaximum: string;
  jobId: string;
};

export type JobBoardJob = {
  id: number;
  jobId: string;
  title: string;
  tuitionType: TuitionType;
  category: string;
  classCourse: string;
  subjects: string[];
  studentCount: number;
  studentGender?: "male" | "female" | null;
  preferredTutorGender: TutorGender;
  daysPerWeek: number;
  budget: { kind: "range"; minimum: number; maximum: number } | { kind: "discuss" };
  country: string;
  cityLocationId: string | null;
  locationId: string | null;
  locationLabel: string | null;
  directionLabel: string | null;
  publishedAt: Date | string;
  expiresAt: Date | string;
};

const DEFAULT_FILTERS: JobBoardFilterState = {
  page: 1,
  cityId: "",
  locationId: "",
  tuitionType: "",
  preferredTutorGender: "",
  category: "",
  subject: "",
  budgetMaximum: "",
  jobId: "",
};

const PAGE_SIZE = 20;

function optionalTrimmed(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function buildJobBoardQuery(filters: JobBoardFilterState) {
  const parsedBudget = Number(filters.budgetMaximum);
  return {
    page: Math.max(1, Math.floor(filters.page || 1)),
    pageSize: PAGE_SIZE,
    ...(optionalTrimmed(filters.cityId) ? { cityId: optionalTrimmed(filters.cityId) } : {}),
    ...(optionalTrimmed(filters.locationId) ? { locationId: optionalTrimmed(filters.locationId) } : {}),
    ...(filters.tuitionType ? { tuitionType: filters.tuitionType } : {}),
    ...(filters.preferredTutorGender ? { preferredTutorGender: filters.preferredTutorGender } : {}),
    ...(optionalTrimmed(filters.category) ? { category: optionalTrimmed(filters.category) } : {}),
    ...(optionalTrimmed(filters.subject) ? { subject: optionalTrimmed(filters.subject) } : {}),
    ...(Number.isInteger(parsedBudget) && parsedBudget > 0 ? { budgetMaximum: parsedBudget } : {}),
    ...(optionalTrimmed(filters.jobId) ? { jobId: optionalTrimmed(filters.jobId) } : {}),
  };
}

export function buildMapsDirectionUrl(directionLabel: string | null) {
  const area = directionLabel?.trim();
  return area ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${area}, Bangladesh`)}` : null;
}

export function formatJobBudget(budget: JobBoardJob["budget"]) {
  return budget.kind === "range"
    ? `৳${budget.minimum.toLocaleString("en-US")}–৳${budget.maximum.toLocaleString("en-US")} / month`
    : "Budget to be discussed";
}

export function getJobBoardPagination({ page, pageSize, totalCount }: { page: number; pageSize: number; totalCount: number }) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  return { totalPages, previousPage: page > 1 ? page - 1 : null, nextPage: page < totalPages ? page + 1 : null };
}

export function buildJobBoardPageLinks({ page, totalPages }: { page: number; totalPages: number }): Array<number | "ellipsis"> {
  const lastPage = Math.max(1, totalPages);
  const currentPage = Math.min(Math.max(1, page), lastPage);
  if (lastPage <= 5) return Array.from({ length: lastPage }, (_, index) => index + 1);
  if (currentPage <= 2) return [1, 2, 3, "ellipsis", lastPage];
  if (currentPage >= lastPage - 1) return [1, "ellipsis", lastPage - 2, lastPage - 1, lastPage];
  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", lastPage];
}

export function getTutorInterestPresentation(status?: TutorInterestStatus) {
  if (!status) return { statusLabel: null, description: null, action: "express" as const, actionLabel: "Apply Now" };
  if (status === "interested") return { statusLabel: "Application submitted", description: null, action: "withdraw" as const, actionLabel: "Withdraw application" };
  if (status === "shortlisted") return { statusLabel: "Shortlisted", description: null, action: "withdraw" as const, actionLabel: "Withdraw application" };
  if (status === "declined") return { statusLabel: "Not selected", description: "This application was not selected for the current match.", action: null, actionLabel: null };
  if (status === "matched") return { statusLabel: "Matched", description: null, action: null, actionLabel: null };
  return { statusLabel: "Application withdrawn", description: "You can apply again while this tuition remains available.", action: "express" as const, actionLabel: "Apply again" };
}

export function formatJobBoardTuitionType(type: TuitionType) {
  return type === "home" ? "Home Tutoring" : type === "online" ? "Online Tutoring" : type === "group" ? "Group Tutoring" : type === "package" ? "Package Tutoring" : "Home and Online Tutoring";
}

function formatTutorGender(gender: TutorGender) {
  return gender === "any" ? "Any tutor preferred" : gender === "female" ? "Female tutor preferred" : "Male tutor preferred";
}

type JobBoardStudentFacts = {
  studentCount: number;
  studentGender?: "male" | "female" | null;
  preferredTutorGender: TutorGender;
};

export function getJobBoardCardFacts(input: JobBoardStudentFacts) {
  return [
    { label: "Number of Students", value: `${input.studentCount} student${input.studentCount === 1 ? "" : "s"}` },
    { label: "Preferred Tutor", value: formatTutorGender(input.preferredTutorGender) },
  ];
}

export function getJobBoardDetailFacts(input: JobBoardStudentFacts) {
  return [
    { label: "Number of Students", value: `${input.studentCount} student${input.studentCount === 1 ? "" : "s"}` },
    ...(input.studentGender ? [{ label: "Student Gender", value: input.studentGender === "female" ? "Female" : "Male" }] : []),
    { label: "Preferred Tutor", value: formatTutorGender(input.preferredTutorGender) },
  ];
}

export function getJobBoardApplicationCopy({ isTutor, isApprovedTutor }: { isTutor: boolean; isApprovedTutor: boolean }) {
  if (isTutor && isApprovedTutor) return { label: "Apply Now", description: null };
  return isTutor
    ? { label: "Apply Now", description: "Profile approval is required before applying." }
    : { label: "Apply Now", description: "Sign in as a Tutor to continue." };
}

export const JOB_BOARD_DISCLOSURE_NOTICE = "Only Student Gender may be shown. Student name, Guardian phone, email, exact address, and private notes are not available here.";

function formatJobBoardDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

export function JobBoardContent({ embedded = false }: { embedded?: boolean }) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [filters, setFilters] = useState<JobBoardFilterState>(DEFAULT_FILTERS);
  const [activeJob, setActiveJob] = useState<JobBoardJob | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);
  const isTutor = user?.role === "tutor";
  const utils = trpc.useUtils();
  const queryInput = useMemo(() => buildJobBoardQuery(filters), [filters]);
  const citiesQuery = trpc.catalog.searchGuardianLocations.useQuery({ query: "", limit: 50, types: ["city"] });
  const locationsQuery = trpc.catalog.searchRegistrationLocations.useQuery({ cityId: filters.cityId, query: "", limit: 300 }, { enabled: Boolean(filters.cityId) });
  const jobsQuery = trpc.jobBoard.list.useQuery(queryInput);
  const tutorInterestsQuery = trpc.tutor.myJobInterests.useQuery(undefined, { enabled: isTutor, retry: false });
  const tutorProfileQuery = trpc.tutor.getMyProfile.useQuery(undefined, { enabled: isTutor, retry: false });
  const expressInterest = trpc.jobBoard.expressInterest.useMutation({ onSuccess: () => utils.tutor.myJobInterests.invalidate() });
  const withdrawInterest = trpc.jobBoard.withdrawInterest.useMutation({ onSuccess: () => utils.tutor.myJobInterests.invalidate() });
  const jobs = (jobsQuery.data?.items ?? []) as JobBoardJob[];
  const totalCount = jobsQuery.data?.totalCount ?? 0;
  const pagination = getJobBoardPagination({ page: queryInput.page, pageSize: PAGE_SIZE, totalCount });
  const pageLinks = buildJobBoardPageLinks({ page: queryInput.page, totalPages: pagination.totalPages });
  const cities = citiesQuery.data ?? [];
  const locations = locationsQuery.data ?? [];
  const tutorInterestByJobId = useMemo(() => new Map((tutorInterestsQuery.data ?? []).map(interest => [interest.publicJobId, { interestId: interest.interestId, status: interest.status as TutorInterestStatus }])), [tutorInterestsQuery.data]);
  const isInterestSaving = expressInterest.isPending || withdrawInterest.isPending;
  const isApprovedTutor = isTutor && tutorProfileQuery.data?.profileStatus === "approved";

  useEffect(() => {
    if (filters.page > pagination.totalPages) setFilters(current => ({ ...current, page: pagination.totalPages }));
  }, [filters.page, pagination.totalPages]);

  useEffect(() => {
    const returnPath = getTutorApplyReturnFromLocation(location);
    if (!returnPath || activeJob || !jobs.length) return;
    const jobId = new URLSearchParams(returnPath.split("?")[1]).get("job");
    const matchingJob = jobs.find(job => job.jobId === jobId);
    if (matchingJob) setActiveJob(matchingJob);
  }, [activeJob, jobs, location]);

  const update = <K extends keyof JobBoardFilterState>(key: K, value: JobBoardFilterState[K]) => {
    setFilters(current => ({ ...current, [key]: key === "page" ? value : value, ...(key === "cityId" ? { locationId: "" } : {}), ...(key === "page" ? {} : { page: 1 }) }));
  };
  const reset = () => setFilters(DEFAULT_FILTERS);
  const appliedFilterCount = [filters.cityId, filters.locationId, filters.tuitionType, filters.preferredTutorGender, filters.category, filters.subject, filters.budgetMaximum, filters.jobId].filter(Boolean).length;
  const updateInterest = (job: JobBoardJob) => {
    const interest = tutorInterestByJobId.get(job.jobId);
    const presentation = getTutorInterestPresentation(interest?.status);
    if (!presentation.action || isInterestSaving) return;
    setInterestError(null);
    const onError = (error: unknown) => setInterestError(error instanceof Error ? error.message : "Your application could not be updated. Please try again.");
    if (presentation.action === "withdraw" && interest) withdrawInterest.mutate({ interestId: interest.interestId }, { onError });
    else expressInterest.mutate({ tutorJobId: job.id }, { onError });
  };

  const startApplication = (job: JobBoardJob) => {
    if (!isTutor) {
      navigate(buildTutorApplySignInPath(job.jobId));
      return;
    }

    if (!isApprovedTutor) {
      const returnPath = buildTutorApplyReturnPath(job.jobId);
      if (typeof window !== "undefined") storeTutorApplyReturnPath(window.sessionStorage, returnPath);
      navigate(buildTutorApplyProfilePath(returnPath));
      return;
    }

    updateInterest(job);
  };

  return <section className={embedded ? "space-y-5" : "mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12"} aria-label="Available tuition Job Board">
    <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dce8f0] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(38,83,117,0.05)] sm:px-5">
      <div><p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#5a88a8]">Live Jobs</p><p aria-live="polite" className="mt-0.5 text-2xl font-extrabold tracking-[-0.03em] text-[#173b60]">{jobsQuery.isLoading ? "—" : totalCount}</p><p className="text-xs font-semibold text-[#55738a]">{appliedFilterCount ? "matching live jobs" : "currently live"}</p></div>
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}><button type="button" onClick={() => setFilterOpen(true)} aria-label="Open advanced filters" aria-haspopup="dialog" aria-expanded={filterOpen} className="motion-interactive inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#cfe0eb] bg-[#f8fcff] px-3 text-sm font-bold text-[#245676] hover:border-[#9fcbe6] hover:bg-[#eef8ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167ddd] focus-visible:ring-offset-2"><SlidersHorizontal className="h-4 w-4" aria-hidden="true" /><span>Advanced filters</span>{appliedFilterCount ? <span className="grid size-5 place-items-center rounded-full bg-[#167ddd] text-[11px] text-white">{appliedFilterCount}</span> : null}</button><SheetContent side="right" className="w-full overflow-y-auto border-[#dce8f0] p-0 sm:max-w-md"><SheetHeader className="border-b border-[#e4edf3] pr-12"><SheetTitle className="flex items-center gap-2 text-[#173b60]"><Filter className="h-4 w-4 text-[#167ddd]" />Advanced filters</SheetTitle><SheetDescription>Refine live jobs without exposing private Guardian contact or address details.</SheetDescription></SheetHeader><div className="px-4 py-5"><JobBoardFilters filters={filters} update={update} cities={cities} locations={locations} /></div><SheetFooter className="border-t border-[#e4edf3] bg-white"><button type="button" onClick={reset} disabled={!appliedFilterCount} className="motion-interactive min-h-10 rounded-xl border border-[#cfe0eb] px-4 text-sm font-bold text-[#245676] hover:bg-[#f4fbff] disabled:cursor-not-allowed disabled:opacity-50">Clear all</button><SheetClose asChild><button type="button" className="motion-interactive min-h-10 rounded-xl bg-[#167ddd] px-4 text-sm font-bold text-white hover:bg-[#0b6db0]">Done</button></SheetClose></SheetFooter></SheetContent></Sheet>
    </header>

    <div className="min-w-0">
        {jobsQuery.isError ? <div role="alert" className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800"><p className="font-bold">Available tuition could not be loaded right now.</p><p className="mt-1">Please try again shortly. No private Guardian details are displayed in this view.</p><button type="button" onClick={() => jobsQuery.refetch()} disabled={jobsQuery.isFetching} data-motion={jobsQuery.isFetching ? "pending" : undefined} className="motion-interactive mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-4 py-2 font-bold text-rose-800 ring-1 ring-inset ring-rose-200 hover:bg-rose-100 disabled:cursor-progress disabled:opacity-60">{jobsQuery.isFetching ? "Trying again…" : "Try again"}</button></div> : null}
        {jobsQuery.isFetching && !jobsQuery.isLoading ? <div role="status" aria-live="polite" className="mb-4 flex items-center gap-2 rounded-2xl border border-[#cfe8f7] bg-[#f2faff] px-4 py-3 text-sm font-semibold text-[#245676]"><span className="inline-block size-2 animate-pulse rounded-full bg-[#167ddd]" aria-hidden="true" />Updating results…</div> : null}
        {interestError ? <div role="alert" className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><p className="font-bold">Your Job Board application was not updated.</p><p className="mt-1">{interestError}</p></div> : null}
        {!jobsQuery.isLoading && !jobsQuery.isError && jobs.length === 0 ? <EmptyBoard onClear={appliedFilterCount ? reset : undefined} /> : null}
        {jobsQuery.isLoading ? <div className="grid gap-4 md:grid-cols-2" aria-label="Loading available tuition" aria-busy="true">{Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-3xl border border-[#e4eef4] bg-white p-5" aria-hidden="true"><Skeleton className="h-6 w-28" /><Skeleton className="mt-5 h-6 w-11/12" /><Skeleton className="mt-2 h-4 w-2/3" /><div className="mt-5 grid grid-cols-2 gap-4 border-y border-[#e7eef3] py-4"><Skeleton className="h-9" /><Skeleton className="h-9" /><Skeleton className="h-9" /><Skeleton className="h-9" /></div><Skeleton className="mt-5 h-10 w-full" /></div>)}</div> : null}
      {jobs.length ? <div className="grid gap-4 md:grid-cols-2">{jobs.map(job => <JobCard key={job.id} job={job} onDetails={() => setActiveJob(job)} interest={isTutor ? tutorInterestByJobId.get(job.jobId) : undefined} isTutor={isTutor} isApprovedTutor={isApprovedTutor} isInterestSaving={isInterestSaving} onInterestAction={() => startApplication(job)} />)}</div> : null}
      {totalCount > PAGE_SIZE ? <nav className="mt-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dce8f0] bg-white p-3" aria-label="Job Board pagination" aria-busy={jobsQuery.isFetching}><button type="button" disabled={!pagination.previousPage || jobsQuery.isFetching} onClick={() => update("page", pagination.previousPage ?? 1)} className="motion-interactive inline-flex min-h-10 items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-[#245676] hover:bg-[#f4fbff] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button><ol className="flex items-center gap-1" aria-label={`Page ${queryInput.page} of ${pagination.totalPages}`}>{pageLinks.map((pageLink, index) => pageLink === "ellipsis" ? <li key={`ellipsis-${index}`} aria-hidden="true" className="px-1 text-sm font-bold text-[#7893a6]">…</li> : <li key={pageLink}><button type="button" onClick={() => update("page", pageLink)} disabled={jobsQuery.isFetching} aria-current={pageLink === queryInput.page ? "page" : undefined} aria-label={`Go to page ${pageLink}`} className={`motion-interactive grid min-h-10 min-w-10 place-items-center rounded-xl px-2 text-sm font-bold disabled:cursor-progress ${pageLink === queryInput.page ? "bg-[#167ddd] text-white" : "text-[#245676] hover:bg-[#f4fbff]"}`}>{pageLink}</button></li>)}</ol><button type="button" disabled={!pagination.nextPage || jobsQuery.isFetching} onClick={() => update("page", pagination.nextPage ?? queryInput.page)} className="motion-interactive inline-flex min-h-10 items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-[#245676] hover:bg-[#f4fbff] disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button></nav> : null}
    </div>
    {activeJob ? <JobDetails job={activeJob} onClose={() => setActiveJob(null)} interest={isTutor ? tutorInterestByJobId.get(activeJob.jobId) : undefined} isTutor={isTutor} isApprovedTutor={isApprovedTutor} isInterestSaving={isInterestSaving} onInterestAction={() => startApplication(activeJob)} /> : null}
  </section>;
}

function FilterLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-[#496a82]"><span>{label}</span><span className="mt-1.5 block">{children}</span></label>;
}

function JobBoardFilters({ filters, update, cities, locations }: { filters: JobBoardFilterState; update: <K extends keyof JobBoardFilterState>(key: K, value: JobBoardFilterState[K]) => void; cities: Array<{ id: string; label: string }>; locations: Array<{ id: string; label: string }> }) {
  return <div className="space-y-4">
    <FilterLabel label="Job ID"><input value={filters.jobId} onChange={event => update("jobId", event.target.value)} placeholder="e.g. CT-JOB-000042" className="job-board-input" /></FilterLabel>
    <FilterLabel label="Tuition type"><select value={filters.tuitionType} onChange={event => update("tuitionType", event.target.value as JobBoardFilterState["tuitionType"])} className="job-board-input"><option value="">All types</option><option value="home">Home Tutoring</option><option value="online">Online Tutoring</option><option value="group">Group Tutoring</option><option value="package">Package Tutoring</option><option value="both">Home and Online Tutoring (legacy)</option></select></FilterLabel>
    <FilterLabel label="Curriculum / category"><input value={filters.category} onChange={event => update("category", event.target.value)} placeholder="e.g. English Medium" className="job-board-input" /></FilterLabel>
    <FilterLabel label="Subject"><input value={filters.subject} onChange={event => update("subject", event.target.value)} placeholder="e.g. Mathematics" className="job-board-input" /></FilterLabel>
    <FilterLabel label="Preferred Tutor"><select value={filters.preferredTutorGender} onChange={event => update("preferredTutorGender", event.target.value as JobBoardFilterState["preferredTutorGender"])} className="job-board-input"><option value="">Any Tutor</option><option value="female">Female Tutor</option><option value="male">Male Tutor</option></select></FilterLabel>
    <FilterLabel label="Maximum monthly budget"><input inputMode="numeric" value={filters.budgetMaximum} onChange={event => update("budgetMaximum", event.target.value.replace(/\D/g, ""))} placeholder="e.g. 10000" className="job-board-input" /></FilterLabel>
    <FilterLabel label="City"><select value={filters.cityId} onChange={event => update("cityId", event.target.value)} className="job-board-input"><option value="">All Cities</option>{cities.map(city => <option key={city.id} value={city.id}>{city.label}</option>)}</select></FilterLabel>
    <FilterLabel label="Area / Sub-area"><select disabled={!filters.cityId} value={filters.locationId} onChange={event => update("locationId", event.target.value)} className="job-board-input disabled:cursor-not-allowed disabled:bg-slate-50"><option value="">{filters.cityId ? "All areas" : "Choose a City first"}</option>{locations.map(location => <option key={location.id} value={location.id}>{location.label}</option>)}</select></FilterLabel>
    <p className="rounded-2xl bg-[#f5faff] p-3 text-xs leading-5 text-[#52748d]"><ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-[#167ddd]" />Locations are shown at area level only. Exact family addresses are coordinated privately.</p>
  </div>;
}

export function TutorInterestControl({ interest, isInterestSaving, onAction }: { interest?: TutorJobInterest; isInterestSaving: boolean; onAction: () => void }) {
  const presentation = getTutorInterestPresentation(interest?.status);
  return <div className="mt-3 rounded-2xl border border-[#cfe8f7] bg-[#f4fbff] p-3">{presentation.statusLabel || presentation.description ? <div className="flex items-start gap-2"><HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-[#167ddd]" /><div>{presentation.statusLabel ? <p className="text-sm font-extrabold text-[#245676]">{presentation.statusLabel}</p> : null}{presentation.description ? <p className="mt-0.5 text-xs leading-5 text-[#55738a]">{presentation.description}</p> : null}</div></div> : null}{presentation.action ? <button type="button" onClick={onAction} disabled={isInterestSaving} data-motion={isInterestSaving ? "pending" : undefined} aria-busy={isInterestSaving} className="motion-interactive inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#167ddd] px-3 text-sm font-bold text-white hover:bg-[#0b6db0] disabled:cursor-progress disabled:opacity-60">{isInterestSaving ? "Saving application…" : presentation.actionLabel}</button> : null}</div>;
}

function ApplicationControl({ interest, isTutor, isApprovedTutor, isInterestSaving, onAction }: { interest?: TutorJobInterest; isTutor: boolean; isApprovedTutor: boolean; isInterestSaving: boolean; onAction: () => void }) {
  if (isTutor && isApprovedTutor) return <TutorInterestControl interest={interest} isInterestSaving={isInterestSaving} onAction={onAction} />;
  const copy = getJobBoardApplicationCopy({ isTutor, isApprovedTutor });
  return <div className="mt-3 rounded-2xl border border-[#cfe8f7] bg-[#f4fbff] p-3"><div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#167ddd]" /><p className="text-xs leading-5 text-[#55738a]">{copy.description}</p></div><button type="button" onClick={onAction} className="motion-interactive mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#167ddd] px-3 text-sm font-bold text-white hover:bg-[#0b6db0]">{copy.label}</button></div>;
}

function JobCard({ job, onDetails, interest, isTutor, isApprovedTutor, isInterestSaving, onInterestAction }: { job: JobBoardJob; onDetails: () => void; interest?: TutorJobInterest; isTutor: boolean; isApprovedTutor: boolean; isInterestSaving: boolean; onInterestAction: () => void }) {
  const directionUrl = buildMapsDirectionUrl(job.directionLabel);
  const cardFacts = getJobBoardCardFacts(job);
  return <article className="flex min-w-0 flex-col rounded-3xl border border-[#dce8f0] bg-white p-5 shadow-[0_12px_30px_rgba(38,83,117,0.06)] transition-[transform,box-shadow,border-color] duration-200 motion-safe:hover:-translate-y-1 hover:border-[#abd4eb] hover:shadow-[0_18px_38px_rgba(38,83,117,0.12)] focus-within:border-[#7dbce1] focus-within:shadow-[0_18px_38px_rgba(38,83,117,0.12)] motion-reduce:transition-none"><div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-[#eaf6ff] px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-[#1475b5]">{job.jobId}</span><span className="rounded-full bg-[#f2f8fa] px-2.5 py-1 text-[11px] font-bold text-[#55738a]">{formatJobBoardTuitionType(job.tuitionType)}</span></div><h2 className="mt-4 text-lg font-extrabold leading-6 tracking-[-0.02em] text-[#173b60]">{job.title}</h2><dl className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4 border-y border-[#e7eef3] py-4 text-sm"><JobMeta label="Posted date" value={formatJobBoardDate(job.publishedAt)} /><JobMeta label="Subjects" value={job.subjects.length ? job.subjects.join(", ") : "Subjects to be confirmed"} />{cardFacts.map(fact => <JobMeta key={fact.label} label={fact.label} value={fact.value} />)}<JobMeta label="Tutoring days" value={`${job.daysPerWeek} days/week`} /><JobMeta label="Salary" value={formatJobBudget(job.budget)} /><JobMeta label="Location" value={job.locationLabel ?? (job.tuitionType === "online" ? "Online" : "Area to be coordinated")} /></dl><ApplicationControl interest={interest} isTutor={isTutor} isApprovedTutor={isApprovedTutor} isInterestSaving={isInterestSaving} onAction={onInterestAction} /><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={onDetails} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#167ddd] px-3 text-sm font-bold text-white hover:bg-[#0b6db0]"><BriefcaseBusiness className="h-4 w-4" /> View details</button>{directionUrl ? <a href={directionUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#c9e2f2] px-3 text-sm font-bold text-[#167ddd] hover:bg-[#f4fbff]"><Compass className="h-4 w-4" /> Direction</a> : null}</div></article>;
}

function JobMeta({ label, value }: { label: string; value: string }) { return <div><dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#87a1b2]">{label}</dt><dd className="mt-1 text-sm font-semibold leading-5 text-[#355d79]">{value}</dd></div>; }

function EmptyBoard({ onClear }: { onClear?: () => void }) { return <div className="rounded-3xl border border-dashed border-[#c9dce8] bg-[radial-gradient(circle_at_50%_0%,#effaff,white_58%)] px-6 py-12 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf6ff] shadow-[0_9px_18px_rgba(22,125,221,.12)]"><BriefcaseBusiness className="h-7 w-7 text-[#167ddd]" /></div><p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#4c9ed8]">A careful match takes time</p><h2 className="mt-2 text-lg font-extrabold text-[#173b60]">No available tuition matches yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5c7a8f]">Only Guardian-confirmed, active opportunities appear here. Broaden your filters or check back as the team publishes newly verified tuition requirements.</p><div className="mx-auto mt-5 flex max-w-md flex-wrap justify-center gap-3">{onClear ? <button type="button" onClick={onClear} className="rounded-xl bg-[#eaf6ff] px-4 py-2 text-sm font-bold text-[#167ddd]">Clear filters</button> : null}<a href="https://wa.me/8801516131411" target="_blank" rel="noreferrer" className="rounded-xl border border-[#c9e2f2] bg-white px-4 py-2 text-sm font-bold text-[#167ddd]">Ask our team on WhatsApp</a></div><p className="mt-5 text-xs font-semibold text-[#6b899d]"><ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-[#248d69]" />Private Guardian contact details are only coordinated after a suitable match.</p></div>; }

function JobDetails({ job, onClose, interest, isTutor, isApprovedTutor, isInterestSaving, onInterestAction }: { job: JobBoardJob; onClose: () => void; interest?: TutorJobInterest; isTutor: boolean; isApprovedTutor: boolean; isInterestSaving: boolean; onInterestAction: () => void }) {
  const directionUrl = buildMapsDirectionUrl(job.directionLabel);
  const detailFacts = getJobBoardDetailFacts(job);
  return <div className="fixed inset-0 z-50 grid place-items-end bg-[#062946]/45 p-0 sm:place-items-center sm:p-6" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="job-detail-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#167ddd]">{job.jobId}</p><h2 id="job-detail-title" className="mt-2 text-xl font-extrabold leading-7 text-[#173b60]">{job.title}</h2></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-[#55738a] hover:bg-slate-100" aria-label="Close job details"><X className="h-5 w-5" /></button></div><div className="mt-6 grid gap-4 rounded-2xl bg-[#f7fbfd] p-5 sm:grid-cols-2"><JobMeta label="Posted Date" value={formatJobBoardDate(job.publishedAt)} /><JobMeta label="Subjects" value={job.subjects.join(", ") || "To be confirmed"} />{detailFacts.map(fact => <JobMeta key={fact.label} label={fact.label} value={fact.value} />)}<JobMeta label="Tutoring Days" value={`${job.daysPerWeek} days/week`} /><JobMeta label="Salary" value={formatJobBudget(job.budget)} /><JobMeta label="Location" value={job.locationLabel ?? (job.tuitionType === "online" ? "Online" : "Shared after coordination")} /><JobMeta label="Tuition Type" value={formatJobBoardTuitionType(job.tuitionType)} /><JobMeta label="Category" value={job.category} /><JobMeta label="Class / Course" value={job.classCourse} /></div><div className="mt-5 rounded-2xl border border-[#cfe8f7] bg-[#f2faff] p-4 text-sm leading-6 text-[#426981]"><MapPinned className="mr-1 inline h-4 w-4 text-[#167ddd]" />{JOB_BOARD_DISCLOSURE_NOTICE}</div><ApplicationControl interest={interest} isTutor={isTutor} isApprovedTutor={isApprovedTutor} isInterestSaving={isInterestSaving} onAction={onInterestAction} /><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-[#cfe0eb] px-4 text-sm font-bold text-[#315b79]">Close</button>{directionUrl ? <a href={directionUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#167ddd] px-4 text-sm font-bold text-white hover:bg-[#0b6db0]"><MapPinned className="h-4 w-4" /> View area in Google Maps <ExternalLink className="h-3.5 w-3.5" /></a> : null}</div></section></div>;
}

export default function JobBoard() {
  return <div className="min-h-screen bg-[#f4f8fb] text-[#173b60]"><SiteHeader /><main><JobBoardContent /></main><SiteFooter /></div>;
}
