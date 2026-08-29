import { describe, expect, it } from "vitest";
import { getRequestSubmitState } from "./TutorRequest";

describe("TutorRequest submission view state", () => {
  it("disables submission and exposes the loading label while pending", () => {
    expect(getRequestSubmitState(true, false)).toEqual({
      view: "form",
      disabled: true,
      label: "Sending securely…",
    });
  });

  it("switches to the success view after persistence succeeds", () => {
    expect(getRequestSubmitState(false, true)).toEqual({
      view: "success",
      disabled: false,
      label: "Request submitted",
    });
  });
});
