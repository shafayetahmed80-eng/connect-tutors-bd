import { describe, expect, it } from "vitest";
import {
  canRequestTuitionChange,
  guardianTuitionRequestApplies,
  guardianTuitionRequestDeclinedNotice,
  guardianTuitionRequestTypesAnsweredBy,
  settleGuardianTuitionRequest,
} from "./guardian-tuition-requests";

const HOLDER = "tutor-175";
const base = { holderTutorId: HOLDER, tutorId: HOLDER, reason: null as string | null, requestWaiting: false };

describe("asking to confirm the appointed Tutor", () => {
  it("is allowed on an Appointed tuition, for its own Tutor, with no reason", () => {
    expect(canRequestTuitionChange({ ...base, type: "confirm", lifecycle: "appointed" })).toEqual({ allowed: true });
  });

  it("is only for an Appointed tuition", () => {
    for (const lifecycle of ["pending", "live", "confirmed", "cancelled"] as const) {
      expect(canRequestTuitionChange({ ...base, type: "confirm", lifecycle }), lifecycle).toEqual({ allowed: false, reason: "wrong_stage" });
    }
  });

  it("is only for the Tutor who holds the tuition", () => {
    expect(canRequestTuitionChange({ ...base, type: "confirm", lifecycle: "appointed", tutorId: "tutor-404" }))
      .toEqual({ allowed: false, reason: "not_holder" });
    expect(canRequestTuitionChange({ ...base, type: "confirm", lifecycle: "appointed", tutorId: null }))
      .toEqual({ allowed: false, reason: "not_holder" });
  });
});

describe("asking to remove the Tutor", () => {
  it("is allowed on an Appointed or a Confirmed tuition, with a reason", () => {
    for (const lifecycle of ["appointed", "confirmed"] as const) {
      expect(canRequestTuitionChange({ ...base, type: "remove_tutor", lifecycle, reason: "The demo class did not suit us" }), lifecycle)
        .toEqual({ allowed: true });
    }
  });

  it("needs a reason of at least three characters", () => {
    for (const reason of [null, "", "  ", "ok"]) {
      expect(canRequestTuitionChange({ ...base, type: "remove_tutor", lifecycle: "appointed", reason }), String(reason))
        .toEqual({ allowed: false, reason: "reason_required" });
    }
  });

  it("is not offered before a Tutor is on the tuition, or once it is cancelled", () => {
    for (const lifecycle of ["pending", "live", "cancelled"] as const) {
      expect(canRequestTuitionChange({ ...base, type: "remove_tutor", lifecycle, reason: "No longer needed" }), lifecycle)
        .toEqual({ allowed: false, reason: "wrong_stage" });
    }
  });
});

describe("asking to cancel the tuition", () => {
  it("is allowed at every stage but Cancelled, with a reason, and needs no Tutor", () => {
    for (const lifecycle of ["pending", "live", "appointed", "confirmed"] as const) {
      expect(canRequestTuitionChange({ ...base, type: "cancel_tuition", lifecycle, holderTutorId: null, tutorId: null, reason: "Found a tutor elsewhere" }), lifecycle)
        .toEqual({ allowed: true });
    }
    expect(canRequestTuitionChange({ ...base, type: "cancel_tuition", lifecycle: "cancelled", tutorId: null, reason: "Found a tutor elsewhere" }))
      .toEqual({ allowed: false, reason: "wrong_stage" });
  });

  it("needs a reason", () => {
    expect(canRequestTuitionChange({ ...base, type: "cancel_tuition", lifecycle: "live", tutorId: null, reason: "" }))
      .toEqual({ allowed: false, reason: "reason_required" });
  });
});

describe("one request at a time", () => {
  it("refuses any request while another is waiting on the tuition", () => {
    expect(canRequestTuitionChange({ ...base, type: "cancel_tuition", lifecycle: "appointed", tutorId: null, reason: "Moving city", requestWaiting: true }))
      .toEqual({ allowed: false, reason: "request_waiting" });
  });
});

describe("a waiting request against a tuition that has moved on", () => {
  it("still applies while the tuition is where the request found it", () => {
    expect(guardianTuitionRequestApplies({ type: "confirm", lifecycle: "appointed", holderTutorId: HOLDER, tutorId: HOLDER })).toBe(true);
    expect(guardianTuitionRequestApplies({ type: "remove_tutor", lifecycle: "confirmed", holderTutorId: HOLDER, tutorId: HOLDER })).toBe(true);
    expect(guardianTuitionRequestApplies({ type: "cancel_tuition", lifecycle: "live", holderTutorId: null, tutorId: null })).toBe(true);
  });

  it("no longer applies once an Admin confirmed, removed or cancelled directly", () => {
    expect(guardianTuitionRequestApplies({ type: "confirm", lifecycle: "confirmed", holderTutorId: HOLDER, tutorId: HOLDER })).toBe(false);
    expect(guardianTuitionRequestApplies({ type: "remove_tutor", lifecycle: "live", holderTutorId: null, tutorId: HOLDER })).toBe(false);
    expect(guardianTuitionRequestApplies({ type: "confirm", lifecycle: "appointed", holderTutorId: "tutor-404", tutorId: HOLDER })).toBe(false);
    expect(guardianTuitionRequestApplies({ type: "cancel_tuition", lifecycle: "cancelled", holderTutorId: null, tutorId: null })).toBe(false);
  });
});

describe("settling a waiting request when an Admin moves the tuition on", () => {
  it("counts the move that was asked for as approving it, however it was made", () => {
    expect(settleGuardianTuitionRequest("confirm", "confirmed")).toBe("approved");
    expect(settleGuardianTuitionRequest("remove_tutor", "reopened")).toBe("approved");
    expect(settleGuardianTuitionRequest("cancel_tuition", "cancelled")).toBe("approved");
  });

  it("closes a request some other move left with nothing to apply to", () => {
    expect(settleGuardianTuitionRequest("confirm", "cancelled")).toBe("closed");
    expect(settleGuardianTuitionRequest("remove_tutor", "confirmed")).toBe("closed");
    expect(settleGuardianTuitionRequest("cancel_tuition", "reopened")).toBe("closed");
  });

  it("names exactly one request type per move", () => {
    expect(guardianTuitionRequestTypesAnsweredBy("confirmed")).toEqual(["confirm"]);
    expect(guardianTuitionRequestTypesAnsweredBy("reopened")).toEqual(["remove_tutor"]);
    expect(guardianTuitionRequestTypesAnsweredBy("cancelled")).toEqual(["cancel_tuition"]);
  });
});

describe("the Guardian's notice when an Admin declines", () => {
  it("says what was declined and on which tuition, without a reason", () => {
    expect(guardianTuitionRequestDeclinedNotice("cancel_tuition", "6812")).toEqual({
      title: "Your request was not approved",
      message: "The request to cancel the tuition on Job ID 6812 was declined.",
    });
    expect(guardianTuitionRequestDeclinedNotice("confirm", "6812").message).toContain("confirm the Tutor");
    expect(guardianTuitionRequestDeclinedNotice("remove_tutor", "6812").message).toContain("remove the Tutor");
  });
});
