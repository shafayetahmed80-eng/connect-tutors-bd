import { describe, expect, it } from "vitest";
import { getTutorRegistrationAreas, getTutorRegistrationCities, TUTOR_REGISTRATION_CITY_IDS } from "./tutorRegistrationLocations";

const locations = [
  { id: "dhaka-city", label: "Dhaka", type: "city", country: "Bangladesh", parentId: "dhaka" },
  { id: "tangail-city", label: "Tangail", type: "city", country: "Bangladesh", parentId: "bd" },
  { id: "sirajganj-city", label: "Sirajগঞ্জ", type: "city", country: "Bangladesh", parentId: "bd" },
  { id: "dhaka-dhanmondi", label: "Dhanmondi", type: "area", country: "Bangladesh", parentId: "dhaka-city" },
  { id: "dhaka-gulshan", label: "Gulshan", type: "area", country: "Bangladesh", parentId: "dhaka-city" },
  { id: "dubai-city", label: "Dubai", type: "city", country: "United Arab Emirates", parentId: "ae" },
  { id: "dubai-marina", label: "Dubai Marina", type: "area", country: "United Arab Emirates", parentId: "dhaka-city" },
] as const;

describe("Tutor registration location selection", () => {
  it("exposes the Bangladesh primary-city list including Tangail and Sirajগঞ্জ only", () => {
    const cities = getTutorRegistrationCities([...locations]);
    expect(TUTOR_REGISTRATION_CITY_IDS).toContain("tangail-city");
    expect(TUTOR_REGISTRATION_CITY_IDS).toContain("sirajganj-city");
    expect(cities.map(city => city.id)).toEqual(["dhaka-city", "tangail-city", "sirajganj-city"]);
    expect(cities.some(city => city.country !== "Bangladesh")).toBe(false);
  });

  it("returns only Bangladesh areas belonging to the chosen city", () => {
    expect(getTutorRegistrationAreas([...locations], "dhaka-city").map(area => area.id)).toEqual(["dhaka-dhanmondi", "dhaka-gulshan"]);
  });
});
