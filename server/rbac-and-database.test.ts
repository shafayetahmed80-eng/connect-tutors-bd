import { describe, expect, it } from "vitest";
import { listLocations, listTutorListingPage, listTutors } from "./db";
import { hasRequiredRole } from "./_core/trpc";

describe("role-based access decisions", () => {
  it("allows only the expected role", () => {
    expect(hasRequiredRole("guardian", ["guardian", "user"])).toBe(true);
    expect(hasRequiredRole("tutor", ["guardian", "user"])).toBe(false);
    expect(hasRequiredRole(undefined, ["guardian", "user"])).toBe(false);
  });
});

describe("database-backed discovery reads", () => {
  it("returns seeded locations and tutors without writing test data", async () => {
    const [locations, tutors] = await Promise.all([listLocations(), listTutors()]);
    expect(locations.length).toBeGreaterThan(0);
    expect(locations.some((location) => location.type === "country")).toBe(true);
    expect(tutors.length).toBeGreaterThan(0);
    expect(tutors.every((tutor) => Array.isArray(tutor.subjects))).toBe(true);
  });

  it("returns a paginated public listing without private contact fields", async () => {
    const page = await listTutorListingPage({
      query: "",
      country: "all",
      city: "all",
      division: "all",
      district: "all",
      mode: "all",
      subjects: [],
      levels: [],
      languages: [],
      gender: "all",
      verifiedOnly: true,
      page: 1,
      pageSize: 2,
    });
    expect(page.pageSize).toBe(2);
    expect(page.totalPages).toBeGreaterThan(0);
    expect(page.items.every(tutor => tutor.verified)).toBe(true);
    expect(page.items.every(tutor => !("phone" in tutor) && !("contactEmail" in tutor))).toBe(true);
  });
});
