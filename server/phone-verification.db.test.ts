import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { phoneVerificationCodes } from "../drizzle/schema";
import { checkPhoneVerificationCode, consumePhoneVerificationCode, createPhoneVerificationCode, getDb, getPhoneCodeSendState } from "./db";
import { generatePhoneCode, hashPhoneCode, PHONE_CODE_MAX_ATTEMPTS } from "./phone-verification";

// A number reserved for these tests; every row on it is removed afterwards and nothing else is touched.
const phone = "+8801999999901";
const secret = "test-secret";
const purpose = "tutor_registration" as const;
const hash = (code: string) => hashPhoneCode(code, phone, purpose, secret);
const check = (code: string, consume = true) => checkPhoneVerificationCode({ phone, purpose, codeHash: hash(code), consume, maxAttempts: PHONE_CODE_MAX_ATTEMPTS });

afterEach(async () => {
  const database = await getDb();
  if (database) await database.delete(phoneVerificationCodes).where(eq(phoneVerificationCodes.phone, phone));
});

async function issue(code: string, expiresInMs = 5 * 60_000) {
  return createPhoneVerificationCode({ phone, purpose, codeHash: hash(code), expiresAt: new Date(Date.now() + expiresInMs), ip: "203.0.113.30" });
}

describe("phone verification codes, against the real database", () => {
  it("accepts the right code once", async () => {
    await issue("4821");
    await expect(check("4821")).resolves.toMatchObject({ status: "ok" });
    await expect(check("4821")).resolves.toEqual({ status: "missing" });
  });

  it("counts wrong tries and spends the code on the fifth", async () => {
    await issue("4821");
    for (let left = 4; left >= 1; left -= 1) await expect(check("0000")).resolves.toEqual({ status: "wrong", attemptsLeft: left });
    await expect(check("0000")).resolves.toEqual({ status: "locked" });
    await expect(check("4821")).resolves.toEqual({ status: "locked" });
  });

  it("only honours the newest code", async () => {
    await issue("1111");
    await new Promise(resolve => setTimeout(resolve, 1100)); // createdAt has one-second precision
    await issue("2222");
    await expect(check("1111", false)).resolves.toMatchObject({ status: "wrong" });
    await expect(check("2222", false)).resolves.toMatchObject({ status: "ok" });
  });

  it("refuses an expired code", async () => {
    await issue("4821", -1000);
    await expect(check("4821")).resolves.toEqual({ status: "expired" });
  });

  it("leaves a checked code open until it is consumed", async () => {
    await issue("4821");
    const first = await check("4821", false);
    expect(first.status).toBe("ok");
    await consumePhoneVerificationCode((first as { id: number }).id);
    await expect(check("4821")).resolves.toEqual({ status: "missing" });
  });

  it("reports when the last code went out and how many this hour", async () => {
    await issue("1111");
    await issue("2222");
    const state = await getPhoneCodeSendState(phone, purpose);
    expect(state.sentLastHour).toBe(2);
    expect(state.lastSentAt).toBeInstanceOf(Date);
  });

  it("makes 4-digit codes", () => {
    for (let i = 0; i < 50; i += 1) expect(generatePhoneCode()).toMatch(/^\d{4}$/);
  });
});
