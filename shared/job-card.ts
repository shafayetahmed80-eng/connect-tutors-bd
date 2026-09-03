/**
 * How a job reads on a card and in its details.
 *
 * The Guardian's Posted jobs tab and the public Job Board show the same job in
 * the same shape - only the button at the bottom differs - so the wording lives
 * here rather than being written twice and drifting.
 */

export type TutorGenderPreference = "male" | "female" | "any" | string;

export function formatTuitionType(value: string): string {
  switch (value) {
    case "home": return "Home Tutoring";
    case "online": return "Online Tutoring";
    case "group": return "Group Tutoring";
    case "package": return "Package Tutoring";
    case "both": return "Home or Online";
    default: return value;
  }
}

/** "Male" / "Female" / "Any". Written as a word so the icon is not the only cue. */
export function formatTutorPreference(value: TutorGenderPreference): string {
  if (value === "male") return "Male";
  if (value === "female") return "Female";
  return "Any";
}

/**
 * The student's gender, which a Guardian may leave unsaid.
 *
 * "Not specified" rather than a blank: a Tutor reading the board should be able
 * to tell the difference between a Guardian who had no preference and a field
 * that failed to load.
 */
export function formatStudentGender(value: string | null | undefined): string {
  if (value === "male") return "Male";
  if (value === "female") return "Female";
  return "Not specified";
}

export function formatDaysPerWeek(days: number | null | undefined): string {
  if (!days || days < 1) return "Not set";
  return `${days} ${days === 1 ? "day" : "days"} / week`;
}

export function formatStudentCount(count: number | null | undefined): string {
  if (!count || count < 1) return "Not set";
  return `${count} ${count === 1 ? "student" : "students"}`;
}

/** Subjects as stored - a JSON array in a column - read back safely. */
export function readSubjects(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
    } catch {
      // A malformed legacy row shows nothing rather than raw JSON.
    }
  }
  return [];
}

export function formatSubjects(value: unknown): string {
  const subjects = readSubjects(value);
  return subjects.length > 0 ? subjects.join(", ") : "Not set";
}

/**
 * "Bosila, Dhaka" on a card; "Bosila, Dhaka, Bangladesh" in the details.
 *
 * Online tuition has no place, and saying so is more use than an empty row.
 */
export function formatLocation(input: {
  tuitionType: string;
  locationLabel: string | null | undefined;
  country?: string | null;
  withCountry?: boolean;
}): string {
  if (input.tuitionType === "online") return "Online — no travel";
  const label = input.locationLabel?.trim();
  if (!label) return "Not set";
  const country = input.country?.trim() || "Bangladesh";
  return input.withCountry && country ? `${label}, ${country}` : label;
}

/** What a Guardian wrote for the coordinator, or that they wrote nothing. */
export function formatNotes(notes: string | null | undefined): string {
  const written = notes?.trim();
  return written ? written : "No Special Requirements";
}

export function formatPostedDate(value: Date | string | number | null | undefined): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

/**
 * A Google Maps search for the tuition area.
 *
 * The area only - never a street address. What a Guardian typed as their exact
 * address is private, and the Job Board has never carried it.
 */
export function buildMapsDirectionUrl(directionLabel: string | null | undefined, country = "Bangladesh"): string | null {
  const area = directionLabel?.trim();
  return area ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${area}, ${country}`)}` : null;
}
