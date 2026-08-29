import { describe, expect, it } from "vitest";
import { createLegacyTutorProfileSeed } from "./db";

describe("legacy Tutor profile continuity", () => {
  it("creates a private draft seed from an authenticated Tutor's first saved identity fields", () => {
    expect(
      createLegacyTutorProfileSeed(
        1770002,
        {
          name: "  Shahayet Ahmed  ",
          gender: "male",
          currentLocationId: "bd-tangail",
          phone: "+8801911111111",
          contactEmail: "shafayetahmed80@gmail.com",
        },
      ),
    ).toEqual({
      id: "tutor-1770002",
      userId: 1770002,
      name: "Shahayet Ahmed",
      gender: "male",
      locationId: "bd-tangail",
      phone: "+8801911111111",
      contactEmail: "shafayetahmed80@gmail.com",
      profileStatus: "draft",
      initials: "SA",
    });
  });

  it("rejects a legacy first-save attempt until the required profile identity fields are supplied", () => {
    expect(() =>
      createLegacyTutorProfileSeed(1770002, {
        name: "Shahayet Ahmed",
        gender: "male",
        contactEmail: "shafayetahmed80@gmail.com",
      }),
    ).toThrow("current location");
  });
});
