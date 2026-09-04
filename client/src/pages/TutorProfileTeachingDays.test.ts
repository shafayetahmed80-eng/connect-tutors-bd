import { describe, expect, it } from "vitest";
import { allTeachingDaysId, expandTeachingDayIds, selectedTeachingDayIds, teachingDayIds, teachingDayOptions } from "./TutorProfileTeachingDays";

describe("the Preferred Teaching Days box", () => {
  it("offers All Days ahead of the seven", () => {
    expect(teachingDayOptions[0]).toEqual({ id: allTeachingDaysId, label: "All Days" });
    expect(teachingDayOptions).toHaveLength(8);
  });

  it("stores the seven days, never an eighth value the server would reject", () => {
    expect(expandTeachingDayIds([allTeachingDaysId])).toEqual(teachingDayIds);
    expect(expandTeachingDayIds([allTeachingDaysId, "monday"])).toEqual(teachingDayIds);
  });

  it("keeps a chosen handful as that handful, in week order", () => {
    expect(expandTeachingDayIds(["monday", "saturday"])).toEqual(["saturday", "monday"]);
  });

  it("shows All Days back to a Tutor who teaches every day", () => {
    expect(selectedTeachingDayIds(teachingDayIds)).toEqual([allTeachingDaysId]);
    expect(selectedTeachingDayIds(["saturday", "monday"])).toEqual(["saturday", "monday"]);
    expect(selectedTeachingDayIds([])).toEqual([]);
  });
});
