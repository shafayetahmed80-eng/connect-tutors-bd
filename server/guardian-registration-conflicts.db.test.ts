import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { guardianPhoneIntakes, locations, users } from "../drizzle/schema";
import { getDb, registerGuardianFromIntake } from "./db";
import { GuardianRegistrationError } from "./guardian-registration.validation";

// Throwaway rows, removed again by id - never anything else.
const tag = randomBytes(3).toString("hex");
const cityId = `test-conflict-city-${tag}`;
const areaId = `test-conflict-area-${tag}`;
const madeUserIds: number[] = [];
const madeIntakePhones: string[] = [];

const randomPhone = (prefix: string) => `+880${prefix}${Math.floor(10000000 + Math.random() * 89999999)}`;

async function makeUser(key: string, role: "guardian" | "tutor", fields: { email?: string; loginPhone?: string }) {
  const database = (await getDb())!;
  const [insert] = await database.insert(users).values({ openId: `test:registration-conflict:${tag}:${key}`, name: `RC ${key}`, role, loginMethod: "password", ...fields });
  madeUserIds.push(Number(insert.insertId));
}

/** A number whose SMS code has been proved, ready for the account form to be sent. */
async function makeProvedIntake(key: string) {
  const database = (await getDb())!;
  const phone = randomPhone("19");
  const handoffTokenHash = `test-conflict-${tag}-${key}`;
  await database.insert(guardianPhoneIntakes).values({ phone, handoffTokenHash, handoffExpiresAt: new Date(Date.now() + 60 * 60 * 1000), phoneVerifiedAt: new Date() });
  madeIntakePhones.push(phone);
  return { phone, handoffTokenHash };
}

function registration(intake: { phone: string; handoffTokenHash: string }, email: string) {
  return { name: "Test Guardian", email, password: "GuardianPass1", gender: "female" as const, phone: intake.phone, cityLocationId: cityId, locationId: areaId, termsVersion: "test", handoffTokenHash: intake.handoffTokenHash };
}

async function reasonOf(attempt: Promise<unknown>) {
  try {
    await attempt;
  } catch (error) {
    return error instanceof GuardianRegistrationError ? error.reason : `other: ${String(error)}`;
  }
  return "accepted";
}

afterAll(async () => {
  const database = (await getDb())!;
  if (madeUserIds.length) await database.delete(users).where(inArray(users.id, madeUserIds));
  if (madeIntakePhones.length) await database.delete(guardianPhoneIntakes).where(inArray(guardianPhoneIntakes.phone, madeIntakePhones));
  await database.delete(locations).where(eq(locations.id, areaId));
  await database.delete(locations).where(eq(locations.id, cityId));
});

describe("why a Guardian registration is refused, against the real database", () => {
  it("names the email when a Guardian already has it", async () => {
    const database = (await getDb())!;
    await database.insert(locations).values({ id: cityId, label: "Test City", type: "city", country: "Bangladesh" });
    await database.insert(locations).values({ id: areaId, label: "Test Area", type: "area", country: "Bangladesh", parentId: cityId });
    const email = `taken-${tag}@example.test`;
    await makeUser("guardian-email", "guardian", { email });

    expect(await reasonOf(registerGuardianFromIntake(registration(await makeProvedIntake("a"), email)))).toBe("email-taken");
  });

  it("says a different kind of account holds the email when a Tutor has it", async () => {
    const email = `tutor-${tag}@example.test`;
    await makeUser("tutor-email", "tutor", { email });

    expect(await reasonOf(registerGuardianFromIntake(registration(await makeProvedIntake("b"), email)))).toBe("email-other-role");
  });

  it("names the number when a Guardian already has it and the email is free", async () => {
    const intake = await makeProvedIntake("c");
    await makeUser("guardian-phone", "guardian", { loginPhone: intake.phone });

    expect(await reasonOf(registerGuardianFromIntake(registration(intake, `free-${tag}@example.test`)))).toBe("phone-taken");
  });
});
