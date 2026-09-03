import { describe, expect, it } from "vitest";
import { JOB_ID_OFFSET, isJobIdNumber, jobIdForRequest, requestIdFromJobId } from "./job-id";

describe("job id", () => {
  it("starts at 6800 and counts on from there", () => {
    expect(jobIdForRequest(1)).toBe("6800");
    expect(jobIdForRequest(2)).toBe("6801");
    expect(jobIdForRequest(200)).toBe("6999");
  });

  it("reads a number back to its request", () => {
    for (const requestId of [1, 2, 57, 1234]) {
      expect(requestIdFromJobId(jobIdForRequest(requestId))).toBe(requestId);
    }
  });

  it("refuses anything that is not one of these numbers", () => {
    // The old format, a manual Admin id, and plain nonsense all fail the same way.
    for (const value of ["CT-JOB-000002", "CT-MAN-A1B2C3", "", "abc", "68 00", "-1"]) {
      expect(requestIdFromJobId(value), value).toBeNull();
      expect(isJobIdNumber(value), value).toBe(false);
    }
  });

  it("refuses a number below the offset, which belongs to no request", () => {
    expect(requestIdFromJobId(String(JOB_ID_OFFSET))).toBeNull();
    expect(requestIdFromJobId("1")).toBeNull();
  });

  it("will not make an id for something that is not a request", () => {
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      expect(() => jobIdForRequest(bad)).toThrow();
    }
  });

  it("gives the same id before and after publication, because it is derived", () => {
    // The whole reason it is not stored: there is no second place for it to
    // drift out of step with.
    const pending = jobIdForRequest(42);
    const published = jobIdForRequest(42);
    expect(published).toBe(pending);
  });
});
