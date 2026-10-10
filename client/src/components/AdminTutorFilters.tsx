import ChipMultiSelect from "@/components/ChipMultiSelect";
import { DateField, FilterSelect, FilterTextBox } from "@/components/JobFilterFields";
import { FilterPanelFrame, ListToolbarCard } from "@/components/ListToolbar";
import { trpc } from "@/lib/trpc";
import {
  ADMIN_TUTOR_LOCATION_LIMIT,
  ADMIN_TUTOR_SUBJECT_LIMIT,
  DEFAULT_ADMIN_TUTOR_FILTERS,
  EMPTY_ADMIN_TUTOR_FILTER_OPTIONS,
  adminTutorFilterAlerts,
  adminTutorGenderOptions,
  adminTutorTuitionTypeOptions,
  adminTutorVerifiedOptions,
  buildAdminTutorFilterInput,
  countAdminTutorFilters,
  reconcileAdminTutorFilters,
  type AdminTutorFilterOptions,
  type AdminTutorFilterState,
} from "@shared/admin-tutor-filters";
import { useMemo, useState, type ReactNode } from "react";

/**
 * The state behind the Tutor Profiles filter panel.
 *
 * The panel holds a draft, and nothing changes until Apply - as on the Job
 * Board and the Admin's tuition lists, and for the same reason: there are many
 * boxes, a reload for each one chosen would be a nuisance, and Notify sends to
 * exactly what is applied, so a half-chosen set should not be what it sends to.
 */
export function useAdminTutorFilters({ onChange }: { onChange?: () => void } = {}) {
  const [applied, setApplied] = useState<AdminTutorFilterState>(DEFAULT_ADMIN_TUTOR_FILTERS);
  const [draft, setDraft] = useState<AdminTutorFilterState>(DEFAULT_ADMIN_TUTOR_FILTERS);
  const [open, setOpen] = useState(false);

  const input = useMemo(() => buildAdminTutorFilterInput(applied), [applied]);
  const alerts = adminTutorFilterAlerts(draft);

  return {
    open,
    toggle: () => setOpen(current => !current),
    close: () => setOpen(false),
    draft,
    setDraft,
    applied,
    /** What the list asks the server with, and what Notify sends to. */
    input,
    activeCount: countAdminTutorFilters(applied),
    alerts,
    canApply: alerts.length === 0,
    apply: () => { setApplied(draft); onChange?.(); },
    clear: () => { setDraft(DEFAULT_ADMIN_TUTOR_FILTERS); setApplied(DEFAULT_ADMIN_TUTOR_FILTERS); onChange?.(); },
  };
}

/** What the panel may offer; read only while the panel is open. */
export function useAdminTutorFilterOptions(enabled: boolean): AdminTutorFilterOptions {
  const query = trpc.admin.tutorFilterOptions.useQuery(undefined, { enabled, retry: false });
  return query.data ?? EMPTY_ADMIN_TUTOR_FILTER_OPTIONS;
}

