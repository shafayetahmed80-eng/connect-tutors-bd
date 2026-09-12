import { describe, expect, it } from "vitest";
import {
  emptyTutorMatchFilters,
  getRequestBudget,
  parseRequestSubjects,
  rankTutorsForRequest,
  requestNeedsTravel,
  scoreTutorForRequest,
  tutorModeServesRequest,
  type MatchingTutorOption,
  type MatchingTutorRequestBrief,
} from "./adminTutorMatch";

const request: MatchingTutorRequestBrief = {
  subjects: JSON.stringify(["Physics", "Higher Mathematics"]),
  classCourse: "HSC 1st Year",
  category: "Bangla Medium",
  preferredGender: "female",
  tuitionType: "home",
  budgetAmount: 6000,
  monthlyBudget: null,
  tuitionLocationLabel: "Uttara",
  locationText: "Uttara, Dhaka",
};

function tutor(overrides: Partial<MatchingTutorOption> = {}): MatchingTutorOption {
  return {
    id: "t1",
    name: "Tania Sultana",
    subjects: ["Physics", "Higher Mathematics", "Chemistry"],
    levels: ["HSC 1st Year", "HSC 2nd Year"],
    fee: 5000,
    gender: "female",
    mode: "home",
    locationLabel: "Uttara",
    city: "Dhaka",
    experience: 4,
    ...overrides,
  };
}

describe("reading a request", () => {
  it("takes subjects from a JSON array or a typed comma list", () => {
    expect(parseRequestSubjects(JSON.stringify(["Physics", "Chemistry"]))).toEqual(["Physics", "Chemistry"]);
    expect(parseRequestSubjects("Physics, Chemistry")).toEqual(["Physics", "Chemistry"]);
    expect(parseRequestSubjects("")).toEqual([]);
  });

  it("reads whichever budget column carries the figure", () => {
    expect(getRequestBudget({ budgetAmount: 6000, monthlyBudget: 4000 })).toBe(6000);
    expect(getRequestBudget({ budgetAmount: null, monthlyBudget: 4000 })).toBe(4000);
    expect(getRequestBudget({ budgetAmount: null, monthlyBudget: null })).toBeNull();
  });

  it("treats group and package tuition as taught in person", () => {
    expect(requestNeedsTravel("home")).toBe(true);
    expect(requestNeedsTravel("group")).toBe(true);
    expect(requestNeedsTravel("package")).toBe(true);
    expect(requestNeedsTravel("online")).toBe(false);
  });

  it("lets a both-modes Tutor serve either kind of request", () => {
    expect(tutorModeServesRequest("both", "online")).toBe(true);
    expect(tutorModeServesRequest("both", "home")).toBe(true);
    expect(tutorModeServesRequest("online", "home")).toBe(false);
    expect(tutorModeServesRequest("home", "online")).toBe(false);
    // Group tuition happens in person, so a home Tutor serves it.
    expect(tutorModeServesRequest("home", "group")).toBe(true);
  });
});

