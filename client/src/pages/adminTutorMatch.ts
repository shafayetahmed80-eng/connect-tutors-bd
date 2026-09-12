/**
 * Ranking approved Tutors against one Guardian request.
 *
 * The Matching workspace used to offer every approved Tutor in a plain
 * `<select>`, labelled with a name and the first two subjects off their
 * profile. On a screen called "Matching workspace" that left the matching
 * itself to whoever was reading the list.
 *
 * Everything needed was already on the wire - `listTutors` returns subjects,
 * levels, fee, gender, mode and location - so this is arithmetic over data the
 * page already had, not a new query.
 *
 * Two deliberate rules:
 *
 * - **Nothing is hidden and nothing is blocked.** A mismatch becomes a caution
 *   the Admin can read and overrule, never a Tutor removed from the list. The
 *   Guardian's stated preference is a preference; the Admin knows things this
 *   arithmetic does not.
 * - **Every point is explainable.** A score with no reason beside it is a
 *   black box, and an operator cannot defend a match they cannot explain. So
 *   the reasons are the output; the score only orders them.
 */

export type MatchingTutorOption = {
  id: string;
  name: string;
  subjects: string[];
  levels: string[];
  fee: number;
  gender: "male" | "female";
  /** How the Tutor teaches: at home, online, or either. */
  mode: string;
  locationLabel: string;
  city: string;
  experience: number;
};

/** Only the parts of a request this ranking reads. */
export type MatchingTutorRequestBrief = {
  subjects: string;
  classCourse: string;
  category: string;
  preferredGender: "male" | "female" | "any";
  tuitionType: "home" | "online" | "both" | "group" | "package";
  budgetAmount: number | null;
  monthlyBudget: number | null;
  tuitionLocationLabel: string | null;
  locationText: string;
};

export type TutorMatchNote = { kind: "subject" | "level" | "area" | "fee" | "mode" | "gender"; label: string };

export type RankedMatchingTutor = {
  tutor: MatchingTutorOption;
  score: number;
  /** What lines up, strongest first. */
  reasons: TutorMatchNote[];
  /** What does not, for the Admin to weigh - never a reason to hide the Tutor. */
  cautions: TutorMatchNote[];
  matchedSubjects: string[];
};

const SUBJECT_POINTS = 3;
const LEVEL_POINTS = 2;
const AREA_POINTS = 2;
const MODE_POINTS = 1;
const GENDER_POINTS = 1;
const FEE_POINTS = 1;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

/** The request's subjects, which arrive as a JSON array or a plain string. */
export function parseRequestSubjects(subjects: string): string[] {
  try {
    const parsed = JSON.parse(subjects);
    if (Array.isArray(parsed)) return parsed.map(entry => String(entry).trim()).filter(Boolean);
  } catch {
    // Not JSON: an older row, or a comma-separated list typed by an Admin.
  }
  return subjects.split(",").map(entry => entry.trim()).filter(Boolean);
}

/** What a Guardian agreed to pay, whichever column carries it. */
export function getRequestBudget(request: Pick<MatchingTutorRequestBrief, "budgetAmount" | "monthlyBudget">) {
  return request.budgetAmount ?? request.monthlyBudget ?? null;
}

/**
 * Whether a Tutor's teaching mode can serve this request.
 *
 * `both` serves either. Group and package tuition happen in person, so they
 * read as home tuition here rather than as modes of their own.
 */
export function tutorModeServesRequest(mode: string, tuitionType: MatchingTutorRequestBrief["tuitionType"]) {
  const normalized = normalize(mode);
  if (normalized === "both" || normalized === "") return true;
  const wanted = tuitionType === "online" ? "online" : tuitionType === "both" ? "both" : "home";
  if (wanted === "both") return true;
  return normalized === wanted;
}

/** True when the request is taught in person, so the Tutor's area matters. */
export function requestNeedsTravel(tuitionType: MatchingTutorRequestBrief["tuitionType"]) {
  return tuitionType !== "online";
}

