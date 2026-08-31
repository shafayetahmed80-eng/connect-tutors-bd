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

/** Lower is more authoritative when two options would otherwise show the same label. */
const typeRank: Record<RegistrationLocationType, number> = {
  city: 0,
  thana: 1,
  upazila: 2,
  subdivision: 3,
  area: 4,
};

function normalizeDirectLocationLabel(label: string): string {
  return label.normalize("NFKC").trim().toLocaleLowerCase();
}

function isMoreAuthoritative(candidate: CombinedRegistrationLocationOption, incumbent: CombinedRegistrationLocationOption): boolean {
  const rankDiff = typeRank[candidate.type] - typeRank[incumbent.type];
  if (rankDiff !== 0) return rankDiff < 0;
  return candidate.id.localeCompare(incumbent.id) < 0;
}

/**
 * Guarantees the option list a person picks from is unambiguous: no two entries
 * share a visible label, and no id repeats. When several rows resolve to the
 * same displayed label (e.g. a "Adabor" Thana and a "Adabor" Area under one
 * City, or a duplicate seed row), the most authoritative one is kept
 * (Thana > Upazila > Sub-division > Area, then lowest id). Input order — already
 * sorted by the caller — is preserved.
 */
function dedupeCombinedOptions(options: readonly CombinedRegistrationLocationOption[]): CombinedRegistrationLocationOption[] {
  const optionById = new Map<string, CombinedRegistrationLocationOption>();
  const winnerIdByLabel = new Map<string, string>();

  for (const option of options) {
    if (!optionById.has(option.id)) optionById.set(option.id, option);
    const labelKey = normalizeDirectLocationLabel(option.label);
    const currentWinnerId = winnerIdByLabel.get(labelKey);
    if (currentWinnerId === undefined) {
      winnerIdByLabel.set(labelKey, option.id);
      continue;
    }
    const currentWinner = optionById.get(currentWinnerId);
    if (currentWinner && isMoreAuthoritative(option, currentWinner)) {
      winnerIdByLabel.set(labelKey, option.id);
    }
  }

  const winners = new Set(winnerIdByLabel.values());
  const emitted = new Set<string>();
  return options.filter(option => {
    if (!winners.has(option.id) || emitted.has(option.id)) return false;
    emitted.add(option.id);
    return true;
  });
}

/**
 * Returns options that are safely bounded to one selected City. Direct
 * Thana/Upazila and direct City-level Area/Sub-area records remain selectable.
 * Nested Area/Sub-area records receive a parent-qualified label so similarly
 * named places are unambiguous. A final pass removes any remaining duplicate
 * labels or ids.
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
    .map(row => {
      const parentLabel = allParentLabels.get(row.parentId) ?? "";
      // A child that carries its parent's own name gains nothing from a
      // "Name — Name" suffix; leave it bare so the dedupe pass folds it in.
      const qualified = normalizeDirectLocationLabel(row.label) === normalizeDirectLocationLabel(parentLabel)
        ? row.label
        : `${row.label} — ${parentLabel}`;
      return { ...row, label: qualified };
    })
    .sort((left, right) => left.label.localeCompare(right.label) || left.id.localeCompare(right.id));

  return dedupeCombinedOptions([...parents, ...children]);
}
