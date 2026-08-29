import { describe, expect, it } from "vitest";
import { shouldShowHomeReturn } from "./HomeReturnLink";

describe("homepage return navigation", () => {
  it("is available from public, auth, and unmatched routes but not the homepage or protected dashboards", () => {
    expect(shouldShowHomeReturn("/join-tutor")).toBe(true);
    expect(shouldShowHomeReturn("/guardian/request-tutor")).toBe(true);
    expect(shouldShowHomeReturn("/guardian/dashboard/posted-jobs")).toBe(false);
    expect(shouldShowHomeReturn("/tutor/dashboard")).toBe(false);
    expect(shouldShowHomeReturn("/tutor/login")).toBe(true);
    expect(shouldShowHomeReturn("/unknown-route")).toBe(true);
    expect(shouldShowHomeReturn("/")).toBe(false);
  });
});
