import { DateField, FilterSelect, FilterTextBox } from "@/components/JobFilterFields";
import { FilterPanelFrame, ListToolbarCard } from "@/components/ListToolbar";
import { useAppliedFilters } from "@/components/useAppliedFilters";
import {
  DEFAULT_ADMIN_CHANGE_REQUEST_FILTERS,
  DEFAULT_ADMIN_GUARDIAN_REQUEST_FILTERS,
  adminChangeRequestFilterAlerts,
  adminGuardianRequestFilterAlerts,
  adminGuardianRequestTypeOptions,
  adminRequestPostedByOptions,
  adminRequestTuitionStageOptions,
  buildAdminChangeRequestFilterInput,
  buildAdminGuardianRequestFilterInput,
  type AdminChangeRequestFilterState,
  type AdminGuardianRequestFilterState,
} from "@shared/admin-request-filters";
import { accountChangeTypeLabels, accountChangeTypeValues } from "@shared/account-change-requests";
import type { ReactNode } from "react";

/** The filter state behind the Guardian Requests screens. */
export function useAdminGuardianRequestFilters({ onChange }: { onChange?: () => void } = {}) {
  return useAppliedFilters({
    defaults: DEFAULT_ADMIN_GUARDIAN_REQUEST_FILTERS,
    build: buildAdminGuardianRequestFilterInput,
    alertsFor: adminGuardianRequestFilterAlerts,
    onChange,
  });
}

/** The filter state behind the Change requests queue. */
export function useAdminChangeRequestFilters({ onChange }: { onChange?: () => void } = {}) {
  return useAppliedFilters({
    defaults: DEFAULT_ADMIN_CHANGE_REQUEST_FILTERS,
    build: buildAdminChangeRequestFilterInput,
    alertsFor: adminChangeRequestFilterAlerts,
    onChange,
  });
}

/**
 * The boxes of a Guardian Requests panel: when the Guardian asked, who posted
 * the tuition and where it stands now - and, on the Cancel screen, which of its
 * two kinds of request.
 */
export function AdminGuardianRequestFilterFields({ draft, setDraft, dateLabel, showRequestType }: {
  draft: AdminGuardianRequestFilterState;
  setDraft: (next: AdminGuardianRequestFilterState) => void;
  /** What the date means on this screen: "Requested", or "Shortlisted". */
  dateLabel: string;
  showRequestType: boolean;
}) {
  const set = (change: Partial<AdminGuardianRequestFilterState>) => setDraft({ ...draft, ...change });
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <DateField label={`${dateLabel} Date From`} value={draft.requestedFrom} max={draft.requestedTo || undefined} onChange={requestedFrom => set({ requestedFrom })} />
    <DateField label={`${dateLabel} Date To`} value={draft.requestedTo} min={draft.requestedFrom || undefined} onChange={requestedTo => set({ requestedTo })} />
    {showRequestType ? <FilterSelect label="Request" value={draft.requestType} onChange={value => set({ requestType: value as AdminGuardianRequestFilterState["requestType"] })} options={[...adminGuardianRequestTypeOptions]} /> : null}
    <FilterSelect label="Posted By" value={draft.postedBy} onChange={value => set({ postedBy: value as AdminGuardianRequestFilterState["postedBy"] })} options={[...adminRequestPostedByOptions]} />
    <FilterSelect label="Tuition Stage" value={draft.tuitionStage} onChange={value => set({ tuitionStage: value as AdminGuardianRequestFilterState["tuitionStage"] })} options={[...adminRequestTuitionStageOptions]} />
  </div>;
}

/**
 * The boxes of the Change requests panel: which panel the account belongs to,
 * what it asked for, when - and, on the Declined tab, what the Admin said.
 */
export function AdminChangeRequestFilterFields({ draft, setDraft, canSeeAdmins, showDeclineReason }: {
  draft: AdminChangeRequestFilterState;
  setDraft: (next: AdminChangeRequestFilterState) => void;
  /** Another Admin's requests are the Project Owner's alone. */
  canSeeAdmins: boolean;
  showDeclineReason: boolean;
}) {
  const set = (change: Partial<AdminChangeRequestFilterState>) => setDraft({ ...draft, ...change });
  const panels = [{ id: "guardian", label: "Guardian" }, { id: "tutor", label: "Tutor" }, ...(canSeeAdmins ? [{ id: "admin", label: "Admin" }] : [])];
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <FilterSelect label="Panel" value={draft.role} onChange={value => set({ role: value as AdminChangeRequestFilterState["role"] })} options={panels} />
    <FilterSelect label="Request" value={draft.type} onChange={value => set({ type: value as AdminChangeRequestFilterState["type"] })} options={accountChangeTypeValues.map(id => ({ id, label: accountChangeTypeLabels[id] }))} />
    <span className="hidden lg:block" />
    <DateField label="Requested Date From" value={draft.requestedFrom} max={draft.requestedTo || undefined} onChange={requestedFrom => set({ requestedFrom })} />
    <DateField label="Requested Date To" value={draft.requestedTo} min={draft.requestedFrom || undefined} onChange={requestedTo => set({ requestedTo })} />
    {showDeclineReason ? <FilterTextBox label="Decline Reason" value={draft.declineReason} onChange={declineReason => set({ declineReason })} /> : null}
  </div>;
}

/**
 * The card that heads a request queue and the panel it opens: what the queue
 * is, how many requests are on the tab open, the Filter button, and the filters.
 */
export function AdminRequestFilterBar({ filters, eyebrow, count, loading, caption, panelId, panelLabel, noun = "requests found", children }: {
  filters: Pick<ReturnType<typeof useAdminGuardianRequestFilters>, "open" | "toggle" | "close" | "clear" | "apply" | "activeCount" | "alerts" | "canApply">;
  /** What the queue is: "Confirm Requests". */
  eyebrow: string;
  count: number | undefined;
  loading: boolean;
  caption: ReactNode;
  panelId: string;
  panelLabel: string;
  /** What the number in the panel counts. */
  noun?: string;
  /** The boxes of the panel. */
  children: ReactNode;
}) {
  return <>
    <ListToolbarCard
      eyebrow={eyebrow}
      count={count}
      loading={loading}
      caption={caption}
      filterOpen={filters.open}
      onToggleFilter={filters.toggle}
      activeFilterCount={filters.activeCount}
      panelId={panelId}
    />

    {filters.open ? <FilterPanelFrame
      id={panelId}
      ariaLabel={panelLabel}
      total={count}
      loading={loading}
      noun={noun}
      onClose={filters.close}
      onClear={filters.clear}
      onApply={filters.apply}
      applyDisabled={!filters.canApply}
      alerts={filters.alerts}
    >
      {children}
    </FilterPanelFrame> : null}
  </>;
}
