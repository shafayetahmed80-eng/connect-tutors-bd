import { describe, expect, it } from "vitest";
import {
  buildTutorApplyJobBoardPath,
  buildTutorApplySignInPath,
  buildTutorApplyProfilePath,
  getTutorApplyReturnFromLocation,
  buildTutorApplyReturnPath,
  getTutorApplyPostLoginPath,
  getSafeTutorApplyReturnPath,
  readStoredTutorApplyReturnPath,
  storeTutorApplyReturnPath,
} from "./tutorApplyReturn";

describe("Tutor Apply Now return routing", () => {
  it("keeps an allowlisted Job Board detail as a Tutor sign-in return destination", () => {
    const returnPath = buildTutorApplyReturnPath("6945");

    expect(returnPath).toBe("/job-board?job=6945");
    expect(buildTutorApplySignInPath("6945")).toBe(
      "/auth?role=tutor&returnTo=%2Fjob-board%3Fjob%3D6945",
    );
    expect(getSafeTutorApplyReturnPath(returnPath)).toBe(returnPath);
  });

  it("rejects external, privileged, malformed, and multi-parameter return destinations", () => {
    expect(getSafeTutorApplyReturnPath("https://example.com/job-board?job=6945")).toBeNull();
    expect(getSafeTutorApplyReturnPath("/admin/matching?job=6945")).toBeNull();
    expect(getSafeTutorApplyReturnPath("/job-board?job=6945&role=tutor")).toBeNull();
    expect(getSafeTutorApplyReturnPath("/job-board?job=<script>")).toBeNull();
  });

  it("retains only an allowlisted selected job inside the Tutor panel while the profile is reviewed, without auto-applying", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    } as Storage;
    const returnPath = "/job-board?job=6945";

    expect(storeTutorApplyReturnPath(storage, returnPath)).toBe(returnPath);
    expect(readStoredTutorApplyReturnPath(storage)).toBe(returnPath);
    expect(buildTutorApplyProfilePath(returnPath)).toBe(
      "/tutor/dashboard/profile?returnTo=%2Fjob-board%3Fjob%3D6945",
    );
    expect(buildTutorApplyJobBoardPath(returnPath)).toBe(
      "/tutor/dashboard/jobs?returnTo=%2Fjob-board%3Fjob%3D6945",
    );
    expect(getTutorApplyPostLoginPath("pending", returnPath)).toBe(
      "/tutor/dashboard/profile?returnTo=%2Fjob-board%3Fjob%3D6945",
    );
    expect(getTutorApplyPostLoginPath("approved", returnPath)).toBe(
      "/tutor/dashboard/jobs?returnTo=%2Fjob-board%3Fjob%3D6945",
    );
    expect(getTutorApplyPostLoginPath("approved", "/admin/matching")).toBe("/tutor/dashboard");
  });

  it("restores the selected job only from the public board or allowlisted Tutor panel locations", () => {
    const returnPath = "/job-board?job=6945";

    expect(getTutorApplyReturnFromLocation(returnPath)).toBe(returnPath);
    expect(getTutorApplyReturnFromLocation(buildTutorApplyProfilePath(returnPath))).toBe(returnPath);
    expect(getTutorApplyReturnFromLocation(buildTutorApplyJobBoardPath(returnPath))).toBe(returnPath);
    expect(getTutorApplyReturnFromLocation("/tutor/dashboard/jobs?returnTo=%2Fadmin%2Fmatching")).toBeNull();
    expect(getTutorApplyReturnFromLocation("/tutor/dashboard/jobs?returnTo=%2Fjob-board%3Fjob%3D6945&role=tutor")).toBeNull();
  });
});
