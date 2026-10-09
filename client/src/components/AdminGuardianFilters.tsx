import { DateField, FilterSelect } from "@/components/JobFilterFields";
import { FilterPanelFrame, ListToolbarCard } from "@/components/ListToolbar";
import {
  DEFAULT_ADMIN_GUARDIAN_FILTERS,
  adminGuardianAccountStatusOptions,
  adminGuardianChangeRequestOptions,
  adminGuardianFilterAlerts,
  adminGuardianTuitionOptions,
  buildAdminGuardianFilterInput,
  countAdminGuardianFilters,
  type AdminGuardianFilterState,
} from "@shared/admin-guardian-filters";
import { useMemo, useState, type ReactNode } from "react";

/**
 * The state behind the Guardian Profiles filter panel.
 *
 * The panel holds a draft, and nothing changes until Apply - as on the Tutor
 * Profiles and the Admin's tuition lists. Notify sends to exactly what is
 * applied, so a half-chosen set should not be what it sends to.
 */
export function useAdminGuardianFilters({ onChange }: { onChange?: () => void } = {}) {
  const [applied, setApplied] = useState<AdminGuardianFilterState>(DEFAULT_ADMIN_GUARDIAN_FILTERS);
  const [draft, setDraft] = useState<AdminGuardianFilterState>(DEFAULT_ADMIN_GUARDIAN_FILTERS);
  const [open, setOpen] = useState(false);

  const input = useMemo(() => buildAdminGuardianFilterInput(applied), [applied]);
  const alerts = adminGuardianFilterAlerts(draft);

  return {
    open,
    toggle: () => setOpen(current => !current),
    close: () => setOpen(false),
    draft,
    setDraft,
    applied,
    /** What the list asks the server with, and what Notify sends to. */
    input,
    activeCount: countAdminGuardianFilters(applied),
    alerts,
    canApply: alerts.length === 0,
    apply: () => { setApplied(draft); onChange?.(); },
    clear: () => { setDraft(DEFAULT_ADMIN_GUARDIAN_FILTERS); setApplied(DEFAULT_ADMIN_GUARDIAN_FILTERS); onChange?.(); },
  };
}

/** The boxes of the Guardian Profiles panel: since when, how many tuitions, whether a request waits, and the state of the account. */
export function AdminGuardianFilterFields({ draft, setDraft }: {
  draft: AdminGuardianFilterState;
  setDraft: (next: AdminGuardianFilterState) => void;
}) {
  const set = (change: Partial<AdminGuardianFilterState>) => setDraft({ ...draft, ...change });
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
    <DateField label="Joined Date From" value={draft.joinedFrom} max={draft.joinedTo || undefined} onChange={joinedFrom => set({ joinedFrom })} />
    <DateField label="Joined Date To" value={draft.joinedTo} min={draft.joinedFrom || undefined} onChange={joinedTo => set({ joinedTo })} />
    <FilterSelect label="Tuitions Posted" value={draft.tuitions} onChange={value => set({ tuitions: value as AdminGuardianFilterState["tuitions"] })} options={[...adminGuardianTuitionOptions]} />
    <FilterSelect label="Change Request" value={draft.changeRequest} onChange={value => set({ changeRequest: value as AdminGuardianFilterState["changeRequest"] })} options={[...adminGuardianChangeRequestOptions]} />
    <FilterSelect label="Account Status" value={draft.accountStatus} onChange={value => set({ accountStatus: value as AdminGuardianFilterState["accountStatus"] })} options={[...adminGuardianAccountStatusOptions]} />
  </div>;
}

/**
 * The card that heads the Guardian Profiles list and the panel it opens: what
 * the list is, how many Guardians are in it, the buttons that act on them, the
 * Filter button, and the filters.
 */
export function AdminGuardianFilterBar({ filters, count, loading, caption, actions }: {
  filters: ReturnType<typeof useAdminGuardianFilters>;
  /** The number under the label: how many Guardians the list holds right now. */
  count: number | undefined;
  loading: boolean;
  /** The line under the number. */
  caption: ReactNode;
  /** Other buttons for the list, drawn beside Filter. */
  actions?: ReactNode;
}) {
  return <>
    <ListToolbarCard
      eyebrow="Guardians"
      count={count}
      loading={loading}
      caption={caption}
      filterOpen={filters.open}
      onToggleFilter={filters.toggle}
      activeFilterCount={filters.activeCount}
      panelId="admin-guardian-filters"
      actions={actions}
    />

    {filters.open ? <FilterPanelFrame
      id="admin-guardian-filters"
      ariaLabel="Guardian filters"
      total={count}
      loading={loading}
      noun="guardians found"
      onClose={filters.close}
      onClear={filters.clear}
      onApply={filters.apply}
      applyDisabled={!filters.canApply}
      alerts={filters.alerts}
    >
      <AdminGuardianFilterFields draft={filters.draft} setDraft={filters.setDraft} />
    </FilterPanelFrame> : null}
  </>;
}
