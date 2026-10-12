import { describe, expect, it } from "vitest";

import { buildGuardianRequestSummary, type GuardianSummaryInput } from "./guardian-request-summary";

const request: GuardianSummaryInput = {
  learningNeeds: [{ category: "Bangla Medium", curriculumType: null, classes: [{ classCourse: "Class 9–10", subjects: ["Mathematics"] }] }],
  tuitionType: "home", groupCapacity: "", packageDurationMonths: "", studentCount: "1",
  studentGender: "", addressDetails: "", daysPerWeek: "3", preferredGender: "any",
  salaryAmount: "5000", instituteName: "", heardAboutUs: "facebook",
};

function preferences(input: GuardianSummaryInput) {
  const group = buildGuardianRequestSummary(input, "", "Dhaka", "Mirpur 10").find(item => item.title === "Tuition preferences");
  if (!group) throw new Error("No Tuition preferences group");
  return group;
}

const timeRow = (input: GuardianSummaryInput) => preferences(input).rows.find(row => row.label === "Tutoring Time");

describe("Guardian request summary: Tutoring Time", () => {
  it("reads the chosen time the way every other reader does, in 12-hour form", () => {
    expect(timeRow({ ...request, tutoringTime: "16:30" })).toEqual({ label: "Tutoring Time", value: "4:30 PM" });
    expect(timeRow({ ...request, tutoringTime: "09:05" })?.value).toBe("9:05 AM");
  });

  it("keeps the row when blank and reads it as an optional answer left empty", () => {
    // Unlike the modals, the read-back keeps the row: "Not set" says the
    // question was asked. Optional, so the view greys it rather than reddening it.
    expect(timeRow({ ...request, tutoringTime: "" })).toEqual({ label: "Tutoring Time", value: "Not set", empty: true, optional: true });
    expect(timeRow({ ...request, tutoringTime: "   " })).toEqual({ label: "Tutoring Time", value: "Not set", empty: true, optional: true });
  });

  it("reads text that is not a time as not set rather than printing it", () => {
    for (const tutoringTime of ["soon", "25:99", "4:30 PM"]) {
      expect(timeRow({ ...request, tutoringTime }), tutoringTime).toEqual({ label: "Tutoring Time", value: "Not set", empty: true, optional: true });
    }
  });

  it("still builds for a caller that does not pass the time at all", () => {
    // The input type leaves the field out on purpose: callers written before it
    // existed (and a draft with no key) must keep working, with the row blank.
    expect("tutoringTime" in request).toBe(false);
    expect(() => buildGuardianRequestSummary(request, "", "Dhaka", "Mirpur 10")).not.toThrow();
    expect(timeRow(request)).toEqual({ label: "Tutoring Time", value: "Not set", empty: true, optional: true });
  });

  it("sits in the Tuition preferences group, straight after Days per week", () => {
    const group = preferences({ ...request, tutoringTime: "16:30" });
    const labels = group.rows.map(row => row.label);

    expect(group.step).toBe(2);
    expect(labels.indexOf("Tutoring Time")).toBeGreaterThan(-1);
    expect(labels.indexOf("Tutoring Time")).toBe(labels.indexOf("Days per week") + 1);
  });

  it("is asked once, in step 2 only, so the review offers it under the right Edit", () => {
    const groups = buildGuardianRequestSummary({ ...request, tutoringTime: "16:30" }, "", "Dhaka", "Mirpur 10");
    const holders = groups.filter(group => group.rows.some(row => row.label === "Tutoring Time"));

    expect(holders.map(group => group.title)).toEqual(["Tuition preferences"]);
    expect(groups.flatMap(group => group.rows).filter(row => row.label === "Tutoring Time")).toHaveLength(1);
  });

  it("holds the same place for an online tuition, which has no location to pick", () => {
    const labels = preferences({ ...request, tuitionType: "online", tutoringTime: "16:30" }).rows.map(row => row.label);

    expect(labels.indexOf("Tutoring Time")).toBe(labels.indexOf("Days per week") + 1);
  });
});
