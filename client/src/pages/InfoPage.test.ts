import { describe, expect, it } from "vitest";
import { getInfoPageAction } from "./InfoPage";

describe("public information page actions", () => {
  it("offers the Tutor path only where it is relevant and otherwise keeps the Guardian request path clear", () => {
    expect(getInfoPageAction("/tutors")).toMatchObject({ href: "/become-tutor", label: "Join as a tutor" });
    expect(getInfoPageAction("/contact")).toMatchObject({ href: "/request-tutor", label: "Request a tutor" });
    expect(getInfoPageAction("/blogs")).toMatchObject({ href: "/request-tutor", label: "Request a tutor" });

    // Each action also carries the slot its label is edited through.
    expect(getInfoPageAction("/tutors").slotId).toBe("info.action.joinTutor");
    expect(getInfoPageAction("/contact").slotId).toBe("info.action.requestTutor");
  });
});
