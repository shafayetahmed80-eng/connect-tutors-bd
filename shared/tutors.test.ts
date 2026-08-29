import { describe, expect, it } from "vitest";
import { activeLocations, managedLocations, tutors } from "./tutors";

describe("Tutor Discovery domain", () => {
  it("contains Bangladesh division and district location paths", () => {
    expect(managedLocations.some((location) => location.id === "dhaka" && location.type === "division")).toBe(true);
    expect(managedLocations.some((location) => location.id === "comilla" && location.type === "district" && location.parentId === "chattogram")).toBe(true);
  });

  it("contains selected international country and city locations", () => {
    expect(managedLocations.some((location) => location.id === "usa" && location.type === "country")).toBe(true);
    expect(managedLocations.some((location) => location.id === "london" && location.type === "city" && location.parentId === "uk")).toBe(true);
    expect(managedLocations.every((location) => location.enabled)).toBe(true);
    expect(activeLocations.length).toBe(managedLocations.length);
  });

  it("covers home, online, and combined tuition modes", () => {
    expect(new Set(tutors.map((tutor) => tutor.mode))).toEqual(new Set(["home", "online", "both"]));
  });

  it("keeps tutor location metadata aligned with the managed catalog", () => {
    const locationIds = new Set(managedLocations.map((location) => location.id));
    expect(tutors.every((tutor) => locationIds.has(tutor.locationId))).toBe(true);
  });
});