export function scoreTutorForRequest(tutor: MatchingTutorOption, request: MatchingTutorRequestBrief): RankedMatchingTutor {
  const reasons: TutorMatchNote[] = [];
  const cautions: TutorMatchNote[] = [];
  let score = 0;

  const wanted = parseRequestSubjects(request.subjects);
  const taught = new Set(tutor.subjects.map(normalize));
  const matchedSubjects = wanted.filter(subject => taught.has(normalize(subject)));
  if (matchedSubjects.length > 0) {
    score += matchedSubjects.length * SUBJECT_POINTS;
    reasons.push({ kind: "subject", label: `Teaches ${matchedSubjects.join(", ")}` });
  }
  const missingSubjects = wanted.filter(subject => !taught.has(normalize(subject)));
  if (wanted.length > 0 && missingSubjects.length > 0) {
    cautions.push({ kind: "subject", label: `Does not list ${missingSubjects.join(", ")}` });
  }

  // The class the Guardian asked for, then the broader category - a Tutor who
  // lists "HSC" is a level match for an HSC request even without the exact
  // course name.
  const levels = tutor.levels.map(normalize);
  const levelTargets = [request.classCourse, request.category].map(normalize).filter(Boolean);
  const matchedLevel = levelTargets.find(target => levels.some(level => level.includes(target) || target.includes(level)));
  if (matchedLevel) {
    score += LEVEL_POINTS;
    reasons.push({ kind: "level", label: `Covers ${request.classCourse || request.category}` });
  }

  if (requestNeedsTravel(request.tuitionType)) {
    const area = normalize(request.tuitionLocationLabel ?? request.locationText ?? "");
    const tutorArea = normalize(`${tutor.locationLabel} ${tutor.city}`);
    if (area && tutorArea && (tutorArea.includes(area) || area.includes(normalize(tutor.locationLabel)))) {
      score += AREA_POINTS;
      reasons.push({ kind: "area", label: `Based in ${tutor.locationLabel || tutor.city}` });
    } else if (area) {
      cautions.push({ kind: "area", label: `Based in ${tutor.locationLabel || tutor.city || "an unrecorded area"}` });
    }
  }

  if (tutorModeServesRequest(tutor.mode, request.tuitionType)) {
    score += MODE_POINTS;
  } else {
    cautions.push({ kind: "mode", label: `Teaches ${normalize(tutor.mode) === "online" ? "online only" : "in person only"}` });
  }

  if (request.preferredGender !== "any") {
    if (tutor.gender === request.preferredGender) {
      score += GENDER_POINTS;
      reasons.push({ kind: "gender", label: `${request.preferredGender === "female" ? "Female" : "Male"} Tutor, as asked` });
    } else {
      cautions.push({ kind: "gender", label: `Guardian asked for a ${request.preferredGender} Tutor` });
    }
  }

  const budget = getRequestBudget(request);
  if (budget !== null && tutor.fee > 0) {
    if (tutor.fee <= budget) {
      score += FEE_POINTS;
      reasons.push({ kind: "fee", label: `Asks ${tutor.fee} within ${budget}` });
    } else {
      cautions.push({ kind: "fee", label: `Asks ${tutor.fee} over the ${budget} budget` });
    }
  }

  return { tutor, score, reasons, cautions, matchedSubjects };
}

export type TutorMatchFilters = {
  /** Name or subject, typed. */
  query: string;
  subjectMatchOnly: boolean;
  sameAreaOnly: boolean;
  withinBudgetOnly: boolean;
};

export const emptyTutorMatchFilters: TutorMatchFilters = {
  query: "",
  subjectMatchOnly: false,
  sameAreaOnly: false,
  withinBudgetOnly: false,
};

/**
 * Every Tutor, best match first - filtered only by what the Admin asked for.
 *
 * Ties break on experience and then name, so the order never shuffles between
 * renders; an operator comparing two screens has to see the same list.
 */
export function rankTutorsForRequest(
  tutors: MatchingTutorOption[],
  request: MatchingTutorRequestBrief,
  filters: TutorMatchFilters = emptyTutorMatchFilters,
): RankedMatchingTutor[] {
  const needle = normalize(filters.query);
  return tutors
    .map(tutor => scoreTutorForRequest(tutor, request))
    .filter(ranked => {
      if (filters.subjectMatchOnly && ranked.matchedSubjects.length === 0) return false;
      if (filters.sameAreaOnly && !ranked.reasons.some(reason => reason.kind === "area")) return false;
      if (filters.withinBudgetOnly && ranked.cautions.some(caution => caution.kind === "fee")) return false;
      if (!needle) return true;
      return normalize(ranked.tutor.name).includes(needle)
        || ranked.tutor.subjects.some(subject => normalize(subject).includes(needle));
    })
    .sort((a, b) =>
      b.score - a.score
      || b.tutor.experience - a.tutor.experience
      || a.tutor.name.localeCompare(b.tutor.name));
}
