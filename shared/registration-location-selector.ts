export type RegistrationLocationType = "city" | "thana" | "upazila" | "subdivision" | "area";

export type RegistrationLocationRow = {
  id: string;
  label: string;
  type: RegistrationLocationType;
  parentId: string | null;
};

export type CombinedRegistrationLocationOption = RegistrationLocationRow;

const parentTypes = new Set<RegistrationLocationType>(["thana", "upazila", "subdivision", "area"]);
const childTypes = new Set<RegistrationLocationType>(["subdivision", "area"]);
const priorityParentTypes = new Set<RegistrationLocationType>(["thana", "upazila"]);

function normalizeDirectLocationLabel(label: string): string {
  return label.normalize("NFKC").trim().toLocaleLowerCase();
}

/**
 * Returns options that are safely bounded to one selected City. Direct
 * Thana/Upazila and direct City-level Area/Sub-area records remain selectable.
 * Nested Area/Sub-area records receive a parent-qualified label so similarly
 * named places are unambiguous.
 */
export function buildCombinedCityLocationOptions(cityId: string, rows: readonly RegistrationLocationRow[]): CombinedRegistrationLocationOption[] {
  if (!cityId) return [];

  const directParents = rows.filter(row => row.parentId === cityId && parentTypes.has(row.type));
  const priorityLabels = new Set(
    directParents
      .filter(row => priorityParentTypes.has(row.type))
      .map(row => normalizeDirectLocationLabel(row.label)),
  );
  const parents = directParents
    .filter(row => row.type !== "area" || !priorityLabels.has(normalizeDirectLocationLabel(row.label)))
    .sort((left, right) => left.label.localeCompare(right.label) || left.id.localeCompare(right.id));
  const allParentLabels = new Map(directParents.map(parent => [parent.id, parent.label]));
  const children = rows
    .filter((row): row is RegistrationLocationRow & { parentId: string } => row.parentId !== null && allParentLabels.has(row.parentId) && childTypes.has(row.type))
    .map(row => ({ ...row, label: `${row.label} — ${allParentLabels.get(row.parentId)}` }))
    .sort((left, right) => left.label.localeCompare(right.label) || left.id.localeCompare(right.id));

  return [...parents, ...children];
}
