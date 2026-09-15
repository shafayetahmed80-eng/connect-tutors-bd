import { describe, expect, it } from "vitest";
import {
  applicantActionLabels,
  applicantActions,
  applicantStageLabels,
  canCancelTuition,
  type ApplicantActionInput,
  type TuitionStage,
} from "./admin-applicant-actions";

const actions = (input: Partial<ApplicantActionInput>) =>
  applicantActions({ tuitionStage: "live", applicationStatus: "interested", holdsTuition: false, tutorApproved: true, ...input })
    .map(option => option.disabled ? `${option.action} (disabled)` : option.action);

describe("what an Admin can do from Applied Tutors", () => {
  it("on a Live tuition: shortlists an applicant or takes them off, and appoints them", () => {
    expect(actions({})).toEqual(["shortlist", "appoint"]);
    expect(actions({ applicationStatus: "shortlisted" })).toEqual(["unshortlist", "appoint"]);
  });

  it("holds Appoint for a Tutor whose profile is not approved", () => {
    expect(actions({ tutorApproved: false })).toEqual(["shortlist", "appoint (disabled)"]);
  });

  it("on an Appointed tuition: confirms or removes its Tutor, and still shortlists the rest without appointing them", () => {
    expect(actions({ tuitionStage: "appointed", applicationStatus: "matched", holdsTuition: true })).toEqual(["confirm", "remove_appointed"]);
    expect(actions({ tuitionStage: "appointed" })).toEqual(["shortlist"]);
    expect(actions({ tuitionStage: "appointed", applicationStatus: "shortlisted" })).toEqual(["unshortlist"]);
  });

  it("on a Confirmed tuition: only removes its Tutor", () => {
    expect(actions({ tuitionStage: "confirmed", applicationStatus: "matched", holdsTuition: true })).toEqual(["remove_confirmed"]);
    expect(actions({ tuitionStage: "confirmed" })).toEqual([]);
    expect(actions({ tuitionStage: "confirmed", applicationStatus: "shortlisted" })).toEqual([]);
  });

  it("offers nothing on a Pending or Cancelled tuition, or on an application that has ended", () => {
    for (const tuitionStage of ["pending", "cancelled"] as const) {
      expect(actions({ tuitionStage }), tuitionStage).toEqual([]);
      expect(actions({ tuitionStage, applicationStatus: "matched", holdsTuition: true }), tuitionStage).toEqual([]);
    }
    expect(actions({ applicationStatus: "declined" })).toEqual([]);
    expect(actions({ applicationStatus: "withdrawn" })).toEqual([]);
  });

  it("never treats a Tutor as the holder unless their application is the appointed one", () => {
    expect(actions({ tuitionStage: "appointed", applicationStatus: "declined", holdsTuition: true })).toEqual([]);
    expect(actions({ tuitionStage: "confirmed", applicationStatus: "interested", holdsTuition: true })).toEqual([]);
  });

  it("cancels a tuition while it is Live, Appointed or Confirmed", () => {
    const stages: TuitionStage[] = ["pending", "live", "appointed", "confirmed", "cancelled"];
    expect(stages.filter(canCancelTuition)).toEqual(["live", "appointed", "confirmed"]);
  });

  it("names the buttons and the row stages", () => {
    expect(applicantActionLabels.unshortlist).toBe("Remove from shortlist");
    expect(Object.values(applicantStageLabels)).toEqual(["Applied", "Shortlisted", "Appointed", "Confirmed", "Cancelled"]);
  });
});
