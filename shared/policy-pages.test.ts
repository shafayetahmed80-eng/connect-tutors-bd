import { describe, expect, it } from "vitest";
import { findPolicyPage, findPolicyPageByPath, policyPages } from "./policy-pages";
import { parsePolicyMarkdown } from "./policy-markdown";

describe("policy-pages", () => {
  it("defines standard legal policy pages for terms and privacy", () => {
    expect(policyPages.map(p => p.key)).toEqual(["terms-conditions", "privacy-policy"]);
    expect(policyPages.map(p => p.path)).toEqual(["/terms-conditions", "/privacy-policy"]);
  });

  it("finds a policy page by key or by route path", () => {
    const termsByKey = findPolicyPage("terms-conditions");
    const termsByPath = findPolicyPageByPath("/terms-conditions");
    expect(termsByKey).toBeDefined();
    expect(termsByKey?.path).toBe("/terms-conditions");
    expect(termsByPath).toBe(termsByKey);

    const privacyByKey = findPolicyPage("privacy-policy");
    const privacyByPath = findPolicyPageByPath("/privacy-policy");
    expect(privacyByKey).toBeDefined();
    expect(privacyByKey?.path).toBe("/privacy-policy");
    expect(privacyByPath).toBe(privacyByKey);

    expect(findPolicyPage("unknown-key")).toBeUndefined();
    expect(findPolicyPageByPath("/unknown-path")).toBeUndefined();
  });

  it("includes detailed platform charge rules and schedules in terms of use", () => {
    const terms = findPolicyPage("terms-conditions");
    expect(terms).toBeDefined();
    const body = terms!.defaultBody;

    // Free for guardians, paid only on confirmation by tutors
    expect(body).toContain("Guardians do not pay Connect Tutors any platform charge");
    expect(body).toContain("Once a tuition is **confirmed**");

    // Two instalments and early payment discount
    expect(body).toContain("Due within **7 days** of confirmation");
    expect(body).toContain("on or before **30 days** from confirmation");
    expect(body).toContain("Early payment discount");

    // All tuition types with accurate rates
    expect(body).toContain("Home Tutoring");
    expect(body).toContain("60% total");
    expect(body).toContain("50% total");

    expect(body).toContain("Online Tutoring");
    expect(body).toContain("50% total");
    expect(body).toContain("45% total");

    expect(body).toContain("Package Tutoring");
    expect(body).toContain("35% total");
    expect(body).toContain("30% total");

    expect(body).toContain("Group Tutoring");
    expect(body).toContain("40% total");
    expect(body).toContain("35% total");

    // Payment methods
    expect(body).toContain("bKash");
    expect(body).toContain("Nagad");
    expect(body).toContain("Rocket");
    expect(body).toContain("Bank transfer");
  });

  it("includes cancellation rules and refund rates in terms of use", () => {
    const terms = findPolicyPage("terms-conditions");
    expect(terms).toBeDefined();
    const body = terms!.defaultBody;

    // Notice period and eligibility
    expect(body).toContain("24-hour notice");
    expect(body).toContain("valid Guardian reason");

    // Refund rates
    expect(body).toContain("30%");
    expect(body).toContain("15%");
    expect(body).toContain("25%");
    expect(body).toContain("20%");

    // Unpaid first month & partial teaching
    expect(body).toContain("fully waived");
    expect(body).toContain("actual salary received");

    // Settlement options
    expect(body).toContain("Direct refund");
    expect(body).toContain("Account credit");

    // Non-refundable conditions
    expect(body).toContain("Tutor's own fault");
    expect(body).toContain("later than 24 hours");
  });

  it("parses the complete terms markdown without errors using the policy parser", () => {
    const terms = findPolicyPage("terms-conditions");
    expect(terms).toBeDefined();

    const blocks = parsePolicyMarkdown(terms!.defaultBody);
    expect(blocks.length).toBeGreaterThan(10);

    // Verify presence of headings and lists
    const headings = blocks.filter(b => b.kind === "heading");
    const lists = blocks.filter(b => b.kind === "list");
    expect(headings.length).toBeGreaterThan(5);
    expect(lists.length).toBeGreaterThan(3);
  });
});