describe("why this Tutor", () => {
  it("names every point it awarded", () => {
    const ranked = scoreTutorForRequest(tutor(), request);

    expect(ranked.matchedSubjects).toEqual(["Physics", "Higher Mathematics"]);
    expect(ranked.reasons.map(reason => reason.kind)).toEqual(["subject", "level", "area", "gender", "fee"]);
    expect(ranked.reasons[0].label).toBe("Teaches Physics, Higher Mathematics");
    expect(ranked.cautions).toEqual([]);
    // 2 subjects × 3, + level 2, + area 2, + mode 1, + gender 1, + fee 1.
    expect(ranked.score).toBe(13);
  });

  it("says what does not line up instead of hiding the Tutor", () => {
    const ranked = scoreTutorForRequest(tutor({
      subjects: ["Physics"],
      gender: "male",
      fee: 9000,
      locationLabel: "Mirpur",
      mode: "online",
    }), request);

    expect(ranked.cautions.map(caution => caution.kind)).toEqual(["subject", "area", "mode", "gender", "fee"]);
    expect(ranked.cautions[0].label).toBe("Does not list Higher Mathematics");
    expect(ranked.cautions[4].label).toBe("Asks 9000 over the 6000 budget");
    // Still scored and still listed: the Admin knows things this does not.
    // One subject × 3 plus the level, which this Tutor does still cover.
    expect(ranked.score).toBe(5);
  });

  it("never asks an online request about the Tutor's area", () => {
    const onlineRequest = { ...request, tuitionType: "online" as const };
    const ranked = scoreTutorForRequest(tutor({ locationLabel: "Sylhet", city: "Sylhet", mode: "online" }), onlineRequest);

    expect(ranked.reasons.some(reason => reason.kind === "area")).toBe(false);
    expect(ranked.cautions.some(caution => caution.kind === "area")).toBe(false);
  });

  it("matches a level by the broader category when the course name differs", () => {
    const ranked = scoreTutorForRequest(tutor({ levels: ["Bangla Medium"] }), request);
    expect(ranked.reasons.some(reason => reason.kind === "level")).toBe(true);
  });

  it("leaves the budget unmentioned when neither side names a figure", () => {
    const ranked = scoreTutorForRequest(tutor({ fee: 0 }), { ...request, budgetAmount: null, monthlyBudget: null });
    expect([...ranked.reasons, ...ranked.cautions].some(note => note.kind === "fee")).toBe(false);
  });
});

describe("ordering the list", () => {
  const strong = tutor({ id: "strong", name: "Strong Match" });
  const weak = tutor({ id: "weak", name: "Weak Match", subjects: ["Biology"], gender: "male", locationLabel: "Khulna", city: "Khulna", fee: 9000 });
  const middling = tutor({ id: "middling", name: "Middling", subjects: ["Physics"], locationLabel: "Mirpur" });

  it("puts the best match first and keeps everyone on the list", () => {
    const ranked = rankTutorsForRequest([weak, middling, strong], request);
    expect(ranked.map(entry => entry.tutor.id)).toEqual(["strong", "middling", "weak"]);
  });

  it("breaks a tie on experience, then on name, so the order never shuffles", () => {
    const senior = tutor({ id: "senior", name: "Zara Ahmed", experience: 9 });
    const junior = tutor({ id: "junior", name: "Abdul Karim", experience: 2 });
    const ranked = rankTutorsForRequest([junior, senior], request);

    expect(ranked.map(entry => entry.tutor.id)).toEqual(["senior", "junior"]);
  });

  it("narrows to subject matches, to the same area, or to what fits the budget", () => {
    const all = [weak, middling, strong];

    expect(rankTutorsForRequest(all, request, { ...emptyTutorMatchFilters, subjectMatchOnly: true }).map(e => e.tutor.id))
      .toEqual(["strong", "middling"]);
    expect(rankTutorsForRequest(all, request, { ...emptyTutorMatchFilters, sameAreaOnly: true }).map(e => e.tutor.id))
      .toEqual(["strong"]);
    expect(rankTutorsForRequest(all, request, { ...emptyTutorMatchFilters, withinBudgetOnly: true }).map(e => e.tutor.id))
      .toEqual(["strong", "middling"]);
  });

  it("searches a name or a subject the Tutor teaches", () => {
    const all = [weak, middling, strong];

    expect(rankTutorsForRequest(all, request, { ...emptyTutorMatchFilters, query: "weak" }).map(e => e.tutor.id)).toEqual(["weak"]);
    expect(rankTutorsForRequest(all, request, { ...emptyTutorMatchFilters, query: "biology" }).map(e => e.tutor.id)).toEqual(["weak"]);
    expect(rankTutorsForRequest(all, request, { ...emptyTutorMatchFilters, query: "zzz" })).toEqual([]);
  });
});
