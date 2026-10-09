import type { AdminTutorFilterOptions } from "@shared/admin-tutor-filters";

/**
 * What the Tutor Profiles filter may offer, worked out from the Tutors that
 * exist.
 *
 * Derived rather than declared, as the job filters' options are, so nobody is
 * offered an area or a subject no Tutor has. The City-to-area pairs come back
 * whole and the panel narrows them as a City is chosen.
 */
export type TutorFilterOptionRow = {
  cityLocationId: string | null;
  locationId: string | null;
  /** The area's own name. */
  locationLabel: string | null;
  /** A JSON array of subject names, as stored. */
  subjects: string | null;
};

function subjectNames(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").map(item => item.trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

const byLabel = (left: { label: string }, right: { label: string }) => left.label.localeCompare(right.label);

export function buildTutorFilterOptions(rows: TutorFilterOptionRow[], cityLabelById: Map<string, string>): AdminTutorFilterOptions {
  const cities = new Map<string, string>();
  const locationsByCity = new Map<string, Map<string, string>>();
  const subjects = new Set<string>();

  for (const row of rows) {
    if (row.cityLocationId) {
      cities.set(row.cityLocationId, cityLabelById.get(row.cityLocationId) ?? row.cityLocationId);
      if (row.locationId) {
        const areas = locationsByCity.get(row.cityLocationId) ?? new Map<string, string>();
        areas.set(row.locationId, row.locationLabel ?? row.locationId);
        locationsByCity.set(row.cityLocationId, areas);
      }
    }
    for (const subject of subjectNames(row.subjects)) subjects.add(subject);
  }

  return {
    cities: Array.from(cities, ([id, label]) => ({ id, label })).sort(byLabel),
    locationsByCity: Object.fromEntries(Array.from(locationsByCity, ([cityId, areas]) => [
      cityId,
      Array.from(areas, ([id, label]) => ({ id, label })).sort(byLabel),
    ])),
    subjects: Array.from(subjects).sort((left, right) => left.localeCompare(right)),
  };
}
