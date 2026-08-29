export type TutorClassLevel = { id: string | number; name: string };
export type GroupedClassLevelSelector = {
  options: { id: string; label: string }[];
  groupedIds: ReadonlyMap<string, readonly string[]>;
  selectedIds: string[];
};

const orderedSingles = ["Play", "Nursery", "KG"] as const;
const orderedSeniorLevels = ["SSC", "HSC", "O Levels", "A Levels"] as const;

function normalizedLabel(label: string) {
  return label.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function takeByName(levels: TutorClassLevel[], name: string) {
  return levels.find(level => normalizedLabel(level.name) === normalizedLabel(name));
}

export function getGroupedClassLevelSelector(levels: TutorClassLevel[], persistedIds: string[] = []): GroupedClassLevelSelector {
  const usedIds = new Set<string>();
  const options: { id: string; label: string }[] = [];
  const groupedIds = new Map<string, readonly string[]>();

  const addSingle = (name: string) => {
    const level = takeByName(levels, name);
    if (!level) return;
    const id = String(level.id);
    usedIds.add(id);
    options.push({ id, label: name });
  };
  orderedSingles.forEach(addSingle);

  const addGroup = (id: string, label: string, classNumbers: number[]) => {
    const memberIds = classNumbers
      .map(classNumber => takeByName(levels, `Class ${classNumber}`))
      .filter((level): level is TutorClassLevel => Boolean(level))
      .map(level => String(level.id));
    if (memberIds.length === 0) return;
    memberIds.forEach(memberId => usedIds.add(memberId));
    groupedIds.set(id, memberIds);
    options.push({ id, label });
  };
  addGroup("group-class-1-5", "Class 1–5", [1, 2, 3, 4, 5]);
  addGroup("group-class-6-8", "Class 6–8", [6, 7, 8]);
  orderedSeniorLevels.forEach(addSingle);

  levels.forEach(level => {
    const id = String(level.id);
    if (usedIds.has(id)) return;
    options.push({ id, label: level.name });
  });

  const selected = new Set(persistedIds);
  const selectedIds = options.flatMap(option => {
    const members = groupedIds.get(option.id);
    return members ? (members.some(memberId => selected.has(memberId)) ? [option.id] : []) : selected.has(option.id) ? [option.id] : [];
  });

  return { options, groupedIds, selectedIds };
}

export function expandGroupedClassLevelIds(selectedIds: string[], groupedIds: ReadonlyMap<string, readonly string[]>) {
  return Array.from(new Set(selectedIds.flatMap(id => groupedIds.get(id) ?? [id])));
}
