import { useSiteContact } from "@/lib/siteContent";
import { formatSalaryAmount } from "@shared/salary-amount";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SharedJobCard from "@/components/JobCard";
import ChipMultiSelect, { type ChipOption } from "@/components/ChipMultiSelect";
import SharedJobDetailsModal from "@/components/JobDetailsModal";
import { formatPostedDate } from "@shared/job-card";
import { buildTutorApplyProfilePath, buildTutorApplyReturnPath, buildTutorApplySignInPath, getTutorApplyReturnFromLocation, storeTutorApplyReturnPath } from "@/lib/tutorApplyReturn";
import { BriefcaseBusiness, Check, ChevronLeft, ChevronRight, Compass, ExternalLink, HeartHandshake, LayoutGrid, MapPinned, ShieldCheck, SlidersHorizontal, X, XCircle } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

type TutorGender = "male" | "female" | "any";
type TuitionType = "home" | "online" | "both" | "group" | "package";
type TutorInterestStatus = "interested" | "shortlisted" | "declined" | "matched" | "withdrawn";
type TutorJobInterest = { interestId: number; status: TutorInterestStatus; appliedAt: Date | string };

/**
 * What the filter panel holds. Six fields take several values, and every one
 * of them is a list of ids rather than a joined string, so the panel and the
 * server input agree on what "empty" means.
 */
export type JobBoardFilterState = {
  page: number;
  /** `yyyy-mm-dd`, as a date input gives it. */
  postedFrom: string;
  postedTo: string;
  country: string;
  cityId: string;
  locationIds: string[];
  tuitionTypes: string[];
  daysPerWeek: string[];
  categories: string[];
  classCourses: string[];
  subjects: string[];
  studentGender: "" | "male" | "female";
  preferredTutorGender: "" | TutorGender;
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
  budgetAmount: number | null;
  /** What the Admin approved for publication, not the Guardian's raw note. */
  notes: string | null;
  country: string;
  cityLocationId: string | null;
  locationId: string | null;
  locationLabel: string | null;
  directionLabel: string | null;
  publishedAt: Date | string;
  expiresAt: Date | string;
};

export const DEFAULT_FILTERS: JobBoardFilterState = {
  page: 1,
  postedFrom: "",
  postedTo: "",
  country: "",
  cityId: "",
  locationIds: [],
  tuitionTypes: [],
  daysPerWeek: [],
  categories: [],
  classCourses: [],
  subjects: [],
  studentGender: "",
  preferredTutorGender: "",
  jobId: "",
};

/** The two ceilings the panel enforces; the server carries them as well. */
export const JOB_BOARD_LOCATION_LIMIT = 10;
export const JOB_BOARD_SUBJECT_LIMIT = 12;

const PAGE_SIZE = 20;