/** The boxes of the Tutor Profiles panel: who the Tutor is, where they teach, what they teach, how long and how well, and since when. */
export function AdminTutorFilterFields({ draft, setDraft, options }: {
  draft: AdminTutorFilterState;
  setDraft: (next: AdminTutorFilterState) => void;
  options: AdminTutorFilterOptions;
}) {
  // Until the options have arrived there is nothing to hold a choice against, so a choice is not dropped for lack of them.
  const set = (change: Partial<AdminTutorFilterState>) => {
    const next = { ...draft, ...change };
    setDraft(options.cities.length ? reconcileAdminTutorFilters(next, options) : next);
  };
  const areas = draft.cityId ? options.locationsByCity[draft.cityId] ?? [] : [];

  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <FilterSelect label="Verification" value={draft.verified} onChange={value => set({ verified: value as AdminTutorFilterState["verified"] })} options={[...adminTutorVerifiedOptions]} />
    <FilterSelect label="Tuition Type" value={draft.tuitionType} onChange={value => set({ tuitionType: value as AdminTutorFilterState["tuitionType"] })} options={[...adminTutorTuitionTypeOptions]} />
    <FilterSelect label="Gender" value={draft.gender} onChange={value => set({ gender: value as AdminTutorFilterState["gender"] })} options={[...adminTutorGenderOptions]} />
    <FilterSelect label="City" value={draft.cityId} onChange={cityId => set({ cityId })} options={options.cities} />

    <div className="col-span-2">
      <ChipMultiSelect label="Location" options={areas} selectedIds={draft.locationIds} onChange={locationIds => set({ locationIds })} disabled={!draft.cityId} disabledPlaceholder="Location - select a City first" maxSelections={ADMIN_TUTOR_LOCATION_LIMIT} />
    </div>
    <div className="col-span-2">
      <ChipMultiSelect label="Subject" options={options.subjects.map(subject => ({ id: subject, label: subject }))} selectedIds={draft.subjects} onChange={subjects => set({ subjects })} maxSelections={ADMIN_TUTOR_SUBJECT_LIMIT} />
    </div>

    <div className="col-span-2 sm:col-span-1"><FilterTextBox label="Experience From" value={draft.experienceFrom} onChange={experienceFrom => set({ experienceFrom })} inputMode="numeric" suffix="years" /></div>
    <div className="col-span-2 sm:col-span-1"><FilterTextBox label="Experience To" value={draft.experienceTo} onChange={experienceTo => set({ experienceTo })} inputMode="numeric" suffix="years" /></div>
    <div className="col-span-2 sm:col-span-1"><FilterTextBox label="Rating From" value={draft.ratingFrom} onChange={ratingFrom => set({ ratingFrom })} suffix="stars" /></div>
    <div className="col-span-2 sm:col-span-1"><FilterTextBox label="Rating To" value={draft.ratingTo} onChange={ratingTo => set({ ratingTo })} suffix="stars" /></div>

    <DateField label="Joined Date From" value={draft.joinedFrom} max={draft.joinedTo || undefined} onChange={joinedFrom => set({ joinedFrom })} />
    <DateField label="Joined Date To" value={draft.joinedTo} min={draft.joinedFrom || undefined} onChange={joinedTo => set({ joinedTo })} />
  </div>;
}

/**
 * The card that heads the Tutor Profiles list and the panel it opens: what the
 * list is, how many Tutors are in it, the buttons that act on them, the Filter
 * button, and the filters. One piece, so the panel asks for its options only
 * once it is opened.
 */
export function AdminTutorFilterBar({ filters, count, loading, caption, actions }: {
  filters: ReturnType<typeof useAdminTutorFilters>;
  /** The number under the label: how many Tutors the list holds right now. */
  count: number | undefined;
  loading: boolean;
  /** The line under the number. */
  caption: ReactNode;
  /** Other buttons for the list, drawn beside Filter. */
  actions?: ReactNode;
}) {
  const options = useAdminTutorFilterOptions(filters.open);
  return <>
    <ListToolbarCard
      eyebrow="Tutors"
      count={count}
      loading={loading}
      caption={caption}
      filterOpen={filters.open}
      onToggleFilter={filters.toggle}
      activeFilterCount={filters.activeCount}
      panelId="admin-tutor-filters"
      actions={actions}
    />

    {filters.open ? <FilterPanelFrame
      id="admin-tutor-filters"
      ariaLabel="Tutor filters"
      total={count}
      loading={loading}
      noun="tutors found"
      onClose={filters.close}
      onClear={filters.clear}
      onApply={filters.apply}
      applyDisabled={!filters.canApply}
      alerts={filters.alerts}
    >
      <AdminTutorFilterFields draft={filters.draft} setDraft={filters.setDraft} options={options} />
    </FilterPanelFrame> : null}
  </>;
}
