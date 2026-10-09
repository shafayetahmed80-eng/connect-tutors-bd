import { useSiteContact } from "@/lib/siteContent";
import { formatSalaryAmount } from "@shared/salary-amount";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SharedJobCard from "@/components/JobCard";
import { FilterPanelFrame, ListToolbarCard } from "@/components/ListToolbar";
import { EMPTY_JOB_FILTER_OPTIONS, JOB_FILTER_LOCATION_LIMIT, JOB_FILTER_SUBJECT_LIMIT, JobCoreFilterFields, formatJobBoardTuitionType, reconcileJobFilters, type JobFilterOptions } from "@/components/JobFilterFields";
import SharedJobDetailsModal from "@/components/JobDetailsModal";
import ShareJobButton from "@/components/ShareJobButton";
import { isJobIdNumber } from "@shared/job-id";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { formatPostedDate, isNewJob } from "@shared/job-card";
import { buildTutorApplyProfilePath, buildTutorApplyReturnPath, buildTutorApplySignInPath, getTutorApplyReturnFromLocation, storeTutorApplyReturnPath } from "@/lib/tutorApplyReturn";
import { TutorListPager } from "@/components/TutorListPager";
import { AlertTriangle, BriefcaseBusiness, Check, CheckCircle2, Compass, ExternalLink, HeartHandshake, MapPinned, ShieldCheck, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation, useSearch } from "wouter";

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
  pageSize: number;
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
  pageSize: 20,
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
export const JOB_BOARD_LOCATION_LIMIT = JOB_FILTER_LOCATION_LIMIT;
export const JOB_BOARD_SUBJECT_LIMIT = JOB_FILTER_SUBJECT_LIMIT;

const PAGE_SIZE = 20;
/** Cards rise in one after another; past the ninth they all go together, so a full page never keeps anyone waiting. */
const JOB_CARD_STAGGER_CAP = 8;

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
    pageSize: filters.pageSize || PAGE_SIZE,
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

/** Keeps a selection honest when what it depends on changes; the rule is shared with the Admin's lists. */
export function reconcileJobBoardFilters(
  filters: JobBoardFilterState,
  options: { locationsByCity: JobFilterOptions["locationsByCity"]; classesByCategory: JobFilterOptions["classesByCategory"]; subjectsByClass: JobFilterOptions["subjectsByClass"] },
): JobBoardFilterState {
  return reconcileJobFilters(filters, options);
}

