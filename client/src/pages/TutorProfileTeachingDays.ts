export const allTeachingDaysId = "all-days";

const weekdays = [
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" },
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
] as const;

export const teachingDayIds = weekdays.map(day => day.id);

/**
 * The seven days with "All Days" in front of them.
 *
 * "All Days" is a shorthand, not an eighth day: it stands for the seven, which
 * is what gets stored and what every reader of a Tutor's availability already
 * understands. The same trick the class-level selector plays with "Class 1-5".
 */
export const teachingDayOptions = [{ id: allTeachingDaysId, label: "All Days" }, ...weekdays];

/** What to tick in the box for the days a Tutor has saved. */
export function selectedTeachingDayIds(persistedIds: readonly string[]) {
  const chosen = new Set(persistedIds);
  if (teachingDayIds.every(day => chosen.has(day))) return [allTeachingDaysId];
  return teachingDayIds.filter(day => chosen.has(day));
}

/** What to store for the boxes a Tutor has ticked. */
export function expandTeachingDayIds(selectedIds: readonly string[]) {
  if (selectedIds.includes(allTeachingDaysId)) return [...teachingDayIds];
  return teachingDayIds.filter(day => selectedIds.includes(day));
}
