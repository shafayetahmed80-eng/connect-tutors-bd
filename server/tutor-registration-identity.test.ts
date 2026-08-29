import { describe, expect, it } from "vitest";
import {
  getNextAvailableTutorNumber,
  getNextTutorNumber,
  withTutorNumberAllocationLock,
  withTutorNumberAllocationRetry,
} from "./db";

describe("Tutor registration identity", () => {
  it("starts public Tutor IDs at 777", () => {
    expect(getNextTutorNumber(null)).toBe(777);
  });

  it("keeps later Tutor IDs sequential", () => {
    expect(getNextTutorNumber(777)).toBe(778);
    expect(getNextTutorNumber(778)).toBe(779);
    expect(getNextTutorNumber(1599)).toBe(1600);
  });

  it("allocates public Tutor IDs from the last public number, not the internal row ID", () => {
    expect(getNextTutorNumber(61503)).toBe(61504);
  });

  it("starts at 777 even when legacy Tutor IDs are much higher", () => {
    expect(getNextAvailableTutorNumber([1503, 1600])).toBe(777);
  });

  it("skips already allocated public Tutor IDs without changing any historic ID", () => {
    expect(getNextAvailableTutorNumber([777, 778, 1503])).toBe(779);
  });

  it("retries a database-reported Tutor ID collision and returns the recalculated allocation", async () => {
    let attempts = 0;
    const duplicateTutorNumberError = Object.assign(
      new Error("Duplicate entry '777' for key 'tutor_registrations_tutorNumber_unique'"),
      { code: "ER_DUP_ENTRY" }
    );

    await expect(withTutorNumberAllocationRetry(async () => {
      attempts += 1;
      if (attempts === 1) throw duplicateTutorNumberError;
      return 778;
    })).resolves.toBe(778);
    expect(attempts).toBe(2);
  });

  it("does not retry an unrelated duplicate-key error", async () => {
    let attempts = 0;
    const unrelatedDuplicateError = Object.assign(new Error("Duplicate entry for key 'users_email_unique'"), { code: "ER_DUP_ENTRY" });

    await expect(withTutorNumberAllocationRetry(async () => {
      attempts += 1;
      throw unrelatedDuplicateError;
    })).rejects.toBe(unrelatedDuplicateError);
    expect(attempts).toBe(1);
  });

  it("serializes simultaneous allocations into distinct sequential public Tutor IDs", async () => {
    const allocatedTutorNumbers = [1503];
    const allocate = () =>
      withTutorNumberAllocationLock(async () => {
        const allocated = getNextAvailableTutorNumber(allocatedTutorNumbers);
        await Promise.resolve();
        allocatedTutorNumbers.push(allocated);
        return allocated;
      });

    await expect(Promise.all([allocate(), allocate(), allocate()])).resolves.toEqual([777, 778, 779]);
  });
});
