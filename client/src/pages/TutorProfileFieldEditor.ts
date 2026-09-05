import {
  groupFieldsByPanel,
  tutorProfileFieldSections,
  tutorProfileFieldSubGroups,
  type ResolvedTutorProfileField,
  type TutorProfileFieldOverrideRow,
  type TutorProfileFieldSection,
  type TutorProfileFieldSubGroup,
} from "@shared/tutor-profile-field-registry";
import type { TutorProfileEditTarget } from "./TutorProfileSectionDraft";

export { groupFieldsByPanel };

/**
 * The places a field can live: every sub-group a section declares, or the
 * bare section itself when it has none (only `e`). This is the same set
 * `TutorProfileEditTarget` names on the Tutor-facing side - a "Move to"
 * destination is always one of these, never a bare section that actually
 * owns sub-groups, since a field arriving there with no sub-group chosen
 * would resolve invisibly (see `moveTargetOverride`).
 */
export const tutorProfileFieldEditTargets: ReadonlyArray<{
  id: TutorProfileEditTarget;
  section: TutorProfileFieldSection;
  subGroup?: TutorProfileFieldSubGroup;
  label: string;
  shortLabel: string;
}> = [
  { id: "a-identity", section: "a", subGroup: "a-identity", label: "Personal Information: Identity and contact", shortLabel: "Identity and contact" },
  { id: "a-family", section: "a", subGroup: "a-family", label: "Personal Information: Family and emergency contact", shortLabel: "Family and emergency contact" },
  { id: "c-education", section: "c", subGroup: "c-education", label: "Education", shortLabel: "Education records" },
  { id: "c-teaching", section: "c", subGroup: "c-teaching", label: "Education: Teaching expertise", shortLabel: "Teaching expertise" },
  { id: "d-availability", section: "d", subGroup: "d-availability", label: "Tuition and location: Availability", shortLabel: "Availability" },
  { id: "d-teaching", section: "d", subGroup: "d-teaching", label: "Tuition and location: Teaching expertise", shortLabel: "Teaching expertise" },
  { id: "d-location", section: "d", subGroup: "d-location", label: "Tuition and location: Location and fee", shortLabel: "Location and fee" },
  { id: "e", section: "e", label: "Introduction and review", shortLabel: "Introduction and review" },
];

const targetById = new Map(tutorProfileFieldEditTargets.map(target => [target.id, target] as const));

/**
 * Where a field's row lives in the editor, or `null` for `profilePhotoUrl` -
 * it renders in the identity rail, outside every section's field grid, so it
 * gets Enabled/Required controls but never a position of its own.
 */
export function editTargetFor(field: ResolvedTutorProfileField): TutorProfileEditTarget | null {
  if (field.excludedFromReorder) return null;
  return field.subGroup ?? field.section;
}

/**
 * Every configurable field bucketed by edit target and sorted by its
 * (possibly still-draft) sortOrder. Unlike `bySection`/`bySubGroup` on the
 * resolved config, this keeps disabled fields - the editor is exactly the
 * place a disabled field must still show up, so it can be turned back on.
 */
export function groupFieldsForEditor(fields: readonly ResolvedTutorProfileField[]): Map<TutorProfileEditTarget, ResolvedTutorProfileField[]> {
  const byTarget = new Map<TutorProfileEditTarget, ResolvedTutorProfileField[]>();
  for (const field of fields) {
    const target = editTargetFor(field);
    if (!target) continue;
    const list = byTarget.get(target);
    if (list) list.push(field);
    else byTarget.set(target, [field]);
  }
  for (const list of Array.from(byTarget.values())) list.sort((a, b) => a.sortOrder - b.sortOrder);
  return byTarget;
}

/**
 * The row shape the `save` mutation's own schema expects - a stricter subtype
 * of `TutorProfileFieldOverrideRow`, whose columns are untyped strings/numbers
 * at the raw DB boundary. Every draft the editor holds is narrowed to this on
 * the way in (`toEditorRow`), so it can always be sent back as-is on save.
 */
export type TutorProfileFieldEditorRow = {
  fieldId: string;
  section: TutorProfileFieldSection | null;
  subGroup: TutorProfileFieldSubGroup | null;
  sortOrder: number | null;
  enabled: 0 | 1 | null;
  required: 0 | 1 | null;
};

