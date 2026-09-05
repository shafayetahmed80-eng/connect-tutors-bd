import { trpc } from "@/lib/trpc";
import {
  resolveTutorProfileFieldConfig,
  tutorProfileFieldRegistry,
  type ResolvedTutorProfileField,
} from "@shared/tutor-profile-field-registry";
import { ArrowDown, ArrowUp, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { tutorProfileSectionDefinitions, type TutorProfileEditTarget } from "@/pages/TutorProfileSectionDraft";
import {
  appendSortOrder,
  editTargetFor,
  enabledOverrideValue,
  groupFieldsByPanel,
  groupFieldsForEditor,
  moveTargetOverride,
  overrideRowsEqual,
  requiredOverrideValue,
  seedFieldEditorDrafts,
  swapSortOrder,
  toEditorRow,
  tutorProfileFieldEditTargets,
  type TutorProfileFieldEditorRow,
} from "@/pages/TutorProfileFieldEditor";

const inputClass = "h-8 w-full min-w-0 rounded-lg border border-j-border bg-white px-2 text-sm text-j-ink-strong outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100";
const iconButtonClass = "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-j-border text-j-ink-muted hover:border-j-field-border hover:text-j-ink-strong disabled:opacity-30";
const checkboxClass = "h-3.5 w-3.5 shrink-0 accent-j-accent";
const allFieldIds = tutorProfileFieldRegistry.map(field => field.id);

/** Only the two panels with more than one member benefit from a sub-heading inside a group. */
const panelHeadings: Partial<Record<string, string>> = {
  qualifications: "Qualification history",
  documents: "Documents",
};

/**
 * Owner-facing editor for the Tutor Profile's own field list: reorder within
 * a section or sub-group, move a field to a different one, switch it on or
 * off, and flip required/optional where the field allows it.
 *
 * Every change lands in `drafts` first and is re-resolved through the same
 * `resolveTutorProfileFieldConfig` the Tutor's own profile uses, so a pending
 * move is already visible in the right group before Save is pressed. Saving
 * batches every dirty field into the one `save` call the router accepts.
 */
export default function TutorProfileFieldEditor() {
  const utils = trpc.useUtils();
  const overridesQuery = trpc.tutorProfileFieldConfig.listOverrides.useQuery();
  const save = trpc.tutorProfileFieldConfig.save.useMutation();

  const [drafts, setDrafts] = useState<Record<string, TutorProfileFieldEditorRow>>({});
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const stored = useMemo(() => new Map((overridesQuery.data ?? []).map(row => [row.fieldId, row] as const)), [overridesQuery.data]);

  // Re-seed whenever the saved rows change, keyed on contents like the other Owner editors on this page.
  const savedKey = JSON.stringify(overridesQuery.data ?? []);
  useEffect(() => {
    setDrafts(seedFieldEditorDrafts(allFieldIds, overridesQuery.data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on contents, see above
  }, [savedKey]);

  const draftConfig = useMemo(() => resolveTutorProfileFieldConfig(Object.values(drafts)), [drafts]);
  const grouped = useMemo(() => groupFieldsForEditor(draftConfig.all), [draftConfig]);

  const isDirty = (fieldId: string) => {
    const draft = drafts[fieldId];
    const savedRow = stored.get(fieldId);
    return Boolean(draft) && !overrideRowsEqual(draft, savedRow ? toEditorRow(savedRow) : { fieldId, section: null, subGroup: null, sortOrder: null, enabled: null, required: null });
  };
  const dirtyIds = allFieldIds.filter(isDirty);

  const update = (fieldId: string, change: Partial<TutorProfileFieldEditorRow>) =>
    setDrafts(current => ({ ...current, [fieldId]: { ...current[fieldId], ...change } }));

  /**
   * Scoped to the field's own panel, not its whole section/sub-group: panel
   * is fixed, non-configurable metadata, and `groupFieldsByPanel` buckets by
   * it regardless of interleaving, so swapping sortOrder with a neighbor from
   * a *different* panel changes nothing visible - it only reappears once that
   * field's own panel-bucket is reached. A field alone in its panel (like
   * Additional Notes in "review") has nowhere to move, and both buttons stay
   * disabled - a true statement, not a bug.
   */
  const moveField = (field: ResolvedTutorProfileField, panelFields: readonly ResolvedTutorProfileField[], direction: -1 | 1) => {
    const swap = swapSortOrder(panelFields, field.id, direction);
    if (!swap) return;
    setDrafts(current => {
      const next = { ...current };
      for (const { fieldId, sortOrder } of swap) next[fieldId] = { ...next[fieldId], sortOrder };
      return next;
    });
  };

  const moveFieldTo = (field: ResolvedTutorProfileField, targetId: TutorProfileEditTarget) => {
    const { section, subGroup } = moveTargetOverride(targetId);
    const sortOrder = appendSortOrder(grouped.get(targetId) ?? []);
    update(field.id, { section, subGroup, sortOrder });
  };

  const saveAll = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await save.mutateAsync(dirtyIds.map(id => drafts[id]));
      await Promise.all([utils.tutorProfileFieldConfig.listOverrides.invalidate(), utils.tutorProfileFieldConfig.resolved.invalidate()]);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Changes could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (overridesQuery.isLoading) {
    return <div className="flex min-h-32 items-center justify-center rounded-xl border border-j-border bg-white text-sm text-j-ink-soft"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading field settings…</div>;
  }
  if (overridesQuery.isError) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Field settings could not be loaded.</div>;
  }

  const needle = query.trim().toLowerCase();
  const matches = (field: ResolvedTutorProfileField) => !needle || field.label.toLowerCase().includes(needle);

  const renderField = (field: ResolvedTutorProfileField, panelFields: readonly ResolvedTutorProfileField[], movable: boolean, nested: boolean) => {
    const index = panelFields.findIndex(candidate => candidate.id === field.id);
    return <div key={field.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-j-border py-1.5 last:border-b-0 ${nested ? "pl-4" : ""}`}>
      <span className={`min-w-0 flex-1 truncate text-sm ${field.enabled ? "text-j-ink-strong" : "text-j-ink-faint line-through"}`} title={field.label}>
        {field.label}
        {isDirty(field.id) ? <span className="ml-1 text-j-accent" aria-label="unsaved">•</span> : null}
      </span>

      <label className="flex items-center gap-1 text-2xs font-bold uppercase tracking-wide text-j-ink-muted">
        <input
          type="checkbox"
          className={checkboxClass}
          checked={field.enabled}
          aria-label={`${field.enabled ? "Disable" : "Enable"} ${field.label}`}
          onChange={event => update(field.id, { enabled: enabledOverrideValue(event.target.checked) })}
        />
        Shown
      </label>

      {field.requiredConfigurable
        ? <label className="flex items-center gap-1 text-2xs font-bold uppercase tracking-wide text-j-ink-muted">
          <input
            type="checkbox"
            className={checkboxClass}
            checked={field.required}
            aria-label={`${field.required ? "Make optional" : "Make required"} ${field.label}`}
            onChange={event => update(field.id, { required: requiredOverrideValue(event.target.checked, field.requiredByDefault) })}
          />
          Required
        </label>
        : <span className="text-2xs text-j-ink-faint" title="Whether this field is required already depends on another field, so it cannot take a flat override.">Fixed</span>}

      {movable ? <div className="flex shrink-0 items-center gap-1">
        <button type="button" disabled={Boolean(needle) || index <= 0} onClick={() => moveField(field, panelFields, -1)} className={iconButtonClass} aria-label={`Move ${field.label} up`} title={needle ? "Clear the filter to reorder" : "Move up"}><ArrowUp className="h-3.5 w-3.5" /></button>
        <button type="button" disabled={Boolean(needle) || index === -1 || index === panelFields.length - 1} onClick={() => moveField(field, panelFields, 1)} className={iconButtonClass} aria-label={`Move ${field.label} down`} title={needle ? "Clear the filter to reorder" : "Move down"}><ArrowDown className="h-3.5 w-3.5" /></button>
      </div> : null}

      {movable ? <select
        aria-label={`Move ${field.label} to a different section`}
        value={editTargetFor(field) ?? ""}
        onChange={event => moveFieldTo(field, event.target.value as TutorProfileEditTarget)}
        className={`${inputClass} w-auto max-w-[14rem] shrink-0`}
      >
        {tutorProfileFieldEditTargets.map(target => <option key={target.id} value={target.id}>{target.label}</option>)}
      </select> : null}
    </div>;
  };

  return <div className="space-y-3">
    {/* top-16, not top-0: DashboardLayout's own header is `sticky top-0` at a
        higher z-index, so docking flush to the viewport top would park this
        bar's Save button underneath it for the whole time a 70-row list
        keeps it stuck, not just at the very top. */}
    <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-j-border bg-white/95 p-2 shadow-sm backdrop-blur">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Filter fields</span>
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-j-ink-faint" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter by field name" className={`${inputClass} pl-7`} />
      </label>
      <button type="button" disabled={saving || dirtyIds.length === 0} onClick={() => void saveAll()} className="h-8 rounded-lg bg-j-accent px-3 text-sm font-bold text-white disabled:opacity-40">
        {saving ? "Saving…" : dirtyIds.length > 0 ? `Save ${dirtyIds.length} change${dirtyIds.length === 1 ? "" : "s"}` : "Saved"}
      </button>
    </div>

    {saveError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{saveError}</p> : null}

    {(() => {
      const photo = draftConfig.byId.get("profilePhotoUrl");
      return photo && matches(photo) ? <section className="rounded-xl border border-j-border bg-white p-3 shadow-sm">
        <h2 className="pb-1.5 text-sm font-bold text-j-ink">Profile photo</h2>
        {renderField(photo, [photo], false, false)}
      </section> : null;
    })()}

    {tutorProfileSectionDefinitions.map(section => {
      const targets = tutorProfileFieldEditTargets.filter(target => target.section === section.id);
      return <section key={section.id} className="space-y-2 rounded-xl border border-j-border bg-white p-3 shadow-sm">
        <h2 className="text-sm font-bold text-j-ink">{section.label}</h2>
        {targets.map(target => {
          const groupFields = grouped.get(target.id) ?? [];
          const visibleFields = groupFields.filter(matches);
          if (visibleFields.length === 0 && (needle || groupFields.length === 0)) {
            return needle ? null : <div key={target.id}>
              {targets.length > 1 ? <h3 className="text-xs font-bold text-j-ink-soft">{target.shortLabel}</h3> : null}
              <p className="py-2 text-xs text-j-ink-muted">No fields here yet — move one in using its section select below.</p>
            </div>;
          }
          const panels = groupFieldsByPanel(visibleFields);
          return <div key={target.id}>
            {targets.length > 1 ? <h3 className="text-xs font-bold text-j-ink-soft">{target.shortLabel}</h3> : null}
            {panels.map(panel => <div key={panel.panel}>
              {panelHeadings[panel.panel] ? <p className="pt-1.5 text-2xs font-bold uppercase tracking-wide text-j-ink-faint">{panelHeadings[panel.panel]}</p> : null}
              {panel.fields.map(field => renderField(field, panel.fields, true, field.id.startsWith("educationRecords.") || field.id.startsWith("supportingDocument.")))}
            </div>)}
          </div>;
        })}
      </section>;
    })}
  </div>;
}
