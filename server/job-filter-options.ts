/**
 * What a job filter may offer, worked out from the tuitions that exist.
 *
 * Derived rather than declared, so nobody is offered a class or an area that
 * would return nothing. The parent-to-child pairs come back whole - city to
 * location, category to class, class to subject - and the panel narrows them as
 * selections are made, which keeps choosing a category from costing a round
 * trip. Shared by the Job Board (from the jobs that are live) and the Admin's
 * lists (from the tuitions in them), so the two read a tuition the same way.
 *
 * All of it is small: distinct pairs stay in the hundreds even when the list
 * runs to thousands of tuitions.
 */

export type JobFilterOptionRow = {
  cityLocationId: string | null;
  locationId: string | null;
  locationLabel: string | null;
  tuitionType: string;
  daysPerWeek: number;
  category: string;
  classCourse: string;
  /** A JSON array of subject names, as stored. */
  subjects: string;
};

function subjectNames(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").map(item => item.trim()).filter(Boolean).slice(0, 12)
      : [];
  } catch {
    return [];
  }
}

const sorted = (values: Iterable<string>) => Array.from(values).sort((left, right) => left.localeCompare(right));

export function buildJobFilterOptions(rows: JobFilterOptionRow[], cityLabelById: Map<string, string>) {
  const tuitionTypes = new Set<string>();
  const daysPerWeek = new Set<number>();
  const cities = new Map<string, string>();
  const locationsByCity = new Map<string, Map<string, string>>();
  const classesByCategory = new Map<string, Set<string>>();
  const subjectsByClass = new Map<string, Set<string>>();

  for (const row of rows) {
    tuitionTypes.add(row.tuitionType);
    daysPerWeek.add(row.daysPerWeek);
    if (row.cityLocationId) {
      cities.set(row.cityLocationId, cityLabelById.get(row.cityLocationId) ?? row.cityLocationId);
      if (row.locationId) {
        const areas = locationsByCity.get(row.cityLocationId) ?? new Map<string, string>();
        // Stored as "Area, City", and the City is already chosen above this
        // filter, so the chip carries the area alone.
        const cityLabel = cityLabelById.get(row.cityLocationId);
        const label = row.locationLabel ?? row.locationId;
        areas.set(row.locationId, cityLabel && label.endsWith(`, ${cityLabel}`) ? label.slice(0, -(cityLabel.length + 2)) : label);
        locationsByCity.set(row.cityLocationId, areas);
      }
    }
    const classes = classesByCategory.get(row.category) ?? new Set<string>();
    classes.add(row.classCourse);
    classesByCategory.set(row.category, classes);
    const forClass = subjectsByClass.get(row.classCourse) ?? new Set<string>();
    for (const subject of subjectNames(row.subjects)) forClass.add(subject);
    subjectsByClass.set(row.classCourse, forClass);
  }

  return {
    tuitionTypes: sorted(tuitionTypes),
    daysPerWeek: Array.from(daysPerWeek).sort((left, right) => left - right),
    cities: Array.from(cities, ([id, label]) => ({ id, label })).sort((left, right) => left.label.localeCompare(right.label)),
    locationsByCity: Object.fromEntries(Array.from(locationsByCity, ([cityId, areas]) => [
      cityId,
      Array.from(areas, ([id, label]) => ({ id, label })).sort((left, right) => left.label.localeCompare(right.label)),
    ])),
    classesByCategory: Object.fromEntries(Array.from(classesByCategory, ([category, classes]) => [category, sorted(classes)])),
    subjectsByClass: Object.fromEntries(Array.from(subjectsByClass, ([classCourse, subjects]) => [classCourse, sorted(subjects)])),
  };
}
