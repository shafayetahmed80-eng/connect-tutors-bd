import { describe, expect, it } from "vitest";
import {
  buildMapsDirectionUrl,
  formatDaysPerWeek,
  formatLocation,
  formatNotes,
  formatPostedDate,
  formatStudentCount,
  formatStudentGender,
  formatSubjects,
  formatTuitionType,
  formatTutorPreference,
  readSubjects,
} from "./job-card";

describe("job card wording", () => {
  it("names each tuition type the way the forms do", () => {
    expect(formatTuitionType("home")).toBe("Home Tutoring");
    expect(formatTuitionType("online")).toBe("Online Tutoring");
    expect(formatTuitionType("group")).toBe("Group Tutoring");
    expect(formatTuitionType("package")).toBe("Package Tutoring");
  });

  it("writes the tutor preference as a word, not only as an icon", () => {
    expect(formatTutorPreference("male")).toBe("Male");
    expect(formatTutorPreference("female")).toBe("Female");
    expect(formatTutorPreference("any")).toBe("Any");
  });

  it("distinguishes a student gender nobody gave from one that failed to load", () => {
    expect(formatStudentGender("female")).toBe("Female");
    expect(formatStudentGender(null)).toBe("Not specified");
    expect(formatStudentGender(undefined)).toBe("Not specified");
  });

  it("counts days and students in the singular where there is one", () => {
    expect(formatDaysPerWeek(1)).toBe("1 day / week");
    expect(formatDaysPerWeek(3)).toBe("3 days / week");
    expect(formatStudentCount(1)).toBe("1 student");
    expect(formatStudentCount(2)).toBe("2 students");
  });

  it("reads subjects whether they arrive as an array or as the stored JSON", () => {
    expect(readSubjects(["Bangla", "ICT"])).toEqual(["Bangla", "ICT"]);
    expect(readSubjects('["Higher Maths","ICT"]')).toEqual(["Higher Maths", "ICT"]);
    expect(formatSubjects('["Higher Maths","ICT"]')).toBe("Higher Maths, ICT");
  });

  it("shows nothing rather than raw JSON when a row is malformed", () => {
    expect(readSubjects("{not json")).toEqual([]);
    expect(formatSubjects("{not json")).toBe("Not set");
  });

  it("adds the country in the details and leaves it off the card", () => {
    const place = { tuitionType: "home", locationLabel: "Bosila, Dhaka", country: "Bangladesh" };
    expect(formatLocation(place)).toBe("Bosila, Dhaka");
    expect(formatLocation({ ...place, withCountry: true })).toBe("Bosila, Dhaka, Bangladesh");
  });

  it("says online tuition has no place rather than leaving the row blank", () => {
    expect(formatLocation({ tuitionType: "online", locationLabel: null, withCountry: true })).toBe("Online — no travel");
  });

  it("fills an empty notes field with words, not a blank", () => {
    expect(formatNotes("Please start after Eid")).toBe("Please start after Eid");
    expect(formatNotes("   ")).toBe("No Special Requirements");
    expect(formatNotes(null)).toBe("No Special Requirements");
  });

  it("writes the posted date the way the rest of the site does", () => {
    expect(formatPostedDate("2026-08-30T01:48:50.000Z")).toBe("30 Aug 2026");
    expect(formatPostedDate(null)).toBe("Not set");
    expect(formatPostedDate("not a date")).toBe("Not set");
  });
});

describe("map link", () => {
  it("searches the area, and only the area", () => {
    expect(buildMapsDirectionUrl("Bosila, Dhaka"))
      .toBe("https://www.google.com/maps/search/?api=1&query=Bosila%2C%20Dhaka%2C%20Bangladesh");
  });

  it("offers no link where there is no area to point at", () => {
    // Online tuition, or a request whose location never resolved.
    for (const value of [null, undefined, "", "   "]) {
      expect(buildMapsDirectionUrl(value), String(value)).toBeNull();
    }
  });
});
