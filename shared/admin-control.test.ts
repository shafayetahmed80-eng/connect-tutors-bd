import { describe, expect, it } from "vitest";
import {
  DEFAULT_GUARDIAN_APPLICANT_VISIBILITY,
  GUARDIAN_APPLICANT_VISIBILITY_ID,
  NEW_TUITION_TUTOR_ALERTS_ENABLED_ID,
  guardianApplicantVisibilityFromStored,
  newTuitionTutorAlertsEnabledFromStored,
  storedGuardianApplicantVisibility,
  DEFAULT_TUTOR_CHAT_ACCESS_MODE,
  TUTOR_CHAT_ACCESS_MODE_ID,
  tutorChatAccessModeFromStored,
  storedTutorChatAccessMode,
} from "./admin-control";
import { findSiteLimit } from "./site-limits";

describe("the Guardian applicant switch", () => {
  it("shows Guardians shortlisted Tutors only until the Owner chooses", () => {
    expect(DEFAULT_GUARDIAN_APPLICANT_VISIBILITY).toBe("shortlisted");
    expect(guardianApplicantVisibilityFromStored(undefined)).toBe("shortlisted");
    expect(guardianApplicantVisibilityFromStored(null)).toBe("shortlisted");
  });

  it("stores each choice as one number and reads it back", () => {
    for (const mode of ["all", "shortlisted"] as const) {
      expect(guardianApplicantVisibilityFromStored(storedGuardianApplicantVisibility(mode))).toBe(mode);
    }
    // A number that is neither falls back rather than guessing.
    expect(guardianApplicantVisibilityFromStored(7)).toBe("shortlisted");
  });

  it("is kept out of the limits registry, so the Limits editor can never save it", () => {
    expect(findSiteLimit(GUARDIAN_APPLICANT_VISIBILITY_ID)).toBeUndefined();
  });
});

describe("the Tutor live chat access switch", () => {
  it("defaults to appointed tutors only", () => {
    expect(DEFAULT_TUTOR_CHAT_ACCESS_MODE).toBe("appointed");
    expect(tutorChatAccessModeFromStored(undefined)).toBe("appointed");
    expect(tutorChatAccessModeFromStored(null)).toBe("appointed");
  });

  it("stores each choice as a distinct number and reads it back", () => {
    for (const mode of ["appointed", "approved", "all", "disabled"] as const) {
      expect(tutorChatAccessModeFromStored(storedTutorChatAccessMode(mode))).toBe(mode);
    }
    // An unknown number falls back to appointed
    expect(tutorChatAccessModeFromStored(99)).toBe("appointed");
  });

  it("is kept out of the limits registry, so the Limits editor can never save it", () => {
    expect(findSiteLimit(TUTOR_CHAT_ACCESS_MODE_ID)).toBeUndefined();
  });
});

describe("the new tuition alerts switch", () => {
  it("is on until the Owner turns it off, because the phone alert was already going out", () => {
    expect(newTuitionTutorAlertsEnabledFromStored(undefined)).toBe(true);
    expect(newTuitionTutorAlertsEnabledFromStored(null)).toBe(true);
  });

  it("stores On as 1 and Off as 0, and a number that is neither falls back to On rather than guessing", () => {
    expect(newTuitionTutorAlertsEnabledFromStored(1)).toBe(true);
    expect(newTuitionTutorAlertsEnabledFromStored(0)).toBe(false);
    expect(newTuitionTutorAlertsEnabledFromStored(7)).toBe(true);
  });

  it("is kept out of the limits registry, so the Limits editor can never save it", () => {
    expect(findSiteLimit(NEW_TUITION_TUTOR_ALERTS_ENABLED_ID)).toBeUndefined();
  });
});

import {
  CHAT_BUSINESS_HOURS_ENABLED_ID,
  CHAT_BUSINESS_HOURS_END_ID,
  CHAT_BUSINESS_HOURS_START_ID,
  chatBusinessHoursEnabledFromStored,
  chatBusinessHoursEndFromStored,
  chatBusinessHoursStartFromStored,
  extractTopicFromMessage,
  isWithinBusinessHours,
  minutesToTimeString,
  timeStringToMinutes,
  TUTOR_CHAT_TOPICS,
} from "./admin-control";

describe("the Chat Business Hours and Auto-Reply switch", () => {
  it("defaults to off with 10:00 to 20:00 range", () => {
    expect(chatBusinessHoursEnabledFromStored(undefined)).toBe(false);
    expect(chatBusinessHoursStartFromStored(undefined)).toBe(600);
    expect(chatBusinessHoursEndFromStored(undefined)).toBe(1200);
  });

  it("converts between minutes and hh:mm strings cleanly", () => {
    expect(minutesToTimeString(600)).toBe("10:00");
    expect(minutesToTimeString(1200)).toBe("20:00");
    expect(minutesToTimeString(0)).toBe("00:00");

    expect(timeStringToMinutes("10:00")).toBe(600);
    expect(timeStringToMinutes("20:00")).toBe(1200);
    expect(timeStringToMinutes("00:00")).toBe(0);
    expect(timeStringToMinutes("invalid")).toBe(600);
  });

  it("accurately tests business hours in Bangladesh UTC+6 timezone", () => {
    // 08:00 UTC = 14:00 Bangladesh time (2:00 PM) -> within 10:00 to 20:00
    const dayTime = new Date("2026-10-23T08:00:00.000Z");
    expect(isWithinBusinessHours(dayTime, 600, 1200)).toBe(true);

    // 21:00 UTC = 03:00 next day Bangladesh time (3:00 AM) -> outside 10:00 to 20:00
    const nightTime = new Date("2026-10-23T21:00:00.000Z");
    expect(isWithinBusinessHours(nightTime, 600, 1200)).toBe(false);
  });

  it("keeps business hours IDs out of the site limits registry", () => {
    expect(findSiteLimit(CHAT_BUSINESS_HOURS_ENABLED_ID)).toBeUndefined();
    expect(findSiteLimit(CHAT_BUSINESS_HOURS_START_ID)).toBeUndefined();
    expect(findSiteLimit(CHAT_BUSINESS_HOURS_END_ID)).toBeUndefined();
  });
});

describe("the Pre-Chat Topics helper", () => {
  it("declares standard topics with icons and prefixes", () => {
    expect(TUTOR_CHAT_TOPICS.length).toBeGreaterThanOrEqual(5);
    expect(TUTOR_CHAT_TOPICS.some(t => t.id === "tuition_apply")).toBe(true);
    expect(TUTOR_CHAT_TOPICS.some(t => t.id === "payment_fee")).toBe(true);
  });

  it("extracts topic from message prefix or keywords", () => {
    expect(extractTopicFromMessage("[বিষয়: টিউশন আবেদন] মিরপুর ১০-এ জব আছে?")?.id).toBe("tuition_apply");
    expect(extractTopicFromMessage("পেমেন্ট ও ফি নিয়ে জানতে চাই")?.id).toBe("payment_fee");
    expect(extractTopicFromMessage("Hello Admin")?.id).toBeUndefined();
  });
});
