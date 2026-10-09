import ChipMultiSelect from "@/components/ChipMultiSelect";
import { FilterPanelFrame, ListToolbarCard } from "@/components/ListToolbar";
import { DateField, EMPTY_JOB_FILTER_OPTIONS, FilterSelect, FilterTextBox, JobCoreFilterFields, type JobFilterOptions } from "@/components/JobFilterFields";
import { trpc } from "@/lib/trpc";
import {
  ADMIN_JOB_LOCATION_LIMIT,
  ADMIN_JOB_SUBJECT_LIMIT,
  DEFAULT_ADMIN_JOB_FILTERS,
  adminJobApplicantOptions,
  adminJobDatesOutOfOrder,
  adminJobDaysInStageOptions,
  adminJobHeardAboutUsOptions,
  adminJobLetterOptions,
  adminJobPaymentStatusOptions,
  adminJobPublicationStates,
  adminJobRefundDispositionOptions,
  adminJobSalaryOutOfOrder,
  adminJobSettlementOptions,
  adminJobSettlementReasonOptions,
  adminJobWaitingRequestOptions,
  buildAdminJobFilterInput,
  clearOtherStageFilters,
  countAdminJobFilters,
  type AdminJobFilterState,
  type AdminJobStage,
} from "@shared/admin-job-filters";
import { useMemo, useState, type ReactNode } from "react";

/**
 * The state behind an Admin tuition list's filter panel.
 *
 * The panel holds a draft, and nothing changes until Apply - as on the Job
 * Board, and for the same reason: there are many boxes, and a reload for each
 * one chosen would be a nuisance. What is applied is what the list reads and
 * what the stage counts follow.
 *
 * Moving to another stage drops the choices that only mean something in a
 * stage the Admin has left, in the draft and in what is applied, so nothing
 * goes on narrowing the list with nothing on screen to say so.
 */
export function useAdminJobFilters({ onChange }: { onChange?: () => void } = {}) {
  const [applied, setApplied] = useState<AdminJobFilterState>(DEFAULT_ADMIN_JOB_FILTERS);
  const [draft, setDraft] = useState<AdminJobFilterState>(DEFAULT_ADMIN_JOB_FILTERS);
  const [open, setOpen] = useState(false);

  const input = useMemo(() => {
    const built = buildAdminJobFilterInput(applied);
    return Object.keys(built).length ? built : undefined;
  }, [applied]);

  const datesOutOfOrder = adminJobDatesOutOfOrder(draft);
  const salaryOutOfOrder = adminJobSalaryOutOfOrder(draft);

  return {
    open,
    toggle: () => setOpen(current => !current),
    close: () => setOpen(false),
    draft,
    setDraft,
    applied,
    /** What the list asks the server with; undefined while nothing is narrowing it. */
    input,
    activeCount: countAdminJobFilters(applied),
    alerts: [
      ...(datesOutOfOrder ? ["The 'from' date cannot be later than the 'to' date."] : []),
      ...(salaryOutOfOrder ? ["The lowest salary cannot be above the highest."] : []),
    ],
    canApply: !datesOutOfOrder && !salaryOutOfOrder,
    apply: () => { setApplied(draft); onChange?.(); },
    clear: () => { setDraft(DEFAULT_ADMIN_JOB_FILTERS); setApplied(DEFAULT_ADMIN_JOB_FILTERS); onChange?.(); },
    onStageChange: (stage: AdminJobStage) => {
      setApplied(current => clearOtherStageFilters(current, stage));
      setDraft(current => clearOtherStageFilters(current, stage));
    },
  };
}

/** What the panel may offer for the list it sits on; read only while the panel is open. */
export function useAdminJobFilterOptions({ postedBy, enabled }: { postedBy: "all" | "admin"; enabled: boolean }): JobFilterOptions {
  const query = trpc.admin.jobFilterOptions.useQuery({ postedBy }, { enabled, retry: false });
  return query.data ?? EMPTY_JOB_FILTER_OPTIONS;
}

/**
 * The thirteen tuition filters, then the ones only an Admin has to go on.
 *
 * There is no Country box: every tuition is in one country. The choices that
 * mean something in one stage alone appear only while that stage is open.
 */
