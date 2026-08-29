import { describe, expect, it } from "vitest";
import { getInfoPageAction } from "./InfoPage";

describe("public information page actions", () => {
  it("offers the Tutor path only where it is relevant and otherwise keeps the Guardian request path clear", () => {
    expect(getInfoPageAction("/tutors")).toEqual({ href: "/become-tutor", label: "Join as a tutor" });
    expect(getInfoPageAction("/contact")).toEqual({ href: "/request-tutor", label: "Request a tutor" });
    expect(getInfoPageAction("/blogs")).toEqual({ href: "/request-tutor", label: "Request a tutor" });
  });
});