/** How many filters are actually narrowing the board. */
export function countJobBoardFilters(filters: JobBoardFilterState) {
  const { page, pageSize, ...rest } = filters;
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

export { formatJobBoardTuitionType };

function formatTutorGender(gender: TutorGender) {
  return gender === "any" ? "Any tutor preferred" : gender === "female" ? "Female tutor preferred" : "Male tutor preferred";
}

/** The confirm dialog's warning line, or none when the job takes any gender or the Tutor's own is not on file. */
export function jobBoardGenderMismatchNote(preferredTutorGender: TutorGender, tutorOwnGender?: "male" | "female") {
  if (preferredTutorGender === "any" || !tutorOwnGender || tutorOwnGender === preferredTutorGender) return null;
  return `This job requires a "${preferredTutorGender === "female" ? "Female" : "Male"}" tutor.`;
}

/**
 * The reassurance a fresh application carries into the details dialog - the
 * same line the success popup showed at the moment of applying, kept in view
 * for as long as it is still true. Once the Guardian has acted (shortlisted,
 * declined, matched), the statement is no longer the honest one.
 */
export function jobBoardAppliedNote(status?: TutorInterestStatus) {
  return status === "interested" ? "Guardian will review your profile & shortlist you if your profile strongly matches with their requirements." : null;
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

/**
 * "Are you sure?" before an application goes out - it cannot be undone from
 * here, only withdrawn from the details dialog. A gender-mismatched job says
 * so, since the Tutor's own gender is fixed and cannot be changed to fit it.
 */
function JobBoardApplyConfirm({ mismatchNote, busy, onConfirm, onClose }: { mismatchNote: string | null; busy: boolean; onConfirm: () => void; onClose: () => void }) {
  return <Modal size="sm" onClose={onClose} busy={busy}>
    <ModalHeader title="Apply for this tuition?" />
    <ModalBody>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <div>
          <p className="text-sm leading-6 text-j-ink-strong">Are you sure you want to apply for this tuition job?</p>
          {mismatchNote ? <p className="mt-2 text-sm font-bold leading-6 text-[#bd3535]">{mismatchNote}</p> : null}
        </div>
      </div>
    </ModalBody>
    <ModalFooter>
      <button type="button" onClick={onClose} disabled={busy} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft disabled:opacity-50">No</button>
      <button type="button" onClick={onConfirm} disabled={busy} data-motion={busy ? "pending" : undefined} className="h-10 rounded-xl bg-j-accent px-5 text-sm font-bold text-white hover:bg-j-accent-hover disabled:cursor-progress disabled:opacity-60">{busy ? "Applying…" : "Yes, apply"}</button>
    </ModalFooter>
  </Modal>;
}

/** What follows a successful application: not a promise of a match, only that it was sent and what happens next. */
function JobBoardApplySuccess({ onClose }: { onClose: () => void }) {
  return <Modal size="sm" onClose={onClose}>
    <ModalHeader title="Application sent" />
    <ModalBody>
      <div className="flex flex-col items-center py-2 text-center">
        <CheckCircle2 className="h-11 w-11 text-emerald-600" aria-hidden="true" />
        <p className="mt-3 text-lg font-extrabold text-j-ink">Successfully Applied!</p>
        <p className="mt-2 text-sm leading-6 text-j-ink-soft">Guardian will review your profile & shortlist you if your profile strongly matches with their requirements.</p>
      </div>
    </ModalBody>
    <ModalFooter>
      <button type="button" onClick={onClose} className="h-10 rounded-xl bg-j-accent px-5 text-sm font-bold text-white hover:bg-j-accent-hover">Done</button>
    </ModalFooter>
  </Modal>;
}

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
  // Applying asks first, since it cannot be undone from the card; a job sits
  // here only between that question and the answer.
  const [confirmJob, setConfirmJob] = useState<JobBoardJob | null>(null);
  const [showApplySuccess, setShowApplySuccess] = useState(false);
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
  const pagination = getJobBoardPagination({ page: queryInput.page, pageSize: filters.pageSize, totalCount });
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

  // A link someone shared (/job-board?job=6945) opens that tuition's details.
  // The job is asked for by its own ID, so it opens even when it is not on the
  // page the board is showing; the board's filters are left alone.
  const search = useSearch();
  const sharedJobId = useMemo(() => {
    if (embedded) return null;
    const id = new URLSearchParams(search).get("job");
    return id && isJobIdNumber(id) ? id : null;
  }, [embedded, search]);
  const sharedJobQuery = trpc.jobBoard.list.useQuery({ page: 1, pageSize: 1, jobId: sharedJobId ?? undefined }, { enabled: Boolean(sharedJobId) });
  const handledSharedJob = useRef<string | null>(null);
  useEffect(() => {
    if (!sharedJobId || handledSharedJob.current === sharedJobId || !sharedJobQuery.isSuccess) return;
    handledSharedJob.current = sharedJobId;
    const sharedJob = (sharedJobQuery.data.items as JobBoardJob[]).find(job => job.jobId === sharedJobId);
    if (sharedJob) setActiveJob(sharedJob);
    else toast.info("This tuition is no longer on the Job Board.");
  }, [sharedJobId, sharedJobQuery.isSuccess, sharedJobQuery.data]);
  // Closing it takes the job out of the address, so a reload does not reopen it.
  const closeActiveJob = () => {
    setActiveJob(null);
    if (sharedJobId) navigate("/job-board", { replace: true });
  };

  const goToPage = (page: number) => setFilters(current => ({ ...current, page }));
  const changePageSize = (pageSize: number) => setFilters(current => ({ ...current, pageSize, page: 1 }));
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
    // Applying is the one action that gets a success notice - withdrawing already says so on the card.
    else expressInterest.mutate({ tutorJobId: job.id }, { ...settle, onSuccess: () => setShowApplySuccess(true) });
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

    const interest = tutorInterestByJobId.get(job.jobId);
    const presentation = getTutorInterestPresentation(interest?.status);
    // Applying asks first; withdrawing, from the details dialog, does not.
    if (presentation.action === "express") { setConfirmJob(job); return; }
    updateInterest(job);
  };

  return <section className={embedded ? "space-y-5" : "mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12"} aria-label="Available tuition Job Board">
    <ListToolbarCard
      eyebrow="Live Jobs"
      count={totalCount}
      loading={jobsQuery.isLoading}
      caption={appliedFilterCount ? "matching live jobs" : "currently live"}
      filterOpen={filterOpen}
      onToggleFilter={() => setFilterOpen(current => !current)}
      activeFilterCount={appliedFilterCount}
      panelId="job-board-filters"
    />

    {filterOpen ? <FilterPanelFrame
      id="job-board-filters"
      ariaLabel="Job Board filters"
      total={totalCount}
      loading={jobsQuery.isLoading}
      onClose={() => setFilterOpen(false)}
      onClear={clearFilters}
      onApply={applyFilters}
      applyDisabled={datesOutOfOrder}
      alerts={datesOutOfOrder ? ["The 'from' date cannot be later than the 'to' date."] : []}
    >
      <JobBoardFilters draft={draft} setDraft={setDraft} options={filterOptionsQuery.data ?? EMPTY_JOB_FILTER_OPTIONS} />
    </FilterPanelFrame> : null}

    <div className="min-w-0">
        {jobsQuery.isError ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800"><p className="font-bold">Available tuition could not be loaded right now.</p><p className="mt-1">Please try again shortly. No private Guardian details are displayed in this view.</p><button type="button" onClick={() => jobsQuery.refetch()} disabled={jobsQuery.isFetching} data-motion={jobsQuery.isFetching ? "pending" : undefined} className="motion-interactive mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-4 py-2 font-bold text-rose-800 ring-1 ring-inset ring-rose-200 hover:bg-rose-100 disabled:cursor-progress disabled:opacity-60">{jobsQuery.isFetching ? "Trying again…" : "Try again"}</button></div> : null}
        {jobsQuery.isFetching && !jobsQuery.isLoading ? <div role="status" aria-live="polite" className="mb-4 flex items-center gap-2 rounded-xl border border-[#cfe8f7] bg-[#f2faff] px-4 py-3 text-sm font-semibold text-[#245676]"><span className="inline-block size-2 animate-pulse rounded-full bg-j-accent" aria-hidden="true" />Updating results…</div> : null}
        {interestError ? <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><p className="font-bold">Your Job Board application was not updated.</p><p className="mt-1">{interestError}</p></div> : null}
        {!jobsQuery.isLoading && !jobsQuery.isError && jobs.length === 0 ? <EmptyBoard onClear={appliedFilterCount ? clearFilters : undefined} /> : null}
        {jobsQuery.isLoading ? <div className="grid gap-4 md:grid-cols-2" aria-label="Loading available tuition" aria-busy="true">{Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-xl border border-[#e4eef4] bg-white p-5" aria-hidden="true"><Skeleton className="h-6 w-28" /><Skeleton className="mt-5 h-6 w-11/12" /><Skeleton className="mt-2 h-4 w-2/3" /><div className="mt-5 grid grid-cols-2 gap-4 border-y border-[#e7eef3] py-4"><Skeleton className="h-9" /><Skeleton className="h-9" /><Skeleton className="h-9" /><Skeleton className="h-9" /></div><Skeleton className="mt-5 h-10 w-full" /></div>)}</div> : null}
      {jobs.length ? <div className="grid gap-4 md:grid-cols-2">{jobs.map((job, index) => <div key={job.id} className="job-board-card-enter" style={{ "--stagger": Math.min(index, JOB_CARD_STAGGER_CAP) } as React.CSSProperties}><JobCard job={job} onDetails={() => setActiveJob(job)} interest={isTutor ? tutorInterestByJobId.get(job.jobId) : undefined} isTutor={isTutor} isApprovedTutor={isApprovedTutor} isInterestSaving={savingJobId === job.id} onInterestAction={() => startApplication(job)} /></div>)}</div> : null}
      <div className="mt-7"><TutorListPager
        page={queryInput.page}
        totalPages={pagination.totalPages}
        onPage={goToPage}
        label="Job Board pagination"
        pageSize={filters.pageSize}
        pageSizeOptions={[20, 50, 100]}
        onPageSize={changePageSize}
        totalItems={totalCount}
      /></div>
    </div>
    {activeJob ? <JobDetails job={activeJob} onClose={closeActiveJob} interest={isTutor ? tutorInterestByJobId.get(activeJob.jobId) : undefined} isTutor={isTutor} isApprovedTutor={isApprovedTutor} isInterestSaving={savingJobId === activeJob.id} onInterestAction={() => startApplication(activeJob)} /> : null}

    {confirmJob ? <JobBoardApplyConfirm
      mismatchNote={jobBoardGenderMismatchNote(confirmJob.preferredTutorGender, tutorProfileQuery.data?.gender)}
      busy={savingJobId === confirmJob.id}
      onClose={() => setConfirmJob(null)}
      onConfirm={() => { const job = confirmJob; setConfirmJob(null); updateInterest(job); }}
    /> : null}
    {showApplySuccess ? <JobBoardApplySuccess onClose={() => setShowApplySuccess(false)} /> : null}
  </section>;
}

/**
 * The Job Board's filters, all of them on one panel.
 *
 * The fields and the rules between them are `JobCoreFilterFields`, shared with
 * the Admin's tuition lists; this only says that choosing anything starts again
 * from the first page.
 */
export function JobBoardFilters({ draft, setDraft, options }: {
  draft: JobBoardFilterState;
  setDraft: (next: JobBoardFilterState) => void;
  options: JobFilterOptions;
}) {
  return <JobCoreFilterFields draft={draft} setDraft={next => setDraft({ ...next, page: 1 })} options={options} />;
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
    isNew={isNewJob(job.publishedAt)}
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
    footerStart={<ShareJobButton job={job} />}
    action={applied
      ? <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#e7f5ee] px-3.5 text-xs font-bold text-[#0f7048]">
          <Check size={13} aria-hidden={true} />{applied.label} <span className="font-semibold text-[#3f8468]">{applied.appliedOn}</span>
        </span>
      : <button
          type="button"
          disabled={isInterestSaving}
          onClick={event => { event.stopPropagation(); onInterestAction(); }}
          className="inline-flex h-8 items-center rounded-lg bg-[#1677e8] px-3.5 text-xs font-bold text-white hover:bg-[#1267c8] disabled:opacity-50 max-md:h-10 max-md:px-5"
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
  const appliedNote = jobBoardAppliedNote(interest?.status);

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
    footerStart={<ShareJobButton job={job} labelled />}
    extraRows={appliedNote ? <div className="sm:col-span-2 border-t border-[#eef4f9] pt-2.5"><p className="text-2xs font-semibold leading-[1.6] text-[#bd3535]">Note: {appliedNote}</p></div> : null}
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