export function emptyOverrideRow(fieldId: string): TutorProfileFieldEditorRow {
  return { fieldId, section: null, subGroup: null, sortOrder: null, enabled: null, required: null };
}

/**
 * Narrows a raw stored row to the literal-union shape `save` requires.
 * Anything that fails validation resolves to "no override" here too -
 * matching `resolveTutorProfileFieldConfig`'s own leniency - rather than
 * ever being sent back unchecked.
 */
export function toEditorRow(row: TutorProfileFieldOverrideRow): TutorProfileFieldEditorRow {
  const section = (tutorProfileFieldSections as readonly string[]).includes(row.section ?? "") ? (row.section as TutorProfileFieldSection) : null;
  const subGroup = (tutorProfileFieldSubGroups as readonly string[]).includes(row.subGroup ?? "") ? (row.subGroup as TutorProfileFieldSubGroup) : null;
  const enabled = row.enabled === 0 ? 0 : row.enabled === 1 ? 1 : null;
  const required = row.required === 0 ? 0 : row.required === 1 ? 1 : null;
  return { fieldId: row.fieldId, section, subGroup, sortOrder: row.sortOrder, enabled, required };
}

export function overrideRowsEqual(a: TutorProfileFieldEditorRow, b: TutorProfileFieldEditorRow): boolean {
  return a.section === b.section && a.subGroup === b.subGroup && a.sortOrder === b.sortOrder && a.enabled === b.enabled && a.required === b.required;
}

/**
 * Seeds one full row per registry field from the stored overrides, so every
 * field always has a complete draft to edit and diff against - the table
 * itself is sparse, holding a row only for a field an Owner has touched.
 */
export function seedFieldEditorDrafts(
  fieldIds: readonly string[],
  stored: readonly TutorProfileFieldOverrideRow[],
): Record<string, TutorProfileFieldEditorRow> {
  const storedById = new Map(stored.map(row => [row.fieldId, row] as const));
  return Object.fromEntries(fieldIds.map(id => {
    const row = storedById.get(id);
    return [id, row ? toEditorRow(row) : emptyOverrideRow(id)];
  }));
}

/** `null` clears back to the shipped default (always enabled); `0` is the only way to turn a field off. */
export function enabledOverrideValue(checked: boolean): 0 | null {
  return checked ? null : 0;
}

/** `null` clears back to the field's own shipped required/optional default, so toggling back to where it started leaves no stray override. */
export function requiredOverrideValue(checked: boolean, requiredByDefault: boolean): 0 | 1 | null {
  return checked === requiredByDefault ? null : (checked ? 1 : 0);
}

/**
 * The section/subGroup to write when moving a field onto `target` - always
 * both together. Leaving `subGroup` null is only safe when the target has
 * none of its own; a field arriving fresh into a sub-group-owning section
 * must be told exactly which one, or the resolve layer's own drop rule (a
 * stale sub-group not prefixed by the new section) makes it vanish from
 * every editor rather than landing anywhere.
 */
export function moveTargetOverride(targetId: TutorProfileEditTarget): { section: TutorProfileFieldSection; subGroup: TutorProfileFieldSubGroup | null } {
  const target = targetById.get(targetId)!;
  return { section: target.section, subGroup: target.subGroup ?? null };
}

/** The sortOrder that lands a moved field at the end of its new group, keeping the registry's own gap-of-10 spacing. */
export function appendSortOrder(targetGroupFields: readonly ResolvedTutorProfileField[]): number {
  if (targetGroupFields.length === 0) return 10;
  return Math.max(...targetGroupFields.map(field => field.sortOrder)) + 10;
}

/**
 * The two `{fieldId, sortOrder}` writes that swap a field with its neighbor
 * one place up or down within its own group, or `null` at either boundary.
 * `groupFields` must already be sorted by (draft-)resolved sortOrder.
 */
export function swapSortOrder(
  groupFields: readonly ResolvedTutorProfileField[],
  fieldId: string,
  direction: -1 | 1,
): Array<{ fieldId: string; sortOrder: number }> | null {
  const from = groupFields.findIndex(field => field.id === fieldId);
  const to = from + direction;
  if (from === -1 || to < 0 || to >= groupFields.length) return null;
  return [
    { fieldId: groupFields[from].id, sortOrder: groupFields[to].sortOrder },
    { fieldId: groupFields[to].id, sortOrder: groupFields[from].sortOrder },
  ];
}
