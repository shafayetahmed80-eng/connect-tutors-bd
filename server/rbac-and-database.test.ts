import { describe, expect, it } from "vitest";
import { listLocations, listTutors } from "./db";
import { hasRequiredRole } from "./_core/trpc";

describe("role-based access decisions", () => {
  it("allows only the expected role", () => {
    expect(hasRequiredRole("guardian", ["guardian", "user"])).toBe(true);
    expect(hasRequiredRole("tutor", ["guardian", "user"])).toBe(false);
    expect(hasRequiredRole(undefined, ["guardian", "user"])).toBe(false);
  });
});

describe("database-backed discovery reads", () => {
  it("returns seeded locations and approved tutors without writing test data", async () => {
    const [locations, tutors] = await Promise.all([listLocations(), listTutors()]);
    expect(locations.length).toBeGreaterThan(0);
    expect(locations.some((location) => location.type === "country")).toBe(true);
    expect(tutors.length).toBeGreaterThan(0);
    expect(tutors.every((tutor) => Array.isArray(tutor.subjects))).toBe(true);
  });
});