function optionalTrimmed(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

/**
 * The panel's state as the server wants it.
 *
 * An unused filter is left out rather than sent empty, so the server's own
 * `if (input.x)` reads the same for a blank box and a missing key. Dates go as
 * whole days: `from` from its first moment, `to` through its last, or a job
 * posted at noon on the `to` date would fall outside its own range.
 */
export function buildJobBoardQuery(filters: JobBoardFilterState) {
  const list = (values: string[]) => (values.length ? values : undefined);
  const from = optionalTrimmed(filters.postedFrom);
  const to = optionalTrimmed(filters.postedTo);
  return {
    page: Math.max(1, Math.floor(filters.page || 1)),
    pageSize: PAGE_SIZE,
    ...(from ? { postedFrom: new Date(`${from}T00:00:00`) } : {}),
    ...(to ? { postedTo: new Date(`${to}T23:59:59.999`) } : {}),
    ...(optionalTrimmed(filters.country) ? { country: optionalTrimmed(filters.country) } : {}),
    ...(optionalTrimmed(filters.cityId) ? { cityId: optionalTrimmed(filters.cityId) } : {}),
    ...(list(filters.locationIds) ? { locationIds: filters.locationIds } : {}),
    ...(list(filters.tuitionTypes) ? { tuitionTypes: filters.tuitionTypes as TuitionType[] } : {}),
    ...(list(filters.daysPerWeek) ? { daysPerWeek: filters.daysPerWeek.map(Number) } : {}),
    ...(list(filters.categories) ? { categories: filters.categories } : {}),
    ...(list(filters.classCourses) ? { classCourses: filters.classCourses } : {}),
    ...(list(filters.subjects) ? { subjects: filters.subjects } : {}),
    ...(filters.studentGender ? { studentGender: filters.studentGender } : {}),
    ...(filters.preferredTutorGender ? { preferredTutorGender: filters.preferredTutorGender } : {}),
    ...(optionalTrimmed(filters.jobId) ? { jobId: optionalTrimmed(filters.jobId) } : {}),
  };
}

/**
 * Keeps a selection honest when what it depends on changes.
 *
 * Choosing a City is what makes areas meaningful, and a Category is what makes
 * a Class meaningful, so dropping either has to take its children with it -
 * otherwise a filter no one can see goes on narrowing the board.
 */
export function reconcileJobBoardFilters(
  filters: JobBoardFilterState,
  options: { locationsByCity: Record<string, ChipOption[]>; classesByCategory: Record<string, string[]>; subjectsByClass: Record<string, string[]> },
): JobBoardFilterState {
  const allowedLocations = new Set((filters.cityId ? options.locationsByCity[filters.cityId] ?? [] : []).map(option => option.id));
  const allowedClasses = new Set(filters.categories.flatMap(category => options.classesByCategory[category] ?? []));
  const classCourses = filters.classCourses.filter(classCourse => allowedClasses.has(classCourse));
  const allowedSubjects = new Set(classCourses.flatMap(classCourse => options.subjectsByClass[classCourse] ?? []));
  return {
    ...filters,
    locationIds: filters.locationIds.filter(id => allowedLocations.has(id)),
    classCourses,
    subjects: filters.subjects.filter(subject => allowedSubjects.has(subject)),
  };
}

/** How many filters are actually narrowing the board. */
export function countJobBoardFilters(filters: JobBoardFilterState) {
  const { page, ...rest } = filters;
  return Object.values(rest).filter(value => (Array.isArray(value) ? value.length > 0 : Boolean(value))).length;
}

export function buildMapsDirectionUrl(directionLabel: string | null) {
  const area = directionLabel?.trim();
  return area ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${area}, Bangladesh`)}` : null;
}

export function formatJobBudget(budgetAmount: JobBoardJob["budgetAmount"]) {
  return formatSalaryAmount(budgetAmount);
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

/**
 * What the card's action shows once a Tutor has applied.
 *
 * An application already made is a fact, not an invitation, so the button
 * gives way to the word and the day it was made. Withdrawing stays in the
 * details dialog, where the application's own stage already is - it is the
 * rarer act, and it should not sit under the thumb on every card in the grid.
 *
 * A withdrawn application is not one any more, so that card offers the button
 * back, saying "Apply again" as the dialog does.
 */
export function getJobBoardAppliedState(interest?: { status: TutorInterestStatus; appliedAt: Date | string }) {
  if (!interest || interest.status === "withdrawn") return null;
  // `formatPostedDate`, not this page's own formatter: the chip sits on the
  // card beside "Posted : 09 Sep 2026" and the two dates are read together.
  return { label: "Applied", appliedOn: formatPostedDate(interest.appliedAt) };
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
  // Two states, because the panel has an Apply button: `draft` is what the
  // panel holds and `filters` is what the board is actually showing. Only
  // Apply and Clear move one into the other.
  const [filters, setFilters] = useState<JobBoardFilterState>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState<JobBoardFilterState>(DEFAULT_FILTERS);
  const [activeJob, setActiveJob] = useState<JobBoardJob | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);
  const isTutor = user?.role === "tutor";
  const utils = trpc.useUtils();
  const queryInput = useMemo(() => buildJobBoardQuery(filters), [filters]);
  const citiesQuery = trpc.catalog.searchGuardianLocations.useQuery({ query: "", limit: 50, types: ["city"] });
  const locationsQuery = trpc.catalog.searchRegistrationLocations.useQuery({ cityId: filters.cityId, query: "", limit: 300 }, { enabled: Boolean(filters.cityId) });
  const jobsQuery = trpc.jobBoard.list.useQuery(queryInput);
  const filterOptionsQuery = trpc.jobBoard.filterOptions.useQuery();
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
  const tutorInterestByJobId = useMemo(() => new Map((tutorInterestsQuery.data ?? []).map(interest => [interest.publicJobId, { interestId: interest.interestId, status: interest.status as TutorInterestStatus, appliedAt: interest.createdAt }])), [tutorInterestsQuery.data]);
  /**
   * Which job is being applied to, not merely whether one is.
   *
   * A single page-wide "saving" flag put every card in the grid into the
   * pending state at once, so one click read as though every button had been
   * pressed. Only the card whose job id is here reacts; the rest stay as they
   * were, and the guard below still stops a second application landing while
   * the first is in flight.
   */
  const [savingJobId, setSavingJobId] = useState<number | null>(null);
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

  const goToPage = (page: number) => setFilters(current => ({ ...current, page }));
  const applyFilters = () => setFilters(draft);
  const clearFilters = () => { setDraft(DEFAULT_FILTERS); setFilters(DEFAULT_FILTERS); };
  const appliedFilterCount = countJobBoardFilters(filters);
  // The 'from' date cannot be later than the 'to' date; the server refuses it
  // too, so this only saves the round trip.
  const datesOutOfOrder = Boolean(draft.postedFrom && draft.postedTo && draft.postedFrom > draft.postedTo);
  const updateInterest = (job: JobBoardJob) => {
    const interest = tutorInterestByJobId.get(job.jobId);
    const presentation = getTutorInterestPresentation(interest?.status);
    if (!presentation.action || isInterestSaving) return;
    setInterestError(null);
    setSavingJobId(job.id);
    const settle = {
      onError: (error: unknown) => setInterestError(error instanceof Error ? error.message : "Your application could not be updated. Please try again."),
      onSettled: () => setSavingJobId(null),
    };
    if (presentation.action === "withdraw" && interest) withdrawInterest.mutate({ interestId: interest.interestId }, settle);
    else expressInterest.mutate({ tutorJobId: job.id }, settle);
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
    <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce8f0] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(38,83,117,0.05)] sm:px-5">
      <div><p className="text-2xs font-extrabold uppercase tracking-[0.14em] text-[#5a88a8]">Live Jobs</p><p aria-live="polite" className="mt-0.5 text-2xl font-extrabold tracking-[-0.03em] text-j-ink">{jobsQuery.isLoading ? "—" : totalCount}</p><p className="text-xs font-semibold text-[#55738a]">{appliedFilterCount ? "matching live jobs" : "currently live"}</p></div>
      <button
        type="button"
        onClick={() => setFilterOpen(current => !current)}
        aria-expanded={filterOpen}
        aria-controls="job-board-filters"
        className="motion-interactive inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#cfe0eb] bg-j-surface-sunken px-3 text-sm font-bold text-[#245676] hover:border-[#9fcbe6] hover:bg-[#eef8ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent focus-visible:ring-offset-2"
      ><SlidersHorizontal className="h-4 w-4" aria-hidden="true" /><span>Filter</span>{appliedFilterCount ? <span className="grid size-5 place-items-center rounded-full bg-j-accent text-2xs text-white">{appliedFilterCount}</span> : null}</button>
    </header>

    {/* Inline rather than a drawer: twelve fields want the width of the page,
        and the panel carries its own count and its own way out. */}
    {filterOpen ? <section id="job-board-filters" aria-label="Job Board filters" className="rounded-xl border border-[#dce8f0] bg-[#f7fbfe] p-4 shadow-[0_10px_24px_rgba(38,83,117,0.05)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#e4edf3] pb-3">
        <p className="inline-flex items-center gap-2 text-sm text-[#55738a]"><LayoutGrid className="h-4 w-4 text-j-accent" aria-hidden="true" /><strong className="font-extrabold text-j-ink">{jobsQuery.isLoading ? "—" : totalCount}</strong> jobs found</p>
        <button type="button" onClick={() => setFilterOpen(false)} className="motion-interactive inline-flex min-h-10 items-center gap-2 rounded-xl bg-j-accent px-4 text-sm font-bold text-white hover:bg-j-accent-hover"><XCircle className="h-4 w-4" aria-hidden="true" /> Close</button>
      </div>

      <JobBoardFilters draft={draft} setDraft={setDraft} options={filterOptionsQuery.data ?? EMPTY_OPTIONS} />

      {datesOutOfOrder ? <p role="alert" className="mt-3 text-xs font-semibold text-[#bd3535]">The 'from' date cannot be later than the 'to' date.</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={clearFilters} className="motion-interactive min-h-10 rounded-xl bg-[#d43c3c] px-5 text-sm font-bold text-white hover:bg-[#b93232]">Clear</button>
        <button type="button" onClick={applyFilters} disabled={datesOutOfOrder} className="motion-interactive min-h-10 rounded-xl bg-j-accent px-5 text-sm font-bold text-white hover:bg-j-accent-hover disabled:cursor-not-allowed disabled:opacity-50">Apply</button>
      </div>
    </section> : null}

    <div className="min-w-0">
        {jobsQuery.isError ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800"><p className="font-bold">Available tuition could not be loaded right now.</p><p className="mt-1">Please try again shortly. No private Guardian details are displayed in this view.</p><button type="button" onClick={() => jobsQuery.refetch()} disabled={jobsQuery.isFetching} data-motion={jobsQuery.isFetching ? "pending" : undefined} className="motion-interactive mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-4 py-2 font-bold text-rose-800 ring-1 ring-inset ring-rose-200 hover:bg-rose-100 disabled:cursor-progress disabled:opacity-60">{jobsQuery.isFetching ? "Trying again…" : "Try again"}</button></div> : null}
        {jobsQuery.isFetching && !jobsQuery.isLoading ? <div role="status" aria-live="polite" className="mb-4 flex items-center gap-2 rounded-xl border border-[#cfe8f7] bg-[#f2faff] px-4 py-3 text-sm font-semibold text-[#245676]"><span className="inline-block size-2 animate-pulse rounded-full bg-j-accent" aria-hidden="true" />Updating results…</div> : null}
        {interestError ? <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><p className="font-bold">Your Job Board application was not updated.</p><p className="mt-1">{interestError}</p></div> : null}
        {!jobsQuery.isLoading && !jobsQuery.isError && jobs.length === 0 ? <EmptyBoard onClear={appliedFilterCount ? clearFilters : undefined} /> : null}
        {jobsQuery.isLoading ? <div className="grid gap-4 md:grid-cols-2" aria-label="Loading available tuition" aria-busy="true">{Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-xl border border-[#e4eef4] bg-white p-5" aria-hidden="true"><Skeleton className="h-6 w-28" /><Skeleton className="mt-5 h-6 w-11/12" /><Skeleton className="mt-2 h-4 w-2/3" /><div className="mt-5 grid grid-cols-2 gap-4 border-y border-[#e7eef3] py-4"><Skeleton className="h-9" /><Skeleton className="h-9" /><Skeleton className="h-9" /><Skeleton className="h-9" /></div><Skeleton className="mt-5 h-10 w-full" /></div>)}</div> : null}
      {jobs.length ? <div className="grid gap-4 md:grid-cols-2">{jobs.map(job => <JobCard key={job.id} job={job} onDetails={() => setActiveJob(job)} interest={isTutor ? tutorInterestByJobId.get(job.jobId) : undefined} isTutor={isTutor} isApprovedTutor={isApprovedTutor} isInterestSaving={savingJobId === job.id} onInterestAction={() => startApplication(job)} />)}</div> : null}
      {totalCount > PAGE_SIZE ? <nav className="mt-7 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce8f0] bg-white p-3" aria-label="Job Board pagination" aria-busy={jobsQuery.isFetching}><button type="button" disabled={!pagination.previousPage || jobsQuery.isFetching} onClick={() => goToPage(pagination.previousPage ?? 1)} className="motion-interactive inline-flex min-h-10 items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-[#245676] hover:bg-[#f4fbff] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button><ol className="flex items-center gap-1" aria-label={`Page ${queryInput.page} of ${pagination.totalPages}`}>{pageLinks.map((pageLink, index) => pageLink === "ellipsis" ? <li key={`ellipsis-${index}`} aria-hidden="true" className="px-1 text-sm font-bold text-[#7893a6]">…</li> : <li key={pageLink}><button type="button" onClick={() => goToPage(pageLink)} disabled={jobsQuery.isFetching} aria-current={pageLink === queryInput.page ? "page" : undefined} aria-label={`Go to page ${pageLink}`} className={`motion-interactive grid min-h-10 min-w-10 place-items-center rounded-xl px-2 text-sm font-bold disabled:cursor-progress ${pageLink === queryInput.page ? "bg-j-accent text-white" : "text-[#245676] hover:bg-[#f4fbff]"}`}>{pageLink}</button></li>)}</ol><button type="button" disabled={!pagination.nextPage || jobsQuery.isFetching} onClick={() => goToPage(pagination.nextPage ?? queryInput.page)} className="motion-interactive inline-flex min-h-10 items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-[#245676] hover:bg-[#f4fbff] disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button></nav> : null}
    </div>
    {activeJob ? <JobDetails job={activeJob} onClose={() => setActiveJob(null)} interest={isTutor ? tutorInterestByJobId.get(activeJob.jobId) : undefined} isTutor={isTutor} isApprovedTutor={isApprovedTutor} isInterestSaving={savingJobId === activeJob.id} onInterestAction={() => startApplication(activeJob)} /> : null}
  </section>;
}

function FilterLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-[#496a82]"><span>{label}</span><span className="mt-1.5 block">{children}</span></label>;
}

type JobBoardFilterOptions = {
  countries: string[];
  tuitionTypes: string[];
  daysPerWeek: number[];
  cities: ChipOption[];
  locationsByCity: Record<string, ChipOption[]>;
  classesByCategory: Record<string, string[]>;
  subjectsByClass: Record<string, string[]>;
};

const EMPTY_OPTIONS: JobBoardFilterOptions = { countries: [], tuitionTypes: [], daysPerWeek: [], cities: [], locationsByCity: {}, classesByCategory: {}, subjectsByClass: {} };

const asChips = (values: readonly string[]): ChipOption[] => values.map(value => ({ id: value, label: value }));

/**
 * A date box that says what it is for.
 *
 * A native date input has no placeholder - it shows the locale mask instead,
 * so two of them side by side both read "mm/dd/yyyy" and neither says which
 * end of the range it is. It starts as a text box carrying its own label and
 * becomes a date picker the moment it is focused or holds a value.
 */
function DateField({ label, value, onChange, min, max }: { label: string; value: string; onChange: (value: string) => void; min?: string; max?: string }) {
  const [focused, setFocused] = useState(false);
  return <input
    type={focused || value ? "date" : "text"}
    aria-label={label}
    placeholder={label}
    value={value}
    min={min}
    max={max}
    onFocus={() => setFocused(true)}
    onBlur={() => setFocused(false)}
    onChange={event => onChange(event.target.value)}
    className={`h-11 w-full rounded-xl border border-[#dbe7ef] bg-white px-3 text-sm outline-none placeholder:text-[#8fa3b4] focus:border-j-accent focus:ring-2 focus:ring-sky-100 ${value ? "text-j-ink" : "text-[#8fa3b4]"}`}
  />;
}
function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: ChipOption[] }) {
  return <select aria-label={label} value={value} onChange={event => onChange(event.target.value)} className={`h-11 w-full rounded-xl border border-[#dbe7ef] bg-white px-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100 ${value ? "text-j-ink" : "text-[#8fa3b4]"}`}>
    <option value="">{label}</option>
    {options.map(option => <option key={option.id} value={option.id} className="text-j-ink">{option.label}</option>)}
  </select>;
}

/**
 * The Job Board's filters, all of them on one panel.
 *
 * The four that depend on something else say so by going quiet rather than by
 * explaining themselves: Location waits for a City, Class for a Category,
 * Subject for a Class. What each one may offer comes from the jobs that are
 * actually live, so nothing here can be chosen that returns an empty board.
 */
export function JobBoardFilters({ draft, setDraft, options }: {
  draft: JobBoardFilterState;
  setDraft: (next: JobBoardFilterState) => void;
  options: JobBoardFilterOptions;
}) {
  const set = (change: Partial<JobBoardFilterState>) =>
    setDraft(reconcileJobBoardFilters({ ...draft, ...change, page: 1 }, options));

  const locationOptions = draft.cityId ? options.locationsByCity[draft.cityId] ?? [] : [];
  const classOptions = asChips(Array.from(new Set(draft.categories.flatMap(category => options.classesByCategory[category] ?? []))).sort());
  const subjectOptions = asChips(Array.from(new Set(draft.classCourses.flatMap(classCourse => options.subjectsByClass[classCourse] ?? []))).sort());

  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <DateField label="Posted Date From" value={draft.postedFrom} max={draft.postedTo || undefined} onChange={postedFrom => set({ postedFrom })} />
    <DateField label="Posted Date To" value={draft.postedTo} min={draft.postedFrom || undefined} onChange={postedTo => set({ postedTo })} />
    <div className="lg:col-span-2">
      <ChipMultiSelect label="Tuition Type" options={asChips(options.tuitionTypes.map(type => formatJobBoardTuitionType(type as TuitionType)))} selectedIds={draft.tuitionTypes.map(type => formatJobBoardTuitionType(type as TuitionType))} onChange={labels => set({ tuitionTypes: options.tuitionTypes.filter(type => labels.includes(formatJobBoardTuitionType(type as TuitionType))) })} />
    </div>

    <FilterSelect label="Country" value={draft.country} onChange={country => set({ country })} options={asChips(options.countries)} />
    <FilterSelect label="City" value={draft.cityId} onChange={cityId => set({ cityId })} options={options.cities} />
    <div className="lg:col-span-2">
      <ChipMultiSelect label="Tutoring Days Per Week" options={options.daysPerWeek.map(days => ({ id: String(days), label: `${days} day${days === 1 ? "" : "s"}` }))} selectedIds={draft.daysPerWeek} onChange={daysPerWeek => set({ daysPerWeek })} />
    </div>

    <div className="sm:col-span-2">
      <ChipMultiSelect label="Category" options={asChips(Object.keys(options.classesByCategory).sort())} selectedIds={draft.categories} onChange={categories => set({ categories })} />
    </div>
    <div className="sm:col-span-2">
      <ChipMultiSelect label="Location" options={locationOptions} selectedIds={draft.locationIds} onChange={locationIds => set({ locationIds })} disabled={!draft.cityId} disabledPlaceholder="Location - select a City first" maxSelections={JOB_BOARD_LOCATION_LIMIT} />
    </div>

    <div className="sm:col-span-2">
      <FilterSelect label="Student Gender" value={draft.studentGender} onChange={value => set({ studentGender: value as JobBoardFilterState["studentGender"] })} options={[{ id: "male", label: "Male" }, { id: "female", label: "Female" }]} />
    </div>
    <div className="sm:col-span-2">
      <ChipMultiSelect label="Class" options={classOptions} selectedIds={draft.classCourses} onChange={classCourses => set({ classCourses })} disabled={draft.categories.length === 0} disabledPlaceholder="Class - select a Category first" />
    </div>

    <div className="sm:col-span-2">
      <ChipMultiSelect label="Subject" options={subjectOptions} selectedIds={draft.subjects} onChange={subjects => set({ subjects })} disabled={draft.classCourses.length === 0} disabledPlaceholder="Subject - select a Class first" maxSelections={JOB_BOARD_SUBJECT_LIMIT} />
    </div>
    <FilterSelect label="Tutor Gender" value={draft.preferredTutorGender} onChange={value => set({ preferredTutorGender: value as JobBoardFilterState["preferredTutorGender"] })} options={[{ id: "male", label: "Male" }, { id: "female", label: "Female" }, { id: "any", label: "Any" }]} />
    <input aria-label="Job ID" value={draft.jobId} onChange={event => set({ jobId: event.target.value })} placeholder="Job ID" className="h-11 w-full rounded-xl border border-[#dbe7ef] bg-white px-3 text-sm text-j-ink outline-none placeholder:text-[#8fa3b4] focus:border-j-accent focus:ring-2 focus:ring-sky-100" />
  </div>;
}

export function TutorInterestControl({ interest, isInterestSaving, onAction }: { interest?: TutorJobInterest; isInterestSaving: boolean; onAction: () => void }) {
  const presentation = getTutorInterestPresentation(interest?.status);
  return <div className="mt-3 rounded-xl border border-[#cfe8f7] bg-[#f4fbff] p-3">{presentation.statusLabel || presentation.description ? <div className="flex items-start gap-2"><HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-j-accent" /><div>{presentation.statusLabel ? <p className="text-sm font-extrabold text-[#245676]">{presentation.statusLabel}</p> : null}{presentation.description ? <p className="mt-0.5 text-xs leading-5 text-[#55738a]">{presentation.description}</p> : null}</div></div> : null}{presentation.action ? <button type="button" onClick={onAction} disabled={isInterestSaving} data-motion={isInterestSaving ? "pending" : undefined} aria-busy={isInterestSaving} className="motion-interactive inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-j-accent px-3 text-sm font-bold text-white hover:bg-j-accent-hover disabled:cursor-progress disabled:opacity-60">{isInterestSaving ? "Saving application…" : presentation.actionLabel}</button> : null}</div>;
}

function ApplicationControl({ interest, isTutor, isApprovedTutor, isInterestSaving, onAction }: { interest?: TutorJobInterest; isTutor: boolean; isApprovedTutor: boolean; isInterestSaving: boolean; onAction: () => void }) {
  if (isTutor && isApprovedTutor) return <TutorInterestControl interest={interest} isInterestSaving={isInterestSaving} onAction={onAction} />;
  const copy = getJobBoardApplicationCopy({ isTutor, isApprovedTutor });
  return <div className="mt-3 rounded-xl border border-[#cfe8f7] bg-[#f4fbff] p-3"><div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-j-accent" /><p className="text-xs leading-5 text-[#55738a]">{copy.description}</p></div><button type="button" onClick={onAction} className="motion-interactive mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-j-accent px-3 text-sm font-bold text-white hover:bg-j-accent-hover">{copy.label}</button></div>;
}

/**
 * The Job Board card is the Guardian panel's card. Only the action differs -
 * Apply Now where a Guardian sees Details - so the same component draws both
 * and neither can drift.
 */
function JobCard({ job, onDetails, interest, isTutor, isApprovedTutor, isInterestSaving, onInterestAction }: { job: JobBoardJob; onDetails: () => void; interest?: TutorJobInterest; isTutor: boolean; isApprovedTutor: boolean; isInterestSaving: boolean; onInterestAction: () => void }) {
  const applyCopy = getJobBoardApplicationCopy({ isTutor, isApprovedTutor });
  const applied = getJobBoardAppliedState(interest);
  const interestCopy = getTutorInterestPresentation(interest?.status);
  return <SharedJobCard
    job={{
      jobId: job.jobId,
      title: job.title,
      postedAt: formatPostedDate(job.publishedAt),
      statusLabel: "Live",
      statusTone: "live",
      tuitionType: job.tuitionType,
      budgetAmount: job.budgetAmount,
      subjects: job.subjects,
      locationLabel: job.locationLabel,
      preferredTutorGender: job.preferredTutorGender,
    }}
    onOpen={onDetails}
    action={applied
      ? <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#e7f5ee] px-3.5 text-xs font-bold text-[#0f7048]">
          <Check size={13} aria-hidden={true} />{applied.label} <span className="font-semibold text-[#3f8468]">{applied.appliedOn}</span>
        </span>
      : <button
          type="button"
          disabled={isInterestSaving}
          onClick={event => { event.stopPropagation(); onInterestAction(); }}
          className="inline-flex h-8 items-center rounded-lg bg-[#1677e8] px-3.5 text-xs font-bold text-white hover:bg-[#1267c8] disabled:opacity-50"
        >{isInterestSaving ? "Saving…" : interestCopy.actionLabel ?? applyCopy.label}</button>}
  />;
}

function JobMeta({ label, value }: { label: string; value: string }) { return <div><dt className="text-2xs font-bold uppercase tracking-[0.08em] text-[#87a1b2]">{label}</dt><dd className="mt-1 text-sm font-semibold leading-5 text-[#355d79]">{value}</dd></div>; }

function EmptyBoard({ onClear }: { onClear?: () => void }) {
  const contact = useSiteContact();
  return <div className="rounded-xl border border-dashed border-[#c9dce8] bg-[radial-gradient(circle_at_50%_0%,#effaff,white_58%)] px-6 py-12 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-j-accent-wash shadow-[0_9px_18px_rgba(22,125,221,.12)]"><BriefcaseBusiness className="h-7 w-7 text-j-accent" /></div><p className="mt-4 text-2xs font-extrabold uppercase tracking-[0.16em] text-[#4c9ed8]">A careful match takes time</p><h2 className="mt-2 text-lg font-extrabold text-j-ink">No available tuition matches yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5c7a8f]">Only Guardian-confirmed, active opportunities appear here. Broaden your filters or check back as the team publishes newly verified tuition requirements.</p><div className="mx-auto mt-5 flex max-w-md flex-wrap justify-center gap-3">{onClear ? <button type="button" onClick={onClear} className="rounded-xl bg-j-accent-wash px-4 py-2 text-sm font-bold text-j-accent">Clear filters</button> : null}<a href={contact.whatsapp()} target="_blank" rel="noreferrer" className="rounded-xl border border-[#c9e2f2] bg-white px-4 py-2 text-sm font-bold text-j-accent">Ask our team on WhatsApp</a></div><p className="mt-5 text-xs font-semibold text-[#6b899d]"><ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-[#248d69]" />Private Guardian contact details are only coordinated after a suitable match.</p></div>; }

/**
 * The same dialog the Guardian sees, with Apply Now in place of Update.
 *
 * The reason a Tutor cannot apply yet - not signed in, profile not approved -
 * sits here rather than under every card in the grid, where it would repeat
 * identically on each one.
 */
function JobDetails({ job, onClose, interest, isTutor, isApprovedTutor, isInterestSaving, onInterestAction }: { job: JobBoardJob; onClose: () => void; interest?: TutorJobInterest; isTutor: boolean; isApprovedTutor: boolean; isInterestSaving: boolean; onInterestAction: () => void }) {
  const applyCopy = getJobBoardApplicationCopy({ isTutor, isApprovedTutor });
  const interestCopy = getTutorInterestPresentation(interest?.status);
  const applied = getJobBoardAppliedState(interest);
  const label = interestCopy.actionLabel ?? applyCopy.label;
  const reason = interestCopy.description ?? applyCopy.description;

  return <SharedJobDetailsModal
    job={{
      jobId: job.jobId,
      title: job.title,
      postedAt: formatPostedDate(job.publishedAt),
      statusLabel: interestCopy.statusLabel ?? "Live",
      statusTone: "live",
      tuitionType: job.tuitionType,
      budgetAmount: job.budgetAmount,
      subjects: job.subjects,
      locationLabel: job.locationLabel,
      preferredTutorGender: job.preferredTutorGender,
      studentGender: job.studentGender ?? null,
      daysPerWeek: job.daysPerWeek,
      studentCount: job.studentCount,
      notes: job.notes,
    }}
    onClose={onClose}
    action={<>
      {/* The day the application was made, beside the reason it cannot be made
          again - only one of the two is ever set. */}
      {applied ? <span className="mr-auto inline-flex items-center gap-1.5 text-2xs font-bold text-[#0f7048]"><Check size={12} aria-hidden={true} />{applied.label} {applied.appliedOn}</span> : null}
      {reason ? <span className={`text-2xs text-j-ink-muted ${applied ? "" : "mr-auto"}`}>{reason}</span> : null}
      <button type="button" onClick={onClose} className="h-8 rounded-lg border border-[#dce9f1] bg-white px-3.5 text-xs font-bold text-[#173d60] hover:bg-[#f1f6fa]">Close</button>
      <button
        type="button"
        disabled={isInterestSaving}
        onClick={onInterestAction}
        className="inline-flex h-8 items-center rounded-lg bg-[#1677e8] px-4 text-xs font-bold text-white hover:bg-[#1267c8] disabled:opacity-50"
      >{isInterestSaving ? "Saving…" : label}</button>
    </>}
  />;
}

export default function JobBoard() {
  return <div className="min-h-screen bg-[#f4f8fb] text-j-ink"><SiteHeader /><main><JobBoardContent /></main><SiteFooter /></div>;
}
