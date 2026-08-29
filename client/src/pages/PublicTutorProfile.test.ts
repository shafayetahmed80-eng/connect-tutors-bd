import { describe, expect, it } from "vitest";
import { publicProfileTrustContent, requestThisTutorAction } from "./TutorProfile";

describe("public Tutor Profile trust content", () => {
  it("routes guardians through the existing request flow and states the public-contact boundary", () => {
    expect(requestThisTutorAction).toEqual({ href: "/request-tutor", label: "Request this tutor" });
    expect(publicProfileTrustContent).toContain("contact details private");
    expect(publicProfileTrustContent).toContain("not displayed");
  });
});