export function AdminJobFilterFields({ draft, setDraft, options, stage, showPostedBy }: {
  draft: AdminJobFilterState;
  setDraft: (next: AdminJobFilterState) => void;
  options: JobFilterOptions;
  stage: AdminJobStage;
  /** Posted By tells the Admin's posts from the Guardians' - pointless on the list that holds only the Admin's. */
  showPostedBy: boolean;
}) {
  const set = (change: Partial<AdminJobFilterState>) => setDraft({ ...draft, ...change });
  const tutorGender = <FilterSelect label="Assigned Tutor Gender" value={draft.tutorGender} onChange={value => set({ tutorGender: value as AdminJobFilterState["tutorGender"] })} options={[{ id: "male", label: "Male" }, { id: "female", label: "Female" }]} />;
  const paymentStatus = <div className="sm:col-span-2">
    <ChipMultiSelect label="Payment Status" options={adminJobPaymentStatusOptions} selectedIds={draft.paymentStatuses} onChange={paymentStatuses => set({ paymentStatuses })} />
  </div>;
  return <JobCoreFilterFields
    draft={draft}
    setDraft={setDraft}
    options={options}
    showCountry={false}
    locationLimit={ADMIN_JOB_LOCATION_LIMIT}
    subjectLimit={ADMIN_JOB_SUBJECT_LIMIT}
  >
    <FilterTextBox label="Salary From" value={draft.salaryFrom} onChange={salaryFrom => set({ salaryFrom })} inputMode="numeric" suffix="Taka" />
    <FilterTextBox label="Salary To" value={draft.salaryTo} onChange={salaryTo => set({ salaryTo })} inputMode="numeric" suffix="Taka" />
    {showPostedBy ? <FilterSelect label="Posted By" value={draft.postedBy} onChange={value => set({ postedBy: value as AdminJobFilterState["postedBy"] })} options={[{ id: "guardian", label: "Guardian" }, { id: "admin", label: "Admin" }]} /> : null}
    <div className={showPostedBy ? undefined : "sm:col-span-2"}>
      <FilterTextBox label="Guardian Name, Mobile or ID" value={draft.guardian} onChange={guardian => set({ guardian })} />
    </div>

    {stage === "cancelled" ? null : <FilterSelect label="Waiting Request" value={draft.waitingRequest} onChange={value => set({ waitingRequest: value as AdminJobFilterState["waitingRequest"] })} options={[...adminJobWaitingRequestOptions]} />}
    <FilterSelect label="Days in Stage" value={draft.daysInStage} onChange={value => set({ daysInStage: value as AdminJobFilterState["daysInStage"] })} options={[...adminJobDaysInStageOptions]} />
    <div className="sm:col-span-2">
      <ChipMultiSelect label="Heard About Us" options={[...adminJobHeardAboutUsOptions]} selectedIds={draft.heardAboutUs} onChange={heardAboutUs => set({ heardAboutUs })} />
    </div>

    {stage === "pending" ? <div className="sm:col-span-2">
      <ChipMultiSelect label="Moderation" options={[...adminJobPublicationStates]} selectedIds={draft.publicationStates} onChange={publicationStates => set({ publicationStates })} />
    </div> : null}
    {stage === "live" ? <>
      <FilterSelect label="Applicants" value={draft.applicants} onChange={value => set({ applicants: value as AdminJobFilterState["applicants"] })} options={[...adminJobApplicantOptions]} />
      <label className="flex h-11 w-full cursor-pointer items-center gap-2 rounded-xl border border-[#dbe7ef] bg-white px-3 text-sm text-j-ink focus-within:border-j-accent focus-within:ring-2 focus-within:ring-sky-100">
        <input type="checkbox" checked={draft.expiringSoon} onChange={event => set({ expiringSoon: event.target.checked })} className="size-4 accent-[#1677e8]" />
        <span className={draft.expiringSoon ? "" : "text-[#8fa3b4]"}>Ending Within 3 Days</span>
      </label>
    </> : null}
    {stage === "appointed" ? <>
      <DateField label="Appointed Date From" value={draft.appointedFrom} max={draft.appointedTo || undefined} onChange={appointedFrom => set({ appointedFrom })} />
      <DateField label="Appointed Date To" value={draft.appointedTo} min={draft.appointedFrom || undefined} onChange={appointedTo => set({ appointedTo })} />
      {tutorGender}
    </> : null}
    {stage === "confirmed" ? <>
      <DateField label="Confirmed Date From" value={draft.confirmedFrom} max={draft.confirmedTo || undefined} onChange={confirmedFrom => set({ confirmedFrom })} />
      <DateField label="Confirmed Date To" value={draft.confirmedTo} min={draft.confirmedFrom || undefined} onChange={confirmedTo => set({ confirmedTo })} />
      <DateField label="Appointed Date From" value={draft.appointedFrom} max={draft.appointedTo || undefined} onChange={appointedFrom => set({ appointedFrom })} />
      <DateField label="Appointed Date To" value={draft.appointedTo} min={draft.appointedFrom || undefined} onChange={appointedTo => set({ appointedTo })} />
      {paymentStatus}
      <FilterSelect label="Confirmation Letter" value={draft.letter} onChange={value => set({ letter: value as AdminJobFilterState["letter"] })} options={[...adminJobLetterOptions]} />
      {tutorGender}
    </> : null}
    {stage === "cancelled" ? <>
      <DateField label="Cancelled Date From" value={draft.cancelledFrom} max={draft.cancelledTo || undefined} onChange={cancelledFrom => set({ cancelledFrom })} />
      <DateField label="Cancelled Date To" value={draft.cancelledTo} min={draft.cancelledFrom || undefined} onChange={cancelledTo => set({ cancelledTo })} />
      <FilterSelect label="Settlement" value={draft.settlement} onChange={value => set({ settlement: value as AdminJobFilterState["settlement"] })} options={[...adminJobSettlementOptions]} />
      <FilterSelect label="Refund" value={draft.refundDisposition} onChange={value => set({ refundDisposition: value as AdminJobFilterState["refundDisposition"] })} options={[...adminJobRefundDispositionOptions]} />
      <div className="sm:col-span-2">
        <ChipMultiSelect label="Settlement Reason" options={adminJobSettlementReasonOptions} selectedIds={draft.settlementReasons} onChange={settlementReasons => set({ settlementReasons })} />
      </div>
      {paymentStatus}
      <div className="sm:col-span-2">
        <FilterTextBox label="Cancellation Reason" value={draft.cancelReason} onChange={cancelReason => set({ cancelReason })} />
      </div>
      {tutorGender}
    </> : null}
  </JobCoreFilterFields>;
}

