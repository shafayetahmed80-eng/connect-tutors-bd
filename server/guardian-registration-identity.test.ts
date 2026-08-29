import { describe, expect, it } from "vitest";
import {
  getNextAvailableGuardianNumber,
  withGuardianNumberAllocationRetry,
} from "./db";

describe("Guardian numeric identity allocation", () => {
  it("starts at 777 and ignores historic opaque Guardian IDs", () => {
    expect(getNextAvailableGuardianNumber(["GDN-8F01AB2C", "GDN-A1B2C3D4"])).toBe(777);
  });

  it("skips occupied numeric IDs without changing existing values", () => {
    expect(getNextAvailableGuardianNumber(["777", "778", "GDN-8F01AB2C", "1503"])).toBe(779);
  });

  it("retries only a database-reported Guardian ID unique collision", async () => {
    let attempts = 0;
    const collision = Object.assign(
      new Error("Duplicate entry '777' for key 'guardian_profiles_guardian_id_unique'"),
      { code: "ER_DUP_ENTRY" },
    );

    await expect(withGuardianNumberAllocationRetry(async () => {
      attempts += 1;
      if (attempts === 1) throw collision;
      return 778;
    })).resolves.toBe(778);
    expect(attempts).toBe(2);
  });

  it("does not retry unrelated duplicate-key errors", async () => {
    let attempts = 0;
    const unrelated = Object.assign(
      new Error("Duplicate entry 'email@example.com' for key 'users_email_unique'"),
      { code: "ER_DUP_ENTRY" },
    );

    await expect(withGuardianNumberAllocationRetry(async () => {
      attempts += 1;
      throw unrelated;
    })).rejects.toBe(unrelated);
    expect(attempts).toBe(1);
  });
});
