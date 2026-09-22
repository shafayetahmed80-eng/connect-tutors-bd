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
  /** How the Tutor teaches - every mode they've selected. */
  modes: string[];
  locationLabel: string;
  city: string;
  experience: number;
  /** The institute a match note names, when one is known. */
  instituteName?: string;
  /**
   * Track record and standing - optional because not every caller resolves
   * them yet (the Matching workspace's older picker still does not). Absent
   * means "nothing to say", never a caution: a new Tutor is not penalised for
   * being new.
   */
  verified?: boolean;
  /** How many tuitions this Tutor has taken all the way to Confirmed. */
  confirmedTuitionCount?: number;
  /** Whether this Tutor's institute is on the Owner's featured list. */
  featuredInstitute?: boolean;
};

/**
 * How many points each signal is worth, and how far the track record climbs
 * before it stops adding more. An Owner moves these from Dynamic Section →
 * Limits → Matching; these are only the shipped starting point.
 */
export type MatchingWeights = {
  subject: number;
  level: number;
  area: number;
  mode: number;
  gender: number;
  fee: number;
  institute: number;
  verified: number;
  trackRecordPerConfirmed: number;
  /** Confirmed tuitions beyond this add no further points - a proven Tutor still loses to a stronger subject match. */
  trackRecordCap: number;
};

export const defaultMatchingWeights: MatchingWeights = {
  subject: 3,
  level: 2,
  area: 2,
  mode: 1,
  gender: 1,
  fee: 1,
  institute: 3,
  verified: 2,
  trackRecordPerConfirmed: 2,
  trackRecordCap: 5,
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

export type TutorMatchNote = { kind: "subject" | "level" | "area" | "fee" | "mode" | "gender" | "institute" | "verified" | "trackRecord"; label: string };

export type RankedMatchingTutor = {
  tutor: MatchingTutorOption;
  score: number;
  /** What lines up, strongest first. */
  reasons: TutorMatchNote[];
  /** What does not, for the Admin to weigh - never a reason to hide the Tutor. */
  cautions: TutorMatchNote[];
  matchedSubjects: string[];
};

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
 * Whether a Tutor's teaching modes can serve this request.
 *
 * A request for "both" is served by a Tutor who teaches home, online, or
 * both. Group and package requests only match a Tutor who lists that same
 * mode. No modes recorded yet is treated as unknown, never a mismatch.
 */
export function tutorModeServesRequest(modes: string[], tuitionType: MatchingTutorRequestBrief["tuitionType"]) {
  if (modes.length === 0) return true;
  const set = new Set(modes.map(normalize));
  if (tuitionType === "both") return set.has("home") || set.has("online");
  if (tuitionType === "online") return set.has("online");
  if (tuitionType === "group") return set.has("group");
  if (tuitionType === "package") return set.has("package");
  return set.has("home");
}

/** True when the request is taught in person, so the Tutor's area matters. */
export function requestNeedsTravel(tuitionType: MatchingTutorRequestBrief["tuitionType"]) {
  return tuitionType !== "online";
}

export function scoreTutorForRequest(
  tutor: MatchingTutorOption,
  request: MatchingTutorRequestBrief,
  weights: MatchingWeights = defaultMatchingWeights,
): RankedMatchingTutor {
  const reasons: TutorMatchNote[] = [];
  const cautions: TutorMatchNote[] = [];
  let score = 0;

  const wanted = parseRequestSubjects(request.subjects);
  const taught = new Set(tutor.subjects.map(normalize));
  const matchedSubjects = wanted.filter(subject => taught.has(normalize(subject)));
  if (matchedSubjects.length > 0) {
    score += matchedSubjects.length * weights.subject;
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
    score += weights.level;
    reasons.push({ kind: "level", label: `Covers ${request.classCourse || request.category}` });
  }

  if (requestNeedsTravel(request.tuitionType)) {
    const area = normalize(request.tuitionLocationLabel ?? request.locationText ?? "");
    const tutorArea = normalize(`${tutor.locationLabel} ${tutor.city}`);
    if (area && tutorArea && (tutorArea.includes(area) || area.includes(normalize(tutor.locationLabel)))) {
      score += weights.area;
      reasons.push({ kind: "area", label: `Based in ${tutor.locationLabel || tutor.city}` });
    } else if (area) {
      cautions.push({ kind: "area", label: `Based in ${tutor.locationLabel || tutor.city || "an unrecorded area"}` });
    }
  }

  if (tutorModeServesRequest(tutor.modes, request.tuitionType)) {
    score += weights.mode;
  } else {
    const modeSet = new Set(tutor.modes.map(normalize));
    cautions.push({ kind: "mode", label: `Teaches ${modeSet.has("online") && !modeSet.has("home") ? "online only" : "in person only"}` });
  }

  if (request.preferredGender !== "any") {
    if (tutor.gender === request.preferredGender) {
      score += weights.gender;
      reasons.push({ kind: "gender", label: `${request.preferredGender === "female" ? "Female" : "Male"} Tutor, as asked` });
    } else {
      cautions.push({ kind: "gender", label: `Guardian asked for a ${request.preferredGender} Tutor` });
    }
  }

  const budget = getRequestBudget(request);
  if (budget !== null && tutor.fee > 0) {
    if (tutor.fee <= budget) {
      score += weights.fee;
      reasons.push({ kind: "fee", label: `Asks ${tutor.fee} within ${budget}` });
    } else {
      cautions.push({ kind: "fee", label: `Asks ${tutor.fee} over the ${budget} budget` });
    }
  }

  // Credential, standing and track record - never a caution when absent, a
  // new or unlisted Tutor simply carries no bonus for them yet.
  if (tutor.featuredInstitute) {
    score += weights.institute;
    reasons.push({ kind: "institute", label: tutor.instituteName ? `${tutor.instituteName} - featured institute` : "Featured institute" });
  }

  if (tutor.verified) {
    score += weights.verified;
    reasons.push({ kind: "verified", label: "Verified Tutor" });
  }

  const confirmedCount = tutor.confirmedTuitionCount ?? 0;
  if (confirmedCount > 0) {
    score += Math.min(confirmedCount, weights.trackRecordCap) * weights.trackRecordPerConfirmed;
    reasons.push({ kind: "trackRecord", label: `${confirmedCount} tuition${confirmedCount === 1 ? "" : "s"} Confirmed` });
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
  weights: MatchingWeights = defaultMatchingWeights,
): RankedMatchingTutor[] {
  const needle = normalize(filters.query);
  return tutors
    .map(tutor => scoreTutorForRequest(tutor, request, weights))
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
