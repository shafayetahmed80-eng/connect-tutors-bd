import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, buildJobBoardPageLinks, buildJobBoardQuery, buildMapsDirectionUrl, countJobBoardFilters, formatJobBoardTuitionType, formatJobBudget, getJobBoardPagination, getTutorInterestPresentation, reconcileJobBoardFilters } from "./JobBoard";

describe("Job Board view helpers", () => {
  it("sends only the filters actually in use, and whole days for a date range", () => {
    expect(buildJobBoardQuery({
      ...DEFAULT_FILTERS,
      page: -4,
      cityId: "  dhaka-city ",
      locationIds: ["dhaka-adabor", "dhaka-gulshan"],
      tuitionTypes: ["home", "online"],
      daysPerWeek: ["3", "4"],
      categories: ["Bangla Medium"],
      classCourses: ["Class 4"],
      subjects: ["General Maths"],
      studentGender: "female",
      preferredTutorGender: "female",
      country: "Bangladesh",
      jobId: "  6812 ",
    })).toEqual({
      page: 1,
      pageSize: 20,
      country: "Bangladesh",
      cityId: "dhaka-city",
      locationIds: ["dhaka-adabor", "dhaka-gulshan"],
      tuitionTypes: ["home", "online"],
      // Sent as numbers, though the chips carry them as ids.
      daysPerWeek: [3, 4],
      categories: ["Bangla Medium"],
      classCourses: ["Class 4"],
      subjects: ["General Maths"],
      studentGender: "female",
      preferredTutorGender: "female",
      jobId: "6812",
    });
  });

  it("leaves an untouched filter out rather than sending it empty", () => {
    // The server reads `if (input.x)`, so a blank box and a missing key have
    // to mean the same thing.
    expect(buildJobBoardQuery(DEFAULT_FILTERS)).toEqual({ page: 1, pageSize: 20 });
  });

  it("covers the whole of both days a range names", () => {
    // A job posted at noon on the 'to' date belongs inside a range that ends
    // on it, so 'to' runs to the last moment of its day rather than midnight.
    const query = buildJobBoardQuery({ ...DEFAULT_FILTERS, postedFrom: "2026-11-01", postedTo: "2026-11-20" });
    expect(query.postedFrom).toEqual(new Date("2026-11-01T00:00:00"));
    expect(query.postedTo).toEqual(new Date("2026-11-20T23:59:59.999"));
  });

  it("drops a Location when its City goes, and a Class when its Category goes", () => {
    const options = {
      locationsByCity: { "dhaka-city": [{ id: "dhaka-adabor", label: "Adabor" }] },
      classesByCategory: { "Bangla Medium": ["Class 4"], "English Medium": ["O Level"] },
      subjectsByClass: { "Class 4": ["General Maths"], "O Level": ["Physics"] },
    };
    const chosen = {
      ...DEFAULT_FILTERS,
      cityId: "dhaka-city",
      locationIds: ["dhaka-adabor"],
      categories: ["Bangla Medium"],
      classCourses: ["Class 4"],
      subjects: ["General Maths"],
    };
    // Nothing to reconcile while the parents stand.
    expect(reconcileJobBoardFilters(chosen, options)).toMatchObject({
      locationIds: ["dhaka-adabor"], classCourses: ["Class 4"], subjects: ["General Maths"],
    });

    // Clearing the City takes its areas; dropping the Category takes its
    // classes, and the subjects those classes were offering.
    expect(reconcileJobBoardFilters({ ...chosen, cityId: "" }, options).locationIds).toEqual([]);
    const withoutCategory = reconcileJobBoardFilters({ ...chosen, categories: [] }, options);
    expect(withoutCategory.classCourses).toEqual([]);
    expect(withoutCategory.subjects).toEqual([]);
  });

  it("counts the filters that are narrowing the board, and no others", () => {
    expect(countJobBoardFilters(DEFAULT_FILTERS)).toBe(0);
    // The page number is not a filter.
    expect(countJobBoardFilters({ ...DEFAULT_FILTERS, page: 4 })).toBe(0);
    expect(countJobBoardFilters({ ...DEFAULT_FILTERS, cityId: "dhaka-city", subjects: ["Bangla"] })).toBe(2);
    // An emptied list stops counting.
    expect(countJobBoardFilters({ ...DEFAULT_FILTERS, subjects: [] })).toBe(0);
  });
  it("constructs only an area-level Google Maps search URL and never falls back to an exact address", () => {
    expect(buildMapsDirectionUrl("Mirpur 10, Dhaka")).toBe("https://www.google.com/maps/search/?api=1&query=Mirpur%2010%2C%20Dhaka%2C%20Bangladesh");
    expect(buildMapsDirectionUrl(null)).toBeNull();
  });

  it("keeps budget labels truthful and provides bounded 20-item pagination actions", () => {
    // One amount, written the same way the Guardian panel writes it - the Job
    // Board used to say "৳8,000–৳10,000 / month" while the Guardian's own card
    // said "৳8,000 – ৳10,000" for the same request.
    expect(formatJobBudget(8000)).toBe("8,000 Taka");
    // A request made before the single-amount change carries no figure.
    expect(formatJobBudget(null)).toBe("Not set");
    expect(getJobBoardPagination({ page: 3, pageSize: 20, totalCount: 45 })).toEqual({ totalPages: 3, previousPage: 2, nextPage: null });
  });

  it("builds compact numbered pagination links without making every page control visible", () => {
    expect(buildJobBoardPageLinks({ page: 1, totalPages: 1 })).toEqual([1]);
    expect(buildJobBoardPageLinks({ page: 1, totalPages: 9 })).toEqual([1, 2, 3, "ellipsis", 9]);
    expect(buildJobBoardPageLinks({ page: 5, totalPages: 9 })).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 9]);
    expect(buildJobBoardPageLinks({ page: 9, totalPages: 9 })).toEqual([1, "ellipsis", 7, 8, 9]);
  });

  it("labels Group and Package Tutoring jobs truthfully on the public Job Board", () => {
    expect(formatJobBoardTuitionType("group")).toBe("Group Tutoring");
    expect(formatJobBoardTuitionType("package")).toBe("Package Tutoring");
  });

  it("shows actionable Tutor-only application states without suggesting Guardian contact access", () => {
    expect(getTutorInterestPresentation(undefined)).toMatchObject({ statusLabel: null, description: null, action: "express", actionLabel: "Apply Now" });
    expect(getTutorInterestPresentation("interested")).toMatchObject({ statusLabel: "Application submitted", description: null, action: "withdraw", actionLabel: "Withdraw application" });
    expect(getTutorInterestPresentation("shortlisted")).toMatchObject({ statusLabel: "Shortlisted", description: null, action: "withdraw", actionLabel: "Withdraw application" });
    expect(getTutorInterestPresentation("withdrawn")).toMatchObject({ statusLabel: "Application withdrawn", action: "express", actionLabel: "Apply again" });
    expect(getTutorInterestPresentation("matched")).toMatchObject({ statusLabel: "Matched", description: null, action: null });
  });
});