/**
 * The card that heads an Admin tuition list and the panel it opens: what the
 * list is, how many tuitions are in it, the Filter button, and the filters.
 *
 * One piece so every list that has them draws them the same, and so the panel
 * asks for its options only once it is opened.
 */
export function AdminJobFilterBar({ filters, stage, eyebrow, count, total, loading, searching, idleCaption, matchingCaption, panelLabel, postedBy = "all", actions }: {
  filters: ReturnType<typeof useAdminJobFilters>;
  stage: AdminJobStage;
  /** What the list is: "Appointed Jobs". */
  eyebrow: string;
  /** The number under it; the open stage's count, or the list's total. */
  count: number | undefined;
  /** What "N jobs found" in the panel counts. */
  total: number | undefined;
  loading: boolean;
  /** A search is narrowing the list as well. */
  searching: boolean;
  idleCaption: string;
  matchingCaption: string;
  /** The panel's accessible name. */
  panelLabel: string;
  /** "admin" on the list that holds only the Admin's own tuitions. */
  postedBy?: "all" | "admin";
  /** Other buttons for the list, drawn beside Filter. */
  actions?: ReactNode;
}) {
  const options = useAdminJobFilterOptions({ postedBy, enabled: filters.open });
  return <>
    <ListToolbarCard
      eyebrow={eyebrow}
      count={count}
      loading={loading}
      caption={filters.activeCount > 0 || searching ? matchingCaption : idleCaption}
      filterOpen={filters.open}
      onToggleFilter={filters.toggle}
      activeFilterCount={filters.activeCount}
      panelId="admin-job-filters"
      actions={actions}
    />

    {filters.open ? <FilterPanelFrame
      id="admin-job-filters"
      ariaLabel={panelLabel}
      total={total}
      loading={loading}
      onClose={filters.close}
      onClear={filters.clear}
      onApply={filters.apply}
      applyDisabled={!filters.canApply}
      alerts={filters.alerts}
    >
      <AdminJobFilterFields draft={filters.draft} setDraft={filters.setDraft} options={options} stage={stage} showPostedBy={postedBy === "all"} />
    </FilterPanelFrame> : null}
  </>;
}
