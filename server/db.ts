import { and, asc, count, desc, eq, getTableName, gte, inArray, isNotNull, isNull, like, lte, or, sql, type SQL } from "drizzle-orm";
import type { MySqlTable } from "drizzle-orm/mysql-core";
import {
  MAX_LOCATION_ID_LENGTH,
  isValidChildType,
  locationSlug,
  type LocationType,
} from "@shared/location-catalog";
import { defaultSiteLimits, resolveSiteLimits, type SiteLimitValues } from "@shared/site-limits";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { addDays } from "date-fns";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  adminCredentials,
  adminInvitations,
  adminLoginAuditLogs,
  adminMatchingDefaultSavedViews,
  adminMatchingSavedViews,
  adminTwoFactorRecoveryCodes,
  adminTwoFactorSettings,
  authEvents,
  classLevels,
  confirmationLetters,
  curricula,
  degreeMajors,
  facultyDepartments,
  guardianContactAccessEvents,
  guardianRequestNotifications,
  guardianPhoneIntakes,
  guardianProfilePhotoEvents,
  guardianProfilePhotos,
  guardianProfiles,
  guardianProfileUpdateEvents,
  languagesCatalog,
  locations,
  studentTypes,
  subjectsCatalog,
  tutorAcademicProfiles,
  tutorCommunicationPreferences,
  tutorCurricula,
  tutorClassLevels,
  tutorEducationRecords,
  tutorPrivateProfiles,
  tutorUniversityIdDocuments,
  tutorSupportingDocuments,
  siteContentOverrides,
  siteContentBlocks,
  siteLimits as siteLimitsTable,
  sitePolicyDocuments,
  tutorPreferredClassSizes,
  tutorPreferredTeachingDays,
  tutorPreferredTimeSlots,
  tutorProfileModerationEvents,
  tutorPortalSessions,
  tutorRegistrations,
  tutorJobInterests,
  tutorJobs,
  tutorStudentTypes,
  tutorSubjects,
  tutorTeachingAreas,
  tutorTeachingLanguages,
  tutorRequestPublicationEvents,
  tutorRequestOperationEvents,
  tutorRequestAssignmentNotes,
  tutorConfirmationLetterNotifications,
  tutors,
  tutorRequests,
  universities,
  users,
  type InsertTutorRequest,
  type AdminAuditEvent,
  type AuthEventType,
  type GuardianProfilePhotoRejectionReason,
  type GuardianProfilePhotoStatus,
  type TutorRequestPublicationAction,
  type GuardianRequestFollowUpKind,
  type TutorRequestAssignmentNoteCategory,
  type TutorProfileStatus,
  type User,
  type UserRole,
} from "../drizzle/schema";
import { normalizeCatalogName } from "./tutor-profile-catalog.seed";
import { getGuardianRequestLifecycle } from "./tutor-request-lifecycle";
import { ENV } from "./_core/env";
import { GuardianRegistrationError } from "./guardian-registration.validation";
import { normalizeBangladeshMobile } from "./guardian-intake.validation";
import { renderConfirmationLetterPdf, type ConfirmationLetterDocument } from "./confirmation-letter-pdf";
import { storageGetSignedUrl, storagePut } from "./storage";
import { getTutorListingPage, type TutorListingFilters } from "@shared/tutor-listing";
import {
  buildCombinedCityLocationOptions,
  type RegistrationLocationRow,
} from "@shared/registration-location-selector";
import {
  calculateTutorProfileCompletion,
  tutorProfileDraftSchema,
  tutorProfileSubmissionSchema,
  validateTutorProfileCatalogReferences,
  type TutorProfileCatalogReferenceIssue,
  type TutorProfileCatalogReferences,
  type TutorProfileDraftInput,
  type TutorProfileEditableDraftInput,
} from "./tutor-profile.validation";
import { validateTutorModerationAction } from "./admin-monitoring";
import {
  buildSafeTutorRequestPublicationSnapshot,
  validateAdminRequestPublicationAction,
} from "./admin-request-publication";
import {
  buildPublishedTutorJobProjection,
  getPublishedTutorJobRefresh,
  toPublicTutorJob,
  type PublishedTutorJobProjection,
} from "./job-board-projection";
import {
  canSubmitTutorInterest,
  transitionTutorInterest,
  type TutorJobInterestStatus,
} from "./tutor-job-interest";
import {
  parseAdminMatchingSavedViewFilters,
  sanitizeAdminMatchingSavedViewFilters,
  type AdminMatchingSavedViewFilters,
} from "@shared/admin-matching-saved-views";

let _db: ReturnType<typeof drizzle> | null = null;
let tutorNumberAllocationTail: Promise<void> = Promise.resolve();

/**
 * Serializes public Tutor-number allocation within this server process. The
 * database transaction still protects durable writes; this queue removes the
 * local race before the locked database read selects the latest public number.
 */
export async function withTutorNumberAllocationLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = tutorNumberAllocationTail;
  let release!: () => void;
  tutorNumberAllocationTail = new Promise<void>(resolve => {
    release = resolve;
  });

  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

const TUTOR_NUMBER_ALLOCATION_MAX_ATTEMPTS = 3;

function isUniqueConstraintError(error: unknown, constraintFragments: readonly string[]) {
  if (!(error instanceof Error)) return false;
  const databaseError = error as Error & { code?: unknown };
  return databaseError.code === "ER_DUP_ENTRY"
    && constraintFragments.some(fragment => error.message.includes(fragment));
}

async function withIdentityAllocationRetry<T>(operation: () => Promise<T>, constraintFragments: readonly string[], label: string) {
  for (let attempt = 1; attempt <= TUTOR_NUMBER_ALLOCATION_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isUniqueConstraintError(error, constraintFragments) || attempt === TUTOR_NUMBER_ALLOCATION_MAX_ATTEMPTS) throw error;
    }
  }

  throw new Error(`${label} allocation retry limit reached`);
}

/** Retries only a transient, database-reported collision on the unique public Tutor ID. */
export function withTutorNumberAllocationRetry<T>(operation: () => Promise<T>) {
  return withIdentityAllocationRetry(operation, ["tutor_registrations_tutorNumber_unique", "tutorNumber"], "Tutor number");
}

/** Retries only a transient collision on the unique numeric Guardian ID. */
export function withGuardianNumberAllocationRetry<T>(operation: () => Promise<T>) {
  return withIdentityAllocationRetry(operation, ["guardian_profiles_guardian_id_unique", "guardianId"], "Guardian number");
}

function deriveKey(password: string, salt: string, keyLength: number, options: { N: number; r: number; p: number; maxmem: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey as Buffer);
    });
  });
}
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_SALT_LENGTH = 16;
const PASSWORD_COST = 16384;
const PASSWORD_BLOCK_SIZE = 8;
const PASSWORD_PARALLELIZATION = 1;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export type PasswordAccountRole = "guardian" | "tutor";

/**
 * Produces the only two credential lookup values accepted by password sign-in.
 * Invalid values resolve to undefined so callers can preserve a single
 * non-enumerating credentials error.
 */
export function normalizePasswordAccountIdentifier(identifier: string) {
  const value = identifier.trim();
  if (!value) return undefined;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { kind: "email" as const, value: normalizeEmail(value) };
  }
  try {
    return { kind: "phone" as const, value: normalizeBangladeshMobile(value) };
  } catch {
    return undefined;
  }
}

/**
 * Normalizes an assigned Admin sign-in ID without accepting email addresses,
 * database IDs, or OAuth subject identifiers as login credentials.
 */
export function normalizeAdminLoginId(userId: string) {
  const value = userId.trim().toLowerCase();
  return /^[a-z][a-z0-9_-]{2,63}$/.test(value) ? value : undefined;
}

/** Stores parameters with the hash so future cost upgrades remain possible. */
export async function hashPassword(password: string) {
  const salt = randomBytes(PASSWORD_SALT_LENGTH).toString("hex");
  const derivedKey = await deriveKey(password, salt, PASSWORD_KEY_LENGTH, {
    N: PASSWORD_COST,
    r: PASSWORD_BLOCK_SIZE,
    p: PASSWORD_PARALLELIZATION,
    maxmem: 32 * 1024 * 1024,
  });
  return `scrypt$${PASSWORD_COST}$${PASSWORD_BLOCK_SIZE}$${PASSWORD_PARALLELIZATION}$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, encodedHash: string) {
  const [algorithm, costText, blockText, parallelText, salt, keyHex] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !costText || !blockText || !parallelText || !salt || !keyHex) return false;
  const cost = Number(costText);
  const blockSize = Number(blockText);
  const parallelization = Number(parallelText);
  if (!Number.isSafeInteger(cost) || !Number.isSafeInteger(blockSize) || !Number.isSafeInteger(parallelization)) return false;
  if (cost < 1024 || cost > 1_048_576 || blockSize < 1 || blockSize > 64 || parallelization < 1 || parallelization > 16) return false;
  if (!/^[0-9a-f]+$/i.test(keyHex) || keyHex.length % 2 !== 0) return false;
  try {
    const expected = Buffer.from(keyHex, "hex");
    const actual = await deriveKey(password, salt, expected.length, {
      N: cost,
      r: blockSize,
      p: parallelization,
      maxmem: 32 * 1024 * 1024,
    });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function passwordOpenId(email: string) {
  return `password:tutor:${normalizeEmail(email)}`;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function createTutorPortalSession(input: {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
}) {
  const database = await getDb();
  if (!database) throw new Error("TUTOR_PORTAL_SESSION_STORAGE_UNAVAILABLE");
  await database.insert(tutorPortalSessions).values({
    userId: input.userId,
    tokenHash: input.tokenHash,
    expiresAt: input.expiresAt,
    lastSeenAt: new Date(),
  });
}

/**
 * Validates and renews only the active tab's short-lived Tutor portal proof.
 * Browser cookies authenticate the account; this record authorizes the portal tab.
 */
export async function renewTutorPortalSession(input: {
  userId: number;
  tokenHash: string;
  now: Date;
  nextExpiry: Date;
}) {
  const database = await getDb();
  if (!database) return false;
  const active = await database
    .select({ id: tutorPortalSessions.id })
    .from(tutorPortalSessions)
    .where(and(
      eq(tutorPortalSessions.userId, input.userId),
      eq(tutorPortalSessions.tokenHash, input.tokenHash),
      isNull(tutorPortalSessions.revokedAt),
      gte(tutorPortalSessions.expiresAt, input.now),
    ))
    .limit(1);
  const session = active[0];
  if (!session) return false;
  await database
    .update(tutorPortalSessions)
    .set({ expiresAt: input.nextExpiry, lastSeenAt: input.now })
    .where(eq(tutorPortalSessions.id, session.id));
  return true;
}

/** Ends one tab's portal proof without disturbing other active Tutor tabs. */
export async function revokeTutorPortalSession(input: { userId: number; tokenHash: string; now: Date }) {
  const database = await getDb();
  if (!database) return false;
  const result = await database
    .update(tutorPortalSessions)
    .set({ revokedAt: input.now })
    .where(and(
      eq(tutorPortalSessions.userId, input.userId),
      eq(tutorPortalSessions.tokenHash, input.tokenHash),
      isNull(tutorPortalSessions.revokedAt),
    ));
  return result[0].affectedRows > 0;
}

/** Explicit Tutor sign-out invalidates every open Tutor portal tab for that account. */
export async function revokeAllTutorPortalSessions(input: { userId: number; now: Date }) {
  const database = await getDb();
  if (!database) return;
  await database
    .update(tutorPortalSessions)
    .set({ revokedAt: input.now })
    .where(and(eq(tutorPortalSessions.userId, input.userId), isNull(tutorPortalSessions.revokedAt)));
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: user.lastSignedIn ?? new Date() };
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1);
  return result[0];
}

export type TutorRegistrationInput = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  gender: "male" | "female";
  cityId: string;
  locationId: string;
};

export type TutorProfileDefaults = {
  name: string;
  phone: string;
  contactEmail: string;
  gender: "male" | "female";
  locationId: string;
  profileStatus: "draft";
};

/** Derives private Profile defaults from registration data without retaining credentials. */
export function createTutorProfileDefaults(input: TutorRegistrationInput): TutorProfileDefaults {
  return {
    name: input.name.trim(),
    phone: normalizeBangladeshMobile(input.phone),
    contactEmail: normalizeEmail(input.email),
    gender: input.gender,
    locationId: input.locationId.trim(),
    profileStatus: "draft",
  };
}

/**
 * Legacy Tutor accounts may predate the private draft Profile transaction. A
 * draft is created only after the Tutor supplies the required identity and
 * location values; no gender, location, or contact value is inferred.
 */
export function createLegacyTutorProfileSeed(
  userId: number,
  input: Pick<TutorProfileEditableDraftInput, "name" | "gender" | "currentLocationId" | "phone" | "contactEmail">,
) {
  const name = input.name?.trim();
  const locationId = input.currentLocationId?.trim();
  if (!name || name.length < 2) throw new Error("A full name is required to create your Tutor Profile.");
  if (!input.gender) throw new Error("Select your gender before saving your Tutor Profile.");
  if (!locationId) throw new Error("Select your current location before saving your Tutor Profile.");

  return {
    id: `tutor-${userId}`,
    userId,
    name,
    gender: input.gender,
    locationId,
    phone: input.phone?.trim() || undefined,
    contactEmail: input.contactEmail?.trim() || undefined,
    profileStatus: "draft" as const,
    initials: getInitials(name),
  };
}

/**
 * Creates a password Tutor account, Tutor identity, and private draft
 * Profile in one database transaction. A failed step rolls back every row.
 */
export async function registerPasswordTutor(input: TutorRegistrationInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const email = normalizeEmail(input.email);
  const loginPhone = normalizeBangladeshMobile(input.phone);
  const passwordHash = await hashPassword(input.password);

  return withTutorNumberAllocationRetry(() => withTutorNumberAllocationLock(async () => {
    try {
      return await db.transaction(async tx => {
        const city = (await tx.select().from(locations).where(eq(locations.id, input.cityId)).limit(1))[0];
        const selectedLocation = (await tx.select().from(locations).where(eq(locations.id, input.locationId)).limit(1))[0];
        if (!city || !selectedLocation || city.type !== "city" || city.country !== "Bangladesh" || city.enabled !== 1 || selectedLocation.country !== "Bangladesh" || selectedLocation.enabled !== 1) {
          return { created: false as const, reason: "invalid-location" as const };
        }
        let cursor = selectedLocation;
        const visited = new Set<string>();
        let belongsToSelectedCity = false;
        while (cursor.parentId) {
          if (visited.has(cursor.id)) break;
          visited.add(cursor.id);
          if (cursor.parentId === city.id) {
            belongsToSelectedCity = true;
            break;
          }
          const parent = (await tx.select().from(locations).where(eq(locations.id, cursor.parentId)).limit(1))[0];
          if (!parent) break;
          cursor = parent;
        }
        if (!belongsToSelectedCity) return { created: false as const, reason: "invalid-location" as const };

        const existing = await tx.select().from(users).where(eq(users.email, email)).limit(1);
        if (existing[0]) {
          // A Tutor account with this email → "sign in instead" is correct. Any
          // other role (Guardian/Admin) → signing in as a Tutor would fail, so
          // tell them to use a different email rather than a dead-end hint.
          return existing[0].role === "tutor"
            ? { created: false as const, reason: "email" as const }
            : { created: false as const, reason: "email-other-role" as const };
        }
        const existingPhone = await tx
          .select()
          .from(users)
          .where(and(eq(users.role, "tutor"), eq(users.loginPhone, loginPhone)))
          .limit(1);
        if (existingPhone[0]) return { created: false as const, reason: "phone" as const };

        const createdUser = await tx.insert(users).values({
          openId: passwordOpenId(email),
          name: input.name.trim(),
          email,
          loginPhone,
          passwordHash,
          loginMethod: "password",
          role: "tutor",
          lastSignedIn: new Date(),
        });
        const userId = Number(createdUser[0].insertId);
        const user = (await tx.select().from(users).where(eq(users.id, userId)).limit(1))[0];
        if (!user) throw new Error("Tutor account could not be created");

        const createdRegistration = await tx.insert(tutorRegistrations).values({ userId: user.id });
        const registrationId = Number(createdRegistration[0].insertId);
        const allocatedRegistrations = await tx
          .select({ tutorNumber: tutorRegistrations.tutorNumber })
          .from(tutorRegistrations)
          .where(gte(tutorRegistrations.tutorNumber, 777))
          .orderBy(asc(tutorRegistrations.tutorNumber))
          .for("update");
        const tutorNumber = getNextAvailableTutorNumber(allocatedRegistrations.map(registration => registration.tutorNumber));
        await tx.update(tutorRegistrations).set({ tutorNumber }).where(eq(tutorRegistrations.id, registrationId));
        const registration = (await tx.select().from(tutorRegistrations).where(eq(tutorRegistrations.id, registrationId)).limit(1))[0];
        if (!registration) throw new Error("Tutor registration identity could not be created");

        await tx.insert(tutors).values({
          id: `tutor-${user.id}`,
          userId: user.id,
          ...createTutorProfileDefaults(input),
        });

        return { created: true as const, user, registration };
      });
    } catch (error) {
      // A concurrent registration can win the race between the duplicate checks
      // above and these inserts. Report it as the same conflict the checks would
      // have, not an opaque 500. Tutor-number collisions stay thrown so the
      // outer retry can recompute the allocation.
      if (isUniqueConstraintError(error, ["users_role_login_phone_unique"])) {
        return { created: false as const, reason: "phone" as const };
      }
      if (isUniqueConstraintError(error, ["users_openId_unique"])) {
        return { created: false as const, reason: "email" as const };
      }
      throw error;
    }
  }));
}

export type GuardianRegistrationTransactionInput = {
  name: string;
  email: string;
  password: string;
  gender: "male" | "female";
  phone: string;
  cityLocationId: string;
  locationId: string;
  termsVersion: string;
  handoffTokenHash: string;
};

function guardianPasswordOpenId(email: string) {
  return `password:guardian:${normalizeEmail(email)}`;
}

export async function registerGuardianFromIntake(input: GuardianRegistrationTransactionInput) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  return withGuardianNumberAllocationRetry(() => withTutorNumberAllocationLock(() => database.transaction(async tx => {
    const intake = (await tx.select().from(guardianPhoneIntakes).where(eq(guardianPhoneIntakes.handoffTokenHash, input.handoffTokenHash)).limit(1))[0];
    if (!intake || intake.status !== "pending" || intake.handoffExpiresAt.getTime() < Date.now()) {
      throw new GuardianRegistrationError("handoff-expired");
    }
    const city = (await tx.select().from(locations).where(eq(locations.id, input.cityLocationId)).limit(1))[0];
    const selected = (await tx.select().from(locations).where(eq(locations.id, input.locationId)).limit(1))[0];
    if (!city || !selected || city.type !== "city" || city.country !== "Bangladesh" || city.enabled !== 1 || selected.country !== "Bangladesh" || selected.enabled !== 1) {
      throw new GuardianRegistrationError("invalid-location");
    }
    let cursor = selected;
    const visited = new Set<string>();
    let withinCity = false;
    while (cursor.parentId) {
      if (visited.has(cursor.id)) break;
      visited.add(cursor.id);
      if (cursor.parentId === city.id) { withinCity = true; break; }
      const parent = (await tx.select().from(locations).where(eq(locations.id, cursor.parentId)).limit(1))[0];
      if (!parent) break;
      cursor = parent;
    }
    if (!withinCity) {
      throw new GuardianRegistrationError("invalid-location");
    }
    const existing = (await tx.select().from(users).where(eq(users.email, email)).limit(1))[0];
    if (existing) {
      throw new GuardianRegistrationError("duplicate");
    }
    const loginPhone = normalizeBangladeshMobile(intake.phone);
    const existingPhone = (await tx
      .select()
      .from(users)
      .where(and(eq(users.role, "guardian"), eq(users.loginPhone, loginPhone)))
      .limit(1))[0];
    if (existingPhone) {
      throw new GuardianRegistrationError("duplicate");
    }
    const created = await tx.insert(users).values({ openId: guardianPasswordOpenId(email), name: input.name.trim(), email, loginPhone, passwordHash, loginMethod: "password", role: "guardian", lastSignedIn: new Date() });
    const userId = Number(created[0].insertId);
    const user = (await tx.select().from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!user) throw new Error("Guardian account could not be created");
    await tx.insert(guardianProfiles).values({
      userId,
      guardianId: String(getNextAvailableGuardianNumber(
        (await tx.select({ guardianId: guardianProfiles.guardianId }).from(guardianProfiles).for("update"))
          .map(profile => profile.guardianId),
      )),
      phone: intake.phone,
      gender: input.gender,
      cityLocationId: city.id,
      locationId: selected.id,
      termsVersion: input.termsVersion,
    });
    await tx.update(guardianPhoneIntakes).set({ status: "completed", updatedAt: new Date() }).where(eq(guardianPhoneIntakes.id, intake.id));
    return { created: true as const, user };
  })));
}

export async function getGuardianProfileByUserId(userId: number) {
  const database = await getDb();
  if (!database) return undefined;
  const row = (await database
    .select({
      userId: guardianProfiles.userId,
      guardianId: guardianProfiles.guardianId,
      phone: guardianProfiles.phone,
      gender: guardianProfiles.gender,
      cityLocationId: guardianProfiles.cityLocationId,
      locationId: guardianProfiles.locationId,
      termsVersion: guardianProfiles.termsVersion,
      createdAt: guardianProfiles.createdAt,
      updatedAt: guardianProfiles.updatedAt,
      name: users.name,
      email: users.email,
      accountCreatedAt: users.createdAt,
    })
    .from(guardianProfiles)
    .innerJoin(users, eq(users.id, guardianProfiles.userId))
    .where(eq(guardianProfiles.userId, userId))
    .limit(1))[0];
  return row;
}

export async function getGuardianAccountStatusByUserId(userId: number) {
  const database = await getDb();
  if (!database) return undefined;
  const result = await database
    .select({ accountStatus: users.accountStatus, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return result[0]?.role === "guardian" ? result[0].accountStatus : undefined;
}

/** Updates only Guardian-controlled profile attributes; login identity and phone remain protected. */
export async function updateGuardianProfileByUserId(input: {
  userId: number;
  name: string;
  gender: "male" | "female";
  cityLocationId: string;
  locationId: string;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const location = await getTutorRequestLocation({ cityLocationId: input.cityLocationId, locationId: input.locationId });
  await database.transaction(async tx => {
    await tx.update(users).set({ name: input.name.trim() }).where(eq(users.id, input.userId));
    await tx.update(guardianProfiles).set({
      gender: input.gender,
      cityLocationId: location.cityLocationId,
      locationId: location.locationId,
    }).where(eq(guardianProfiles.userId, input.userId));
    await tx.insert(guardianProfileUpdateEvents).values({ guardianUserId: input.userId });
  });
  return { updated: true } as const;
}

/** Confirms the current credential before replacing a Guardian password hash. */
export async function changeGuardianPasswordByUserId(input: {
  userId: number;
  currentPassword: string;
  newPassword: string;
}): Promise<"changed" | "invalid-current-password"> {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const user = (await database.select({ passwordHash: users.passwordHash, role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1))[0];
  if (user?.role !== "guardian" || !user.passwordHash || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
    return "invalid-current-password";
  }
  await database.update(users).set({ passwordHash: await hashPassword(input.newPassword) }).where(eq(users.id, input.userId));
  return "changed";
}

/** Internal current-photo record; the raw storage key never leaves server-only services. */
export async function getGuardianProfilePhotoByUserId(userId: number) {
  const database = await getDb();
  if (!database) return undefined;
  return (await database
    .select({
      id: guardianProfilePhotos.id,
      storageKey: guardianProfilePhotos.storageKey,
      status: guardianProfilePhotos.status,
      rejectionReason: guardianProfilePhotos.rejectionReason,
      moderationNote: guardianProfilePhotos.moderationNote,
      createdAt: guardianProfilePhotos.createdAt,
      updatedAt: guardianProfilePhotos.updatedAt,
    })
    .from(guardianProfilePhotos)
    .where(eq(guardianProfilePhotos.guardianUserId, userId))
    .limit(1))[0];
}

/** Internal Admin-review lookup. It intentionally excludes Guardian contact and request data. */
export async function getGuardianProfilePhotoForReview(photoId: number) {
  const database = await getDb();
  if (!database) return undefined;
  return (await database
    .select({
      id: guardianProfilePhotos.id,
      guardianUserId: guardianProfilePhotos.guardianUserId,
      status: guardianProfilePhotos.status,
    })
    .from(guardianProfilePhotos)
    .where(eq(guardianProfilePhotos.id, photoId))
    .limit(1))[0];
}

/** Creates/replaces the single current photo record and records a minimal audit event. */
export async function saveGuardianProfilePhoto(input: {
  guardianUserId: number;
  storageKey: string;
  actorUserId: number;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  await database.transaction(async tx => {
    const existing = (await tx
      .select({ id: guardianProfilePhotos.id, status: guardianProfilePhotos.status })
      .from(guardianProfilePhotos)
      .where(eq(guardianProfilePhotos.guardianUserId, input.guardianUserId))
      .limit(1))[0];
    if (existing) {
      await tx
        .update(guardianProfilePhotos)
        .set({
          storageKey: input.storageKey,
          status: "pending_review",
          rejectionReason: null,
          moderationNote: null,
          moderatedByAdminId: null,
          moderatedAt: null,
        })
        .where(eq(guardianProfilePhotos.id, existing.id));
      await tx.insert(guardianProfilePhotoEvents).values({
        guardianUserId: input.guardianUserId,
        actorUserId: input.actorUserId,
        action: "replaced",
        previousStatus: existing.status,
        nextStatus: "pending_review",
      });
      return;
    }
    await tx.insert(guardianProfilePhotos).values({
      guardianUserId: input.guardianUserId,
      storageKey: input.storageKey,
      status: "pending_review",
    });
    await tx.insert(guardianProfilePhotoEvents).values({
      guardianUserId: input.guardianUserId,
      actorUserId: input.actorUserId,
      action: "submitted",
      nextStatus: "pending_review",
    });
  });
}

/** Removes only the active Guardian-owned reference, preserving a key-free audit record. */
export async function clearGuardianProfilePhoto(input: {
  guardianUserId: number;
  actorUserId: number;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  await database.transaction(async tx => {
    const existing = (await tx
      .select({ id: guardianProfilePhotos.id, status: guardianProfilePhotos.status })
      .from(guardianProfilePhotos)
      .where(eq(guardianProfilePhotos.guardianUserId, input.guardianUserId))
      .limit(1))[0];
    if (!existing) return;
    await tx.delete(guardianProfilePhotos).where(eq(guardianProfilePhotos.id, existing.id));
    await tx.insert(guardianProfilePhotoEvents).values({
      guardianUserId: input.guardianUserId,
      actorUserId: input.actorUserId,
      action: "removed",
      previousStatus: existing.status,
    });
  });
}

/** Internal pending-review queue; it selects neither Guardian contacts nor request contents. */
export async function listPendingGuardianProfilePhotos() {
  const database = await getDb();
  if (!database) return [];
  return database
    .select({
      id: guardianProfilePhotos.id,
      storageKey: guardianProfilePhotos.storageKey,
      status: guardianProfilePhotos.status,
      createdAt: guardianProfilePhotos.createdAt,
      guardianId: guardianProfiles.guardianId,
    })
    .from(guardianProfilePhotos)
    .innerJoin(guardianProfiles, eq(guardianProfiles.userId, guardianProfilePhotos.guardianUserId))
    .where(eq(guardianProfilePhotos.status, "pending_review"))
    .orderBy(asc(guardianProfilePhotos.createdAt));
}

/** Writes an Admin decision only when the record remains pending and logs no free-text audit data. */
export async function reviewGuardianProfilePhotoByAdmin(input: {
  photoId: number;
  adminUserId: number;
  nextStatus: "approved" | "rejected";
  rejectionReason: GuardianProfilePhotoRejectionReason | null;
  moderationNote: string | null;
}): Promise<{ updated: true } | { updated: false }> {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database.transaction(async tx => {
    const record = (await tx
      .select({
        id: guardianProfilePhotos.id,
        guardianUserId: guardianProfilePhotos.guardianUserId,
        status: guardianProfilePhotos.status,
      })
      .from(guardianProfilePhotos)
      .where(eq(guardianProfilePhotos.id, input.photoId))
      .limit(1))[0];
    if (!record || record.status !== "pending_review") return { updated: false } as const;
    const updateResult = await tx
      .update(guardianProfilePhotos)
      .set({
        status: input.nextStatus,
        rejectionReason: input.rejectionReason,
        moderationNote: input.moderationNote,
        moderatedByAdminId: input.adminUserId,
        moderatedAt: new Date(),
      })
      .where(and(eq(guardianProfilePhotos.id, input.photoId), eq(guardianProfilePhotos.status, "pending_review")));
    if (!updateResult[0].affectedRows) return { updated: false } as const;
    await tx.insert(guardianProfilePhotoEvents).values({
      guardianUserId: record.guardianUserId,
      actorUserId: input.adminUserId,
      action: input.nextStatus,
      previousStatus: "pending_review",
      nextStatus: input.nextStatus,
      rejectionReason: input.rejectionReason,
    });
    return { updated: true } as const;
  });
}

export class TutorRequestLocationError extends Error {
  constructor() {
    super("The selected tuition location is not within the selected City.");
    this.name = "TutorRequestLocationError";
  }
}

/** Validates a request's City-scoped tuition location and returns a derived safe label. */
export async function getTutorRequestLocation(input: {
  cityLocationId: string;
  locationId: string;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const city = (await database.select().from(locations).where(eq(locations.id, input.cityLocationId)).limit(1))[0];
  const selected = (await database.select().from(locations).where(eq(locations.id, input.locationId)).limit(1))[0];
  if (!city || !selected || city.type !== "city" || city.country !== "Bangladesh" || city.enabled !== 1 || selected.country !== "Bangladesh" || selected.enabled !== 1) {
    throw new TutorRequestLocationError();
  }

  let cursor = selected;
  const visited = new Set<string>();
  let withinCity = false;
  while (cursor.parentId) {
    if (visited.has(cursor.id)) break;
    visited.add(cursor.id);
    if (cursor.parentId === city.id) {
      withinCity = true;
      break;
    }
    const parent = (await database.select().from(locations).where(eq(locations.id, cursor.parentId)).limit(1))[0];
    if (!parent) break;
    cursor = parent;
  }
  if (!withinCity) throw new TutorRequestLocationError();

  return {
    cityLocationId: city.id,
    locationId: selected.id,
    locationLabel: `${selected.label}, ${city.label}`,
  };
}

/**
 * Outcome of a public-account password sign-in. Account status is reported only
 * once the password matches, so a wrong password stays indistinguishable from an
 * unknown identifier and cannot be used to enumerate suspended accounts.
 */
export type PasswordAccountSignIn =
  | { status: "ok"; user: User }
  | { status: "invalid-credentials" }
  | { status: "suspended" }
  | { status: "closed" };

/** Resolves one selected public account role without revealing identifier existence. */
export async function verifyPasswordAccount(input: {
  identifier: string;
  password: string;
  role: PasswordAccountRole;
}): Promise<PasswordAccountSignIn> {
  const identifier = normalizePasswordAccountIdentifier(input.identifier);
  if (!identifier) return { status: "invalid-credentials" };
  const database = await getDb();
  if (!database) return { status: "invalid-credentials" };
  const condition = identifier.kind === "email"
    ? and(eq(users.role, input.role), eq(users.email, identifier.value))
    : and(eq(users.role, input.role), eq(users.loginPhone, identifier.value));
  const user = (await database.select().from(users).where(condition).limit(1))[0];
  if (!user?.passwordHash) return { status: "invalid-credentials" };
  if (!(await verifyPassword(input.password, user.passwordHash))) return { status: "invalid-credentials" };
  if (user.accountStatus === "suspended") return { status: "suspended" };
  if (user.accountStatus === "closed") return { status: "closed" };
  return { status: "ok", user };
}

export async function verifyGuardianPassword(email: string, password: string) {
  return verifyPasswordAccount({ role: "guardian", identifier: email, password });
}

export async function verifyTutorPassword(email: string, password: string) {
  return verifyPasswordAccount({ role: "tutor", identifier: email, password });
}

/**
 * Verifies an active Admin only through its dedicated assigned User ID. The
 * caller receives `undefined` for malformed, unknown, suspended, non-Admin,
 * and wrong-password attempts to preserve a single non-enumerating failure.
 */
export async function verifyAdminPassword(input: { userId: string; password: string }) {
  const loginId = normalizeAdminLoginId(input.userId);
  if (!loginId) return undefined;
  const database = await getDb();
  if (!database) return undefined;
  const result = await database
    .select({ user: users })
    .from(adminCredentials)
    .innerJoin(users, eq(adminCredentials.userId, users.id))
    .where(and(eq(adminCredentials.loginId, loginId), eq(users.role, "admin")))
    .limit(1);
  const user = result[0]?.user;
  if (!user?.passwordHash || user.accountStatus !== "active") return undefined;
  return (await verifyPassword(input.password, user.passwordHash)) ? user : undefined;
}

/** Owner-controlled bootstrap/reset for an assigned Admin User ID and password. */
export async function provisionAdminPasswordCredential(input: { userId: number; loginId: string; password: string }) {
  const loginId = normalizeAdminLoginId(input.loginId);
  if (!loginId) return { updated: false, reason: "INVALID_LOGIN_ID" as const };
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const target = (await database.select().from(users).where(eq(users.id, input.userId)).limit(1))[0];
  if (!target || target.role !== "admin") return { updated: false, reason: "ADMIN_NOT_FOUND" as const };

  const assigned = (await database.select().from(adminCredentials).where(eq(adminCredentials.loginId, loginId)).limit(1))[0];
  if (assigned && assigned.userId !== input.userId) return { updated: false, reason: "LOGIN_ID_IN_USE" as const };

  const passwordHash = await hashPassword(input.password);
  if (assigned) {
    await database.update(adminCredentials).set({ loginId }).where(eq(adminCredentials.userId, input.userId));
  } else {
    await database.insert(adminCredentials).values({ userId: input.userId, loginId });
  }
  await database.update(users).set({ passwordHash, loginMethod: "password" }).where(eq(users.id, input.userId));
  return { updated: true, action: assigned ? "reset" as const : "provisioned" as const };
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getTutorRegistrationByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tutorRegistrations).where(eq(tutorRegistrations.userId, userId)).limit(1);
  return result[0];
}

/** Advances a known public Tutor number by one, retaining legacy helper compatibility. */
export function getNextTutorNumber(lastTutorNumber: number | string | null | undefined) {
  const last = Number(lastTutorNumber ?? 776);
  return Math.max(Number.isSafeInteger(last) ? last : 776, 776) + 1;
}

/** Finds the lowest unused numeric public Tutor ID from 777 without mutating historic IDs. */
export function getNextAvailableTutorNumber(existingTutorNumbers: readonly (number | string | null | undefined)[]) {
  const allocated = new Set<number>();
  for (const tutorNumber of existingTutorNumbers) {
    const parsed = Number(tutorNumber);
    if (Number.isSafeInteger(parsed) && parsed >= 777) allocated.add(parsed);
  }

  let candidate = 777;
  while (allocated.has(candidate)) candidate = getNextTutorNumber(candidate);
  return candidate;
}

/** Finds the lowest unused numeric Guardian ID from 777; legacy opaque IDs are ignored. */
export function getNextAvailableGuardianNumber(existingGuardianNumbers: readonly (number | string | null | undefined)[]) {
  const allocated = new Set<number>();
  for (const guardianNumber of existingGuardianNumbers) {
    const parsed = Number(guardianNumber);
    if (Number.isSafeInteger(parsed) && parsed >= 777) allocated.add(parsed);
  }

  let candidate = 777;
  while (allocated.has(candidate)) candidate += 1;
  return candidate;
}

/** Creates a stable Tutor ID on first Tutor registration. Tutor numbers start at 777. */
export async function ensureTutorRegistration(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  return withTutorNumberAllocationRetry(() => withTutorNumberAllocationLock(() => db.transaction(async tx => {
    const existing = (await tx.select().from(tutorRegistrations).where(eq(tutorRegistrations.userId, userId)).limit(1))[0];
    if (existing) return existing;

    const created = await tx.insert(tutorRegistrations).values({ userId });
    const registrationId = Number(created[0].insertId);
    const allocatedRegistrations = await tx
      .select({ tutorNumber: tutorRegistrations.tutorNumber })
      .from(tutorRegistrations)
      .where(gte(tutorRegistrations.tutorNumber, 777))
      .orderBy(asc(tutorRegistrations.tutorNumber))
      .for("update");
    const tutorNumber = getNextAvailableTutorNumber(allocatedRegistrations.map(registration => registration.tutorNumber));
    await tx.update(tutorRegistrations).set({ tutorNumber }).where(eq(tutorRegistrations.id, registrationId));
    return (await tx.select().from(tutorRegistrations).where(eq(tutorRegistrations.id, registrationId)).limit(1))[0];
  })));
}

export async function setUserRole(openId: string, role: UserRole) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(users).set({ role }).where(eq(users.openId, openId));
}

function parseJsonList(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function mapTutor(row: typeof tutors.$inferSelect, location?: typeof locations.$inferSelect, includePrivate = false) {
  const publicTutor = {
    id: row.id,
    name: row.name,
    locationId: row.locationId,
    initials: row.initials ?? getInitials(row.name),
    accent: row.accent ?? "#167ddd",
    headline: row.headline ?? "Tutor profile",
    institution: row.institution ?? "Not specified",
    education: row.education ?? "Not specified",
    subjects: parseJsonList(row.subjects),
    levels: parseJsonList(row.levels),
    experience: row.experience ?? 0,
    fee: row.fee ?? 0,
    gender: row.gender,
    mode: row.mode ?? "both",
    availability: row.availability ?? "Not specified",
    languages: parseJsonList(row.languages),
    about: row.about ?? "",
    verified: Boolean(row.verified),
    country: location?.country ?? "",
    city: location?.type === "city" ? location.label : "",
    division: location?.type === "division" ? location.label : undefined,
    district: location?.type === "district" ? location.label : undefined,
    locationLabel: location?.label ?? row.locationId,
  };

  return includePrivate
    ? { ...publicTutor, phone: row.phone, contactEmail: row.contactEmail, profileStatus: row.profileStatus }
    : publicTutor;
}

export async function listLocations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(locations).where(eq(locations.enabled, 1)).orderBy(asc(locations.country), asc(locations.label));
}

export async function listTutors() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ tutor: tutors, location: locations })
    .from(tutors)
    .leftJoin(locations, eq(tutors.locationId, locations.id))
    .where(eq(tutors.profileStatus, "approved"));
  return rows.map(({ tutor, location }) => mapTutor(tutor, location ?? undefined));
}

export async function listTutorListingPage(filters: TutorListingFilters) {
  const tutorList = await listTutors();
  return getTutorListingPage(tutorList, filters);
}

export async function getTutorById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ tutor: tutors, location: locations })
    .from(tutors)
    .leftJoin(locations, eq(tutors.locationId, locations.id))
    .where(and(eq(tutors.id, id), eq(tutors.profileStatus, "approved")))
    .limit(1);
  const row = rows[0];
  return row ? mapTutor(row.tutor, row.location ?? undefined) : undefined;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("") || "TU";
}

export class TutorProfileValidationError extends Error {
  constructor(public readonly issues: TutorProfileCatalogReferenceIssue[]) {
    super("Tutor Profile contains unavailable catalog selections.");
    this.name = "TutorProfileValidationError";
  }
}

export class TutorProfileStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TutorProfileStateError";
  }
}

async function loadTutorProfileOwner(database: any, userId: number) {
  const rows = await database
    .select({ tutor: tutors, location: locations, user: users, registration: tutorRegistrations, academic: tutorAcademicProfiles, privateProfile: tutorPrivateProfiles, universityIdDocument: tutorUniversityIdDocuments })
    .from(tutors)
    .innerJoin(users, eq(tutors.userId, users.id))
    .leftJoin(locations, eq(tutors.locationId, locations.id))
    .leftJoin(tutorRegistrations, eq(tutorRegistrations.userId, tutors.userId))
    .leftJoin(tutorAcademicProfiles, eq(tutorAcademicProfiles.tutorId, tutors.id))
    .leftJoin(tutorPrivateProfiles, eq(tutorPrivateProfiles.tutorId, tutors.id))
    .leftJoin(tutorUniversityIdDocuments, eq(tutorUniversityIdDocuments.tutorId, tutors.id))
    .where(eq(tutors.userId, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;

  const tutorId = row.tutor.id;
  const [teachingAreas, subjectRows, levelRows, curriculumRows, studentTypeRows, classSizeRows, teachingDayRows, timeSlotRows, languageRows, communicationRows, educationRecordRows, supportingDocumentRows, assignedCountRows] = await Promise.all([
    database.select().from(tutorTeachingAreas).where(eq(tutorTeachingAreas.tutorId, tutorId)),
    database.select().from(tutorSubjects).where(eq(tutorSubjects.tutorId, tutorId)),
    database.select().from(tutorClassLevels).where(eq(tutorClassLevels.tutorId, tutorId)),
    database.select().from(tutorCurricula).where(eq(tutorCurricula.tutorId, tutorId)),
    database.select().from(tutorStudentTypes).where(eq(tutorStudentTypes.tutorId, tutorId)),
    database.select().from(tutorPreferredClassSizes).where(eq(tutorPreferredClassSizes.tutorId, tutorId)),
    database.select().from(tutorPreferredTeachingDays).where(eq(tutorPreferredTeachingDays.tutorId, tutorId)),
    database.select().from(tutorPreferredTimeSlots).where(eq(tutorPreferredTimeSlots.tutorId, tutorId)),
    database.select().from(tutorTeachingLanguages).where(eq(tutorTeachingLanguages.tutorId, tutorId)),
    database.select().from(tutorCommunicationPreferences).where(eq(tutorCommunicationPreferences.tutorId, tutorId)),
    database.select().from(tutorEducationRecords).where(eq(tutorEducationRecords.tutorId, tutorId)),
    // Types only — the storage keys stay out of every profile DTO.
    database.select({ documentType: tutorSupportingDocuments.documentType }).from(tutorSupportingDocuments).where(eq(tutorSupportingDocuments.tutorId, tutorId)),
    database.select({ value: count() }).from(tutorRequests).where(eq(tutorRequests.tutorId, tutorId)),
  ]);

  const profile = {
    tutorId,
    tutorNumber: row.registration?.tutorNumber ?? null,
    registeredAt: row.registration?.registeredAt ?? null,
    profilePhotoKey: row.tutor.profilePhotoKey ?? undefined,
    name: row.tutor.name,
    gender: row.tutor.gender,
    dateOfBirth: row.tutor.dateOfBirth ? row.tutor.dateOfBirth.toISOString().slice(0, 10) : undefined,
    headline: row.tutor.headline ?? undefined,
    phone: row.tutor.phone ?? undefined,
    contactEmail: row.tutor.contactEmail ?? undefined,
    currentLocationId: row.tutor.locationId,
    currentLocationLabel: row.location?.label ?? row.tutor.locationId,
    locationId: row.tutor.locationId,
    teachingAreaIds: teachingAreas.map((selection: typeof tutorTeachingAreas.$inferSelect) => selection.locationId),
    availableNationwide: Boolean(row.tutor.nationwideAvailability),
    highestEducation: row.academic?.highestEducation ?? undefined,
    institution: row.tutor.institution ?? "Not specified",
    education: row.tutor.education ?? "Not specified",
    availability: row.tutor.availability ?? "Not specified",
    universityId: row.academic?.universityId ?? undefined,
    facultyDepartmentId: row.academic?.facultyDepartmentId ?? undefined,
    degreeMajorId: row.academic?.degreeMajorId ?? undefined,
    degreeExamTitle: row.academic?.degreeExamTitle ?? undefined,
    resultGpa: row.academic?.resultGpa ?? undefined,
    deptId: row.academic?.deptId ?? undefined,
    studyStatus: row.academic?.currentStudyStatus ?? undefined,
    yearSemester: row.academic?.yearSemester ?? undefined,
    graduationYear: row.academic?.graduationYear ?? undefined,
    primarySubjectIds: subjectRows.filter((selection: typeof tutorSubjects.$inferSelect) => selection.selectionType === "primary").map((selection: typeof tutorSubjects.$inferSelect) => selection.subjectId),
    additionalSubjectIds: subjectRows.filter((selection: typeof tutorSubjects.$inferSelect) => selection.selectionType === "additional").map((selection: typeof tutorSubjects.$inferSelect) => selection.subjectId),
    classLevelIds: levelRows.map((selection: typeof tutorClassLevels.$inferSelect) => selection.classLevelId),
    curriculumIds: curriculumRows.map((selection: typeof tutorCurricula.$inferSelect) => selection.curriculumId),
    teachingExperienceYears: row.tutor.teachingExperienceYears ?? undefined,
    priorTeachingExperience: row.tutor.priorTeachingExperience ?? undefined,
    specialExpertise: row.tutor.specialExpertise ?? undefined,
    studentTypeIds: studentTypeRows.map((selection: typeof tutorStudentTypes.$inferSelect) => selection.studentTypeId),
    academicAchievement: row.tutor.academicAchievement ?? undefined,
    tuitionType: row.tutor.mode ?? undefined,
    preferredStudentGender: row.tutor.preferredStudentGender ?? undefined,
    preferredClassSizes: classSizeRows.map((selection: typeof tutorPreferredClassSizes.$inferSelect) => selection.classSize),
    preferredTeachingDays: teachingDayRows.map((selection: typeof tutorPreferredTeachingDays.$inferSelect) => selection.dayOfWeek),
    preferredTimeSlots: timeSlotRows.map((selection: typeof tutorPreferredTimeSlots.$inferSelect) => selection.timeSlot),
    feeMin: row.tutor.monthlyFeeMin ?? undefined,
    feeMax: row.tutor.monthlyFeeMax ?? undefined,
    travelDistanceKm: row.tutor.travelDistanceKm ?? undefined,
    teachingLanguageIds: languageRows.map((selection: typeof tutorTeachingLanguages.$inferSelect) => selection.languageId),
    communicationPreferences: communicationRows.map((selection: typeof tutorCommunicationPreferences.$inferSelect) => selection.channel),
    aboutMe: row.tutor.about ?? undefined,
    // Transitional compatibility values used by the existing dashboard while
    // the structured Profile editor is delivered in TP-07.
    about: row.tutor.about ?? "",
    languages: [],
    subjects: parseJsonList(row.tutor.subjects),
    levels: parseJsonList(row.tutor.levels),
    experience: row.tutor.experience ?? row.tutor.teachingExperienceYears ?? 0,
    fee: row.tutor.fee ?? row.tutor.monthlyFeeMin ?? 0,
    mode: row.tutor.mode ?? "both",
    verified: Boolean(row.tutor.verified),
    teachingApproach: row.tutor.teachingApproach ?? undefined,
    whyChooseMe: row.tutor.whyChooseMe ?? undefined,
    additionalNotes: row.tutor.additionalNotes ?? undefined,
    privateDetails: row.privateProfile ? {
      additionalPhone: row.privateProfile.additionalPhone ?? undefined,
      presentAddress: row.privateProfile.presentAddress ?? undefined,
      permanentAddress: row.privateProfile.permanentAddress ?? undefined,
      nationality: row.privateProfile.nationality ?? undefined,
      religion: row.privateProfile.religion ?? undefined,
      socialProfileLinks: row.privateProfile.socialProfileLinks ?? undefined,
      fatherName: row.privateProfile.fatherName ?? undefined,
      fatherPhone: row.privateProfile.fatherPhone ?? undefined,
      motherName: row.privateProfile.motherName ?? undefined,
      motherPhone: row.privateProfile.motherPhone ?? undefined,
      emergencyContactName: row.privateProfile.emergencyContactName ?? undefined,
      emergencyContactRelation: row.privateProfile.emergencyContactRelation ?? undefined,
      emergencyContactPhone: row.privateProfile.emergencyContactPhone ?? undefined,
      emergencyContactAddress: row.privateProfile.emergencyContactAddress ?? undefined,
    } : undefined,
    educationRecords: educationRecordRows.map((record: typeof tutorEducationRecords.$inferSelect) => ({
      qualificationLevel: record.qualificationLevel,
      instituteName: record.instituteName,
      degreeExamTitle: record.degreeExamTitle,
      majorGroup: record.majorGroup,
      resultGpa: record.resultGpa ?? undefined,
      curriculum: record.curriculum ?? undefined,
      studyStartYear: record.studyStartYear,
      studyEndYear: record.studyEndYear ?? undefined,
      currentlyStudying: Boolean(record.currentlyStudying),
      instituteIdCardNumber: record.instituteIdCardNumber ?? undefined,
    })),
    universityIdDocumentStatus: row.universityIdDocument?.documentStatus === "uploaded" ? "uploaded" as const : "not_uploaded" as const,
    uploadedSupportingDocuments: supportingDocumentRows.map((document: { documentType: string }) => document.documentType),
    profileStatus: row.tutor.profileStatus,
    accountStatus: row.user.accountStatus,
    assignedRequestCount: Number(assignedCountRows[0]?.value ?? 0),
    lastUpdatedAt: row.tutor.updatedAt,
  };

  return { ...profile, completionPercentage: calculateTutorProfileCompletion(profile) };
}

export async function getTutorAccountStatusByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ accountStatus: users.accountStatus }).from(users).where(eq(users.id, userId)).limit(1);
  return result[0]?.accountStatus;
}

/** The raw storage key remains internal; only a current owner DTO receives its usable route. */
export function toTutorProfileOwnerDto(profile: Awaited<ReturnType<typeof loadTutorProfileOwner>>) {
  if (!profile) return undefined;
  const { profilePhotoKey, ...safeProfile } = profile;
  return {
    ...safeProfile,
    profilePhotoUrl: profilePhotoKey ? `/manus-storage/${profilePhotoKey}` : undefined,
  };
}

export async function getTutorProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return toTutorProfileOwnerDto(await loadTutorProfileOwner(db, userId));
}

export async function saveTutorProfilePhotoKey(userId: number, key: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.update(tutors).set({ profilePhotoKey: key }).where(eq(tutors.userId, userId));
  if (Number(result[0].affectedRows) !== 1) throw new Error("Tutor Profile was not found.");
}

/** Removal drops only the private database reference; storage objects are intentionally not deleted. */
export async function clearTutorProfilePhotoKey(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.update(tutors).set({ profilePhotoKey: null }).where(eq(tutors.userId, userId));
  if (Number(result[0].affectedRows) !== 1) throw new Error("Tutor Profile was not found.");
}

/** Stores one optional verification document; the key stays server-side. */
export async function saveTutorSupportingDocument(userId: number, documentType: string, storageKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [tutor] = await db.select({ id: tutors.id }).from(tutors).where(eq(tutors.userId, userId)).limit(1);
  if (!tutor) throw new Error("Tutor Profile was not found.");
  const uploadedAt = new Date();
  await db.insert(tutorSupportingDocuments).values({
    tutorId: tutor.id,
    documentType,
    storageKey,
    uploadedAt,
  }).onDuplicateKeyUpdate({ set: { storageKey, uploadedAt } });
}

/** Stores only a private object-storage key and upload status; never return this key to public or Guardian DTOs. */
export async function saveTutorUniversityIdDocument(userId: number, storageKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [tutor] = await db.select({ id: tutors.id }).from(tutors).where(eq(tutors.userId, userId)).limit(1);
  if (!tutor) throw new Error("Tutor Profile was not found.");
  const uploadedAt = new Date();
  await db.insert(tutorUniversityIdDocuments).values({
    tutorId: tutor.id,
    storageKey,
    documentStatus: "uploaded",
    uploadedAt,
  }).onDuplicateKeyUpdate({ set: { storageKey, documentStatus: "uploaded", uploadedAt } });
}

async function getTutorProfileCatalogReferences(database: any): Promise<TutorProfileCatalogReferences> {
  const [locationRows, universityRows, facultyDepartmentRows, degreeRows, subjectRows, classLevelRows, curriculumRows, studentTypeRows, languageRows] = await Promise.all([
    database.select({ id: locations.id }).from(locations).where(eq(locations.enabled, 1)),
    database.select({ id: universities.id }).from(universities).where(eq(universities.active, 1)),
    database.select({ id: facultyDepartments.id }).from(facultyDepartments).where(eq(facultyDepartments.active, 1)),
    database.select({ id: degreeMajors.id, facultyDepartmentId: degreeMajors.facultyDepartmentId }).from(degreeMajors).where(eq(degreeMajors.active, 1)),
    database.select({ id: subjectsCatalog.id }).from(subjectsCatalog).where(eq(subjectsCatalog.active, 1)),
    database.select({ id: classLevels.id }).from(classLevels).where(eq(classLevels.active, 1)),
    database.select({ id: curricula.id }).from(curricula).where(eq(curricula.active, 1)),
    database.select({ id: studentTypes.id }).from(studentTypes).where(eq(studentTypes.active, 1)),
    database.select({ id: languagesCatalog.id }).from(languagesCatalog).where(eq(languagesCatalog.active, 1)),
  ]);

  return {
    activeLocationIds: new Set(locationRows.map((row: { id: string }) => row.id)),
    activeUniversityIds: new Set(universityRows.map((row: { id: number }) => row.id)),
    activeFacultyDepartmentIds: new Set(facultyDepartmentRows.map((row: { id: number }) => row.id)),
    activeDegreeMajorFacultyDepartmentIds: new Map(degreeRows.map((row: { id: number; facultyDepartmentId: number }) => [row.id, row.facultyDepartmentId])),
    activeSubjectIds: new Set(subjectRows.map((row: { id: number }) => row.id)),
    activeClassLevelIds: new Set(classLevelRows.map((row: { id: number }) => row.id)),
    activeCurriculumIds: new Set(curriculumRows.map((row: { id: number }) => row.id)),
    activeStudentTypeIds: new Set(studentTypeRows.map((row: { id: number }) => row.id)),
    activeLanguageIds: new Set(languageRows.map((row: { id: number }) => row.id)),
  };
}

async function assertCatalogReferences(database: any, input: TutorProfileDraftInput) {
  const issues = validateTutorProfileCatalogReferences(input, await getTutorProfileCatalogReferences(database));
  if (issues.length > 0) throw new TutorProfileValidationError(issues);
}

/**
 * A partial section save re-validates against the full draft schema, where the
 * list fields require `.min(1)`. When the stored profile has never had a value
 * they read back as `[]`, which would fail that check and block saving any other
 * section. Treat a stored empty list as "not set yet" so `.optional()` applies.
 */
export function keepList<T>(next: T[] | undefined, previous: T[] | null | undefined): T[] | undefined {
  if (next !== undefined) return next;
  return previous && previous.length > 0 ? previous : undefined;
}

function mergeTutorProfileDraft(existing: any, input: TutorProfileEditableDraftInput): TutorProfileDraftInput {
  return {
    profilePhotoKey: existing.profilePhotoKey,
    name: input.name ?? existing.name,
    gender: input.gender ?? existing.gender,
    dateOfBirth: input.dateOfBirth ?? existing.dateOfBirth,
    headline: input.headline ?? existing.headline,
    phone: input.phone ?? existing.phone,
    contactEmail: input.contactEmail ?? existing.contactEmail,
    currentLocationId: input.currentLocationId ?? existing.currentLocationId,
    teachingAreaIds: keepList(input.teachingAreaIds, existing.teachingAreaIds),
    availableNationwide: input.availableNationwide ?? existing.availableNationwide,
    highestEducation: input.highestEducation ?? existing.highestEducation,
    universityId: input.universityId ?? existing.universityId,
    facultyDepartmentId: input.facultyDepartmentId ?? existing.facultyDepartmentId,
    degreeMajorId: input.degreeMajorId ?? existing.degreeMajorId,
    degreeExamTitle: input.degreeExamTitle ?? existing.degreeExamTitle,
    resultGpa: input.resultGpa ?? existing.resultGpa,
    deptId: input.deptId ?? existing.deptId,
    studyStatus: input.studyStatus ?? existing.studyStatus,
    yearSemester: input.yearSemester ?? existing.yearSemester,
    graduationYear: input.graduationYear ?? existing.graduationYear,
    primarySubjectIds: keepList(input.primarySubjectIds, existing.primarySubjectIds),
    additionalSubjectIds: keepList(input.additionalSubjectIds, existing.additionalSubjectIds),
    classLevelIds: keepList(input.classLevelIds, existing.classLevelIds),
    curriculumIds: keepList(input.curriculumIds, existing.curriculumIds),
    teachingExperienceYears: input.teachingExperienceYears ?? existing.teachingExperienceYears,
    priorTeachingExperience: input.priorTeachingExperience ?? existing.priorTeachingExperience,
    specialExpertise: input.specialExpertise ?? existing.specialExpertise,
    studentTypeIds: keepList(input.studentTypeIds, existing.studentTypeIds),
    academicAchievement: input.academicAchievement ?? existing.academicAchievement,
    tuitionType: input.tuitionType ?? existing.tuitionType,
    preferredStudentGender: input.preferredStudentGender ?? existing.preferredStudentGender,
    preferredClassSizes: keepList(input.preferredClassSizes, existing.preferredClassSizes),
    preferredTeachingDays: keepList(input.preferredTeachingDays, existing.preferredTeachingDays),
    preferredTimeSlots: keepList(input.preferredTimeSlots, existing.preferredTimeSlots),
    feeMin: input.feeMin ?? existing.feeMin,
    feeMax: input.feeMax ?? existing.feeMax,
    travelDistanceKm: input.travelDistanceKm ?? existing.travelDistanceKm,
    teachingLanguageIds: keepList(input.teachingLanguageIds, existing.teachingLanguageIds),
    communicationPreferences: keepList(input.communicationPreferences, existing.communicationPreferences),
    aboutMe: input.aboutMe ?? existing.aboutMe,
    teachingApproach: input.teachingApproach ?? existing.teachingApproach,
    whyChooseMe: input.whyChooseMe ?? existing.whyChooseMe,
    additionalNotes: input.additionalNotes ?? existing.additionalNotes,
    privateDetails: input.privateDetails ?? existing.privateDetails,
    educationRecords: input.educationRecords ?? existing.educationRecords,
    universityIdDocumentStatus: existing.universityIdDocumentStatus,
  };
}

export async function saveTutorProfileDraft(userId: number, input: TutorProfileEditableDraftInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  await db.transaction(async transaction => {
    let tutorRow = (await transaction.select({ id: tutors.id }).from(tutors).where(eq(tutors.userId, userId)).limit(1))[0];
    if (!tutorRow) {
      const seed = createLegacyTutorProfileSeed(userId, input);
      await transaction.insert(tutors).values(seed);
      tutorRow = { id: seed.id };
    }
    const tutorId = tutorRow.id;
    const existingProfile = await loadTutorProfileOwner(transaction, userId);
    if (!existingProfile) throw new Error("Tutor Profile was not found.");
    const effectiveDraft = mergeTutorProfileDraft(existingProfile, input);
    const effectiveDraftResult = tutorProfileDraftSchema.safeParse(effectiveDraft);
    if (!effectiveDraftResult.success) {
      throw new TutorProfileValidationError(effectiveDraftResult.error.issues.map(issue => ({ path: issue.path.map(String), message: issue.message })));
    }
    await assertCatalogReferences(transaction, effectiveDraftResult.data);

    const [existingAcademic, existingPrivateProfile] = await Promise.all([
      transaction.select().from(tutorAcademicProfiles).where(eq(tutorAcademicProfiles.tutorId, tutorId)).limit(1).then((rows: any[]) => rows[0]),
      transaction.select().from(tutorPrivateProfiles).where(eq(tutorPrivateProfiles.tutorId, tutorId)).limit(1).then((rows: any[]) => rows[0]),
    ]);

    const tutorValues: Partial<typeof tutors.$inferInsert> = {};
    if (input.name !== undefined) {
      tutorValues.name = input.name;
      tutorValues.initials = getInitials(input.name);
    }
    if (input.gender !== undefined) tutorValues.gender = input.gender;
    if (input.dateOfBirth !== undefined) tutorValues.dateOfBirth = new Date(`${input.dateOfBirth}T00:00:00.000Z`);
    if (input.headline !== undefined) tutorValues.headline = input.headline;
    if (input.phone !== undefined) tutorValues.phone = input.phone;
    if (input.contactEmail !== undefined) tutorValues.contactEmail = input.contactEmail;
    if (input.currentLocationId !== undefined) tutorValues.locationId = input.currentLocationId;
    if (input.availableNationwide !== undefined) tutorValues.nationwideAvailability = input.availableNationwide ? 1 : 0;
    if (input.teachingExperienceYears !== undefined) tutorValues.teachingExperienceYears = input.teachingExperienceYears;
    if (input.priorTeachingExperience !== undefined) tutorValues.priorTeachingExperience = input.priorTeachingExperience;
    if (input.specialExpertise !== undefined) tutorValues.specialExpertise = input.specialExpertise;
    if (input.academicAchievement !== undefined) tutorValues.academicAchievement = input.academicAchievement;
    if (input.tuitionType !== undefined) tutorValues.mode = input.tuitionType;
    if (input.preferredStudentGender !== undefined) tutorValues.preferredStudentGender = input.preferredStudentGender;
    if (input.feeMin !== undefined) tutorValues.monthlyFeeMin = input.feeMin;
    if (input.feeMax !== undefined) tutorValues.monthlyFeeMax = input.feeMax;
    if (input.travelDistanceKm !== undefined) tutorValues.travelDistanceKm = input.travelDistanceKm;
    if (input.aboutMe !== undefined) tutorValues.about = input.aboutMe;
    if (input.teachingApproach !== undefined) tutorValues.teachingApproach = input.teachingApproach;
    if (input.whyChooseMe !== undefined) tutorValues.whyChooseMe = input.whyChooseMe;
    if (input.additionalNotes !== undefined) tutorValues.additionalNotes = input.additionalNotes;
    if (Object.keys(tutorValues).length > 0) await transaction.update(tutors).set(tutorValues).where(eq(tutors.id, tutorId));

    const academicValues: Partial<typeof tutorAcademicProfiles.$inferInsert> = {};
    if (input.highestEducation !== undefined) academicValues.highestEducation = input.highestEducation;
    if (input.universityId !== undefined) academicValues.universityId = input.universityId;
    if (input.facultyDepartmentId !== undefined) academicValues.facultyDepartmentId = input.facultyDepartmentId;
    if (input.degreeMajorId !== undefined) academicValues.degreeMajorId = input.degreeMajorId;
    if (input.degreeExamTitle !== undefined) academicValues.degreeExamTitle = input.degreeExamTitle;
    if (input.resultGpa !== undefined) academicValues.resultGpa = input.resultGpa;
    if (input.deptId !== undefined) academicValues.deptId = input.deptId;
    if (input.studyStatus !== undefined) academicValues.currentStudyStatus = input.studyStatus;
    if (input.yearSemester !== undefined) academicValues.yearSemester = input.yearSemester;
    if (input.graduationYear !== undefined) academicValues.graduationYear = input.graduationYear;
    if (Object.keys(academicValues).length > 0) {
      if (existingAcademic) await transaction.update(tutorAcademicProfiles).set(academicValues).where(eq(tutorAcademicProfiles.tutorId, tutorId));
      else await transaction.insert(tutorAcademicProfiles).values({ tutorId, ...academicValues });
    }

    if (input.privateDetails !== undefined) {
      const privateValues: Partial<typeof tutorPrivateProfiles.$inferInsert> = {};
      if (input.privateDetails.additionalPhone !== undefined) privateValues.additionalPhone = input.privateDetails.additionalPhone || null;
      if (input.privateDetails.presentAddress !== undefined) privateValues.presentAddress = input.privateDetails.presentAddress || null;
      if (input.privateDetails.permanentAddress !== undefined) privateValues.permanentAddress = input.privateDetails.permanentAddress || null;
      if (input.privateDetails.nationality !== undefined) privateValues.nationality = input.privateDetails.nationality || null;
      if (input.privateDetails.religion !== undefined) privateValues.religion = input.privateDetails.religion || null;
      if (input.privateDetails.socialProfileLinks !== undefined) privateValues.socialProfileLinks = input.privateDetails.socialProfileLinks || null;
      if (input.privateDetails.fatherName !== undefined) privateValues.fatherName = input.privateDetails.fatherName || null;
      if (input.privateDetails.fatherPhone !== undefined) privateValues.fatherPhone = input.privateDetails.fatherPhone || null;
      if (input.privateDetails.motherName !== undefined) privateValues.motherName = input.privateDetails.motherName || null;
      if (input.privateDetails.motherPhone !== undefined) privateValues.motherPhone = input.privateDetails.motherPhone || null;
      if (input.privateDetails.emergencyContactName !== undefined) privateValues.emergencyContactName = input.privateDetails.emergencyContactName || null;
      if (input.privateDetails.emergencyContactRelation !== undefined) privateValues.emergencyContactRelation = input.privateDetails.emergencyContactRelation || null;
      if (input.privateDetails.emergencyContactPhone !== undefined) privateValues.emergencyContactPhone = input.privateDetails.emergencyContactPhone || null;
      if (input.privateDetails.emergencyContactAddress !== undefined) privateValues.emergencyContactAddress = input.privateDetails.emergencyContactAddress || null;
      if (existingPrivateProfile) await transaction.update(tutorPrivateProfiles).set(privateValues).where(eq(tutorPrivateProfiles.tutorId, tutorId));
      else await transaction.insert(tutorPrivateProfiles).values({ tutorId, ...privateValues });
    }

    if (input.educationRecords !== undefined) {
      await transaction.delete(tutorEducationRecords).where(eq(tutorEducationRecords.tutorId, tutorId));
      if (input.educationRecords.length > 0) {
        await transaction.insert(tutorEducationRecords).values(input.educationRecords.map(record => ({
          tutorId,
          qualificationLevel: record.qualificationLevel,
          instituteName: record.instituteName,
          degreeExamTitle: record.degreeExamTitle,
          majorGroup: record.majorGroup,
          resultGpa: record.resultGpa ?? null,
          curriculum: record.curriculum ?? null,
          studyStartYear: record.studyStartYear,
          studyEndYear: record.studyEndYear ?? null,
          currentlyStudying: record.currentlyStudying ? 1 : 0,
          instituteIdCardNumber: record.instituteIdCardNumber ?? null,
        })));
      }
    }

    async function replaceSelections<T extends { tutorId: string }>(table: any, values: T[] | undefined) {
      if (values === undefined) return;
      await transaction.delete(table).where(eq(table.tutorId, tutorId));
      if (values.length > 0) await transaction.insert(table).values(values);
    }

    await replaceSelections(tutorTeachingAreas, input.teachingAreaIds?.map(locationId => ({ tutorId, locationId })));
    if (input.primarySubjectIds !== undefined || input.additionalSubjectIds !== undefined) {
      const existingSubjectSelections = await transaction
        .select()
        .from(tutorSubjects)
        .where(eq(tutorSubjects.tutorId, tutorId));
      const primarySubjectIds = input.primarySubjectIds ?? existingSubjectSelections
        .filter((selection: typeof tutorSubjects.$inferSelect) => selection.selectionType === "primary")
        .map((selection: typeof tutorSubjects.$inferSelect) => selection.subjectId);
      const additionalSubjectIds = input.additionalSubjectIds ?? existingSubjectSelections
        .filter((selection: typeof tutorSubjects.$inferSelect) => selection.selectionType === "additional")
        .map((selection: typeof tutorSubjects.$inferSelect) => selection.subjectId);
      await transaction.delete(tutorSubjects).where(eq(tutorSubjects.tutorId, tutorId));
      const selections = [
        ...primarySubjectIds.map(subjectId => ({ tutorId, subjectId, selectionType: "primary" as const })),
        ...additionalSubjectIds.map(subjectId => ({ tutorId, subjectId, selectionType: "additional" as const })),
      ];
      if (selections.length > 0) await transaction.insert(tutorSubjects).values(selections);
    }
    await replaceSelections(tutorClassLevels, input.classLevelIds?.map(classLevelId => ({ tutorId, classLevelId })));
    await replaceSelections(tutorCurricula, input.curriculumIds?.map(curriculumId => ({ tutorId, curriculumId })));
    await replaceSelections(tutorStudentTypes, input.studentTypeIds?.map(studentTypeId => ({ tutorId, studentTypeId })));
    await replaceSelections(tutorPreferredClassSizes, input.preferredClassSizes?.map(classSize => ({ tutorId, classSize })));
    await replaceSelections(tutorPreferredTeachingDays, input.preferredTeachingDays?.map(dayOfWeek => ({ tutorId, dayOfWeek })));
    await replaceSelections(tutorPreferredTimeSlots, input.preferredTimeSlots?.map(timeSlot => ({ tutorId, timeSlot })));
    await replaceSelections(tutorTeachingLanguages, input.teachingLanguageIds?.map(languageId => ({ tutorId, languageId })));
    await replaceSelections(tutorCommunicationPreferences, input.communicationPreferences?.map(channel => ({ tutorId, channel })));
  });

  return getTutorProfileByUserId(userId);
}

export async function submitTutorProfile(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  await db.transaction(async transaction => {
    const profile = await loadTutorProfileOwner(transaction, userId);
    if (!profile) throw new Error("Tutor Profile was not found.");
    if (profile.profileStatus !== "draft" && profile.profileStatus !== "changes_requested") {
      throw new TutorProfileStateError("Only a draft or changes-requested Tutor Profile can be submitted for review.");
    }
    const editableProfile = {
      profilePhotoKey: profile.profilePhotoKey,
      name: profile.name,
      gender: profile.gender,
      dateOfBirth: profile.dateOfBirth,
      headline: profile.headline,
      phone: profile.phone,
      contactEmail: profile.contactEmail,
      currentLocationId: profile.currentLocationId,
      teachingAreaIds: profile.teachingAreaIds,
      availableNationwide: profile.availableNationwide,
      highestEducation: profile.highestEducation,
      universityId: profile.universityId,
      facultyDepartmentId: profile.facultyDepartmentId,
      degreeMajorId: profile.degreeMajorId,
      degreeExamTitle: profile.degreeExamTitle,
      resultGpa: profile.resultGpa,
      deptId: profile.deptId,
      studyStatus: profile.studyStatus,
      yearSemester: profile.yearSemester,
      graduationYear: profile.graduationYear,
      primarySubjectIds: profile.primarySubjectIds,
      additionalSubjectIds: profile.additionalSubjectIds,
      classLevelIds: profile.classLevelIds,
      curriculumIds: profile.curriculumIds,
      teachingExperienceYears: profile.teachingExperienceYears,
      priorTeachingExperience: profile.priorTeachingExperience,
      specialExpertise: profile.specialExpertise,
      studentTypeIds: profile.studentTypeIds,
      academicAchievement: profile.academicAchievement,
      tuitionType: profile.tuitionType,
      preferredStudentGender: profile.preferredStudentGender,
      preferredClassSizes: profile.preferredClassSizes,
      preferredTeachingDays: profile.preferredTeachingDays,
      preferredTimeSlots: profile.preferredTimeSlots,
      feeMin: profile.feeMin,
      feeMax: profile.feeMax,
      travelDistanceKm: profile.travelDistanceKm,
      teachingLanguageIds: profile.teachingLanguageIds,
      communicationPreferences: profile.communicationPreferences,
      aboutMe: profile.aboutMe,
      teachingApproach: profile.teachingApproach,
      whyChooseMe: profile.whyChooseMe,
      additionalNotes: profile.additionalNotes,
      privateDetails: profile.privateDetails,
      educationRecords: profile.educationRecords,
      universityIdDocumentStatus: profile.universityIdDocumentStatus,
    };
    const parsed = tutorProfileSubmissionSchema.safeParse(editableProfile);
    if (!parsed.success) {
      throw new TutorProfileValidationError(parsed.error.issues.map(issue => ({ path: issue.path.map(String), message: issue.message })));
    }
    await assertCatalogReferences(transaction, parsed.data);
    await transaction.update(tutors).set({ profileStatus: "pending" }).where(eq(tutors.id, profile.tutorId));
  });

  return getTutorProfileByUserId(userId);
}

export type CatalogSearchInput = { query?: string; limit: number };

function catalogSearchPattern(query?: string) {
  const value = query?.trim();
  return value ? `%${value}%` : undefined;
}

export async function searchUniversities(input: CatalogSearchInput) {
  const db = await getDb();
  if (!db) return [];
  const pattern = catalogSearchPattern(input.query);
  return db
    .select({ id: universities.id, name: universities.name })
    .from(universities)
    .where(pattern ? and(eq(universities.active, 1), like(universities.name, pattern)) : eq(universities.active, 1))
    .orderBy(asc(universities.sortOrder), asc(universities.name))
    .limit(input.limit);
}

/** Department / Subject is one flat global list — no Institute/Faculty parent. */
export async function searchFacultyDepartments(input: CatalogSearchInput) {
  const db = await getDb();
  if (!db) return [];
  const pattern = catalogSearchPattern(input.query);
  return db
    .select({ id: facultyDepartments.id, name: facultyDepartments.name })
    .from(facultyDepartments)
    .where(pattern ? and(eq(facultyDepartments.active, 1), like(facultyDepartments.name, pattern)) : eq(facultyDepartments.active, 1))
    .orderBy(asc(facultyDepartments.sortOrder), asc(facultyDepartments.name))
    .limit(input.limit);
}

export async function searchDegreeMajors(facultyDepartmentId: number, input: CatalogSearchInput) {
  const db = await getDb();
  if (!db) return [];
  const pattern = catalogSearchPattern(input.query);
  return db
    .select({ id: degreeMajors.id, facultyDepartmentId: degreeMajors.facultyDepartmentId, name: degreeMajors.name })
    .from(degreeMajors)
    .where(pattern ? and(eq(degreeMajors.active, 1), eq(degreeMajors.facultyDepartmentId, facultyDepartmentId), like(degreeMajors.name, pattern)) : and(eq(degreeMajors.active, 1), eq(degreeMajors.facultyDepartmentId, facultyDepartmentId)))
    .orderBy(asc(degreeMajors.sortOrder), asc(degreeMajors.name))
    .limit(input.limit);
}

async function searchControlledCatalog(table: any, input: CatalogSearchInput) {
  const db = await getDb();
  if (!db) return [];
  const pattern = catalogSearchPattern(input.query);
  return db
    .select({ id: table.id, name: table.name })
    .from(table)
    .where(pattern ? and(eq(table.active, 1), like(table.name, pattern)) : eq(table.active, 1))
    .orderBy(asc(table.sortOrder), asc(table.name))
    .limit(input.limit);
}

export const searchSubjects = (input: CatalogSearchInput) => searchControlledCatalog(subjectsCatalog, input);
export const searchClassLevels = (input: CatalogSearchInput) => searchControlledCatalog(classLevels, input);
export const searchCurricula = (input: CatalogSearchInput) => searchControlledCatalog(curricula, input);
export const searchStudentTypes = (input: CatalogSearchInput) => searchControlledCatalog(studentTypes, input);
export const searchLanguages = (input: CatalogSearchInput) => searchControlledCatalog(languagesCatalog, input);

type BangladeshLocationCatalogType = "city" | "division" | "district" | "thana" | "upazila" | "subdivision" | "area";
type BangladeshLocationSearchInput = CatalogSearchInput & {
  types?: BangladeshLocationCatalogType[];
  ids?: string[];
  parentId?: string;
};

export type BangladeshLocationCatalogRow = { id: string; label: string; type: BangladeshLocationCatalogType | "country"; parentId: string | null };

export function dedupeBangladeshLocationRows(rows: BangladeshLocationCatalogRow[]) {
  const seen = new Set<string>();
  return rows.filter(row => {
    const key = `${row.parentId ?? ""}|${row.type}|${row.label.trim().toLocaleLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchBangladeshLocations(input: BangladeshLocationSearchInput) {
  const db = await getDb();
  if (!db) return [];
  const pattern = catalogSearchPattern(input.query);
  const filters = [eq(locations.enabled, 1), eq(locations.country, "Bangladesh")];
  if (input.types?.length) filters.push(inArray(locations.type, input.types));
  if (input.parentId) filters.push(eq(locations.parentId, input.parentId));
  // Persisted selections must resolve by their stable identifier, regardless of
  // the searchable label text. This keeps migrated Tutor Profile drafts visible.
  if (input.ids?.length) filters.push(inArray(locations.id, input.ids));
  else if (pattern) filters.push(like(locations.label, pattern));
  const rows = await db
    .select({ id: locations.id, label: locations.label, type: locations.type, parentId: locations.parentId })
    .from(locations)
    .where(and(...filters))
    .orderBy(asc(locations.label), asc(locations.id))
    .limit(input.limit * 3);
  if (input.ids?.length) return rows.slice(0, input.limit);
  return dedupeBangladeshLocationRows(rows).slice(0, input.limit);
}

/** Public registration catalog: a City's direct Thana/Upazila records and their Area/Sub-area children in one safe result set. */
export async function searchRegistrationCityLocations(input: { cityId: string; query: string; limit: number }) {
  const db = await getDb();
  if (!db) return [];
  const city = (await db.select({ id: locations.id }).from(locations).where(and(eq(locations.id, input.cityId), eq(locations.type, "city"), eq(locations.country, "Bangladesh"), eq(locations.enabled, 1))).limit(1))[0];
  if (!city) return [];

  const parents = await db
    .select({ id: locations.id, label: locations.label, type: locations.type, parentId: locations.parentId })
    .from(locations)
    .where(and(eq(locations.parentId, city.id), eq(locations.country, "Bangladesh"), eq(locations.enabled, 1), inArray(locations.type, ["thana", "upazila", "subdivision", "area"])))
    .orderBy(asc(locations.label), asc(locations.id));
  const parentIds = parents.map(parent => parent.id);
  const children = parentIds.length
    ? await db
      .select({ id: locations.id, label: locations.label, type: locations.type, parentId: locations.parentId })
      .from(locations)
      .where(and(inArray(locations.parentId, parentIds), eq(locations.country, "Bangladesh"), eq(locations.enabled, 1), inArray(locations.type, ["subdivision", "area"])))
      .orderBy(asc(locations.label), asc(locations.id))
    : [];
  const query = input.query.trim().toLocaleLowerCase();
  return buildCombinedCityLocationOptions(city.id, [...parents, ...children] as RegistrationLocationRow[])
    .filter(option => !query || option.label.toLocaleLowerCase().includes(query))
    .slice(0, input.limit);
}

export async function getTutorDashboardStats(userId: number) {
  const profile = await getTutorProfileByUserId(userId);
  const tutorRegistration = await getTutorRegistrationByUserId(userId);
  return {
    profileExists: Boolean(profile),
    profileStatus: profile?.profileStatus ?? "draft",
    isVerified: Boolean(profile?.verified),
    tutorRegistration: tutorRegistration
      ? { tutorNumber: tutorRegistration.tutorNumber, registeredAt: tutorRegistration.registeredAt }
      : null,
  } as const;
}

export async function createTutorRequest(request: InsertTutorRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(tutorRequests).values(request);
  return { id: Number(result[0].insertId) };
}

/** Returns only a Guardian's own request data; no account contact information is joined. */
export async function listGuardianTutorRequests(userId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const requests = await database
    .select({
      id: tutorRequests.id,
      tuitionType: tutorRequests.tuitionType,
      category: tutorRequests.category,
      classCourse: tutorRequests.classCourse,
      subjects: tutorRequests.subjects,
      daysPerWeek: tutorRequests.daysPerWeek,
      preferredGender: tutorRequests.preferredGender,
      studentFirstName: tutorRequests.studentFirstName,
      studentGender: tutorRequests.studentGender,
      addressDetails: tutorRequests.addressDetails,
      curriculumType: tutorRequests.curriculumType,
      groupCapacity: tutorRequests.groupCapacity,
      packageDurationMonths: tutorRequests.packageDurationMonths,
      studentCount: tutorRequests.studentCount,
      tuitionCityLocationId: tutorRequests.tuitionCityLocationId,
      tuitionLocationId: tutorRequests.tuitionLocationId,
      tuitionLocationLabel: tutorRequests.tuitionLocationLabel,
      budgetAmount: tutorRequests.budgetAmount,
      notes: tutorRequests.notes,
      status: tutorRequests.status,
      publicationState: tutorRequests.publicationState,
      tutorId: tutorRequests.tutorId,
      contactConsent: tutorRequests.contactConsent,
      appointmentConfirmedAt: tutorRequests.appointmentConfirmedAt,
      cancellationReason: tutorRequests.cancellationReason,
      createdAt: tutorRequests.createdAt,
    })
    .from(tutorRequests)
    .where(eq(tutorRequests.guardianUserId, userId))
    .orderBy(desc(tutorRequests.createdAt));

  return requests.map(request => ({
    ...request,
    lifecycle: getGuardianRequestLifecycle(request),
    nextAction: request.status === "matched" && request.contactConsent === "pending"
      ? "decide_contact_consent" as const
      : "none" as const,
  }));
}

export async function listGuardianNotifications(input: {
  guardianUserId: number;
  limit: number;
  cursor?: number;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const conditions = [eq(guardianRequestNotifications.guardianUserId, input.guardianUserId)];
  if (input.cursor) conditions.push(lte(guardianRequestNotifications.id, input.cursor - 1));
  const rows = await database
    .select({
      id: guardianRequestNotifications.id,
      requestId: guardianRequestNotifications.tutorRequestId,
      type: guardianRequestNotifications.type,
      followUpKind: guardianRequestNotifications.followUpKind,
      title: guardianRequestNotifications.title,
      message: guardianRequestNotifications.message,
      actionPath: guardianRequestNotifications.actionPath,
      readAt: guardianRequestNotifications.readAt,
      createdAt: guardianRequestNotifications.createdAt,
    })
    .from(guardianRequestNotifications)
    .where(and(...conditions))
    .orderBy(desc(guardianRequestNotifications.id))
    .limit(input.limit + 1);
  const hasNextPage = rows.length > input.limit;
  const items = hasNextPage ? rows.slice(0, input.limit) : rows;
  return { items, nextCursor: hasNextPage ? items.at(-1)?.id ?? null : null };
}

export async function getGuardianNotificationUnreadCount(input: { guardianUserId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [row] = await database
    .select({ unreadCount: count() })
    .from(guardianRequestNotifications)
    .where(and(eq(guardianRequestNotifications.guardianUserId, input.guardianUserId), isNull(guardianRequestNotifications.readAt)));
  return { unreadCount: Number(row?.unreadCount ?? 0) };
}

export async function markGuardianNotificationRead(input: { guardianUserId: number; notificationId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const result = await database
    .update(guardianRequestNotifications)
    .set({ readAt: new Date() })
    .where(and(
      eq(guardianRequestNotifications.id, input.notificationId),
      eq(guardianRequestNotifications.guardianUserId, input.guardianUserId),
      isNull(guardianRequestNotifications.readAt),
    ));
  return { updated: Boolean(result[0].affectedRows) };
}

export async function markAllGuardianNotificationsRead(input: { guardianUserId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const result = await database
    .update(guardianRequestNotifications)
    .set({ readAt: new Date() })
    .where(and(eq(guardianRequestNotifications.guardianUserId, input.guardianUserId), isNull(guardianRequestNotifications.readAt)));
  return { updatedCount: Number(result[0].affectedRows ?? 0) };
}

async function createGuardianNotification(input: {
  guardianUserId: number;
  requestId: number;
  type: "lifecycle" | "follow_up" | "confirmation_letter_issued";
  title: string;
  message: string;
  actionPath: string;
  deduplicationKey: string;
  followUpKind?: GuardianRequestFollowUpKind;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const result = await database.insert(guardianRequestNotifications).values({
    guardianUserId: input.guardianUserId,
    tutorRequestId: input.requestId,
    type: input.type,
    followUpKind: input.followUpKind,
    title: input.title,
    message: input.message,
    actionPath: input.actionPath,
    deduplicationKey: input.deduplicationKey,
  }).onDuplicateKeyUpdate({ set: { deduplicationKey: input.deduplicationKey } });
  return { created: Boolean(result[0].insertId), notificationId: Number(result[0].insertId ?? 0) };
}

export async function createGuardianRequestFollowUp(input: {
  requestId: number;
  adminUserId: number;
  kind: GuardianRequestFollowUpKind;
  message: string;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [request] = await database
    .select({ guardianUserId: tutorRequests.guardianUserId })
    .from(tutorRequests)
    .where(eq(tutorRequests.id, input.requestId))
    .limit(1);
  if (!request) return { created: false as const, notificationId: null };
  const result = await createGuardianNotification({
    guardianUserId: request.guardianUserId,
    requestId: input.requestId,
    type: "follow_up",
    followUpKind: input.kind,
    title: "Action needed for your tutor request",
    message: input.message,
    actionPath: `/guardian/dashboard/posted-jobs/${input.requestId}`,
    deduplicationKey: `follow-up:${input.requestId}:${input.kind}:${input.message.trim().toLowerCase()}`,
  });
  return { created: result.created, notificationId: result.notificationId || null };
}

export async function addTutorRequestAssignmentNote(input: {
  requestId: number;
  adminUserId: number;
  category: TutorRequestAssignmentNoteCategory;
  body: string;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [request] = await database.select({ id: tutorRequests.id }).from(tutorRequests).where(eq(tutorRequests.id, input.requestId)).limit(1);
  if (!request) return { created: false as const, id: null };
  const result = await database.insert(tutorRequestAssignmentNotes).values({
    tutorRequestId: input.requestId,
    adminUserId: input.adminUserId,
    category: input.category,
    body: input.body.trim(),
  });
  await database.update(tutorRequests).set({ lastActivityAt: new Date() }).where(eq(tutorRequests.id, input.requestId));
  return { created: true as const, id: Number(result[0].insertId) };
}

export async function listTutorRequestAssignmentNotes(input: { requestId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database
    .select({
      id: tutorRequestAssignmentNotes.id,
      category: tutorRequestAssignmentNotes.category,
      body: tutorRequestAssignmentNotes.body,
      createdAt: tutorRequestAssignmentNotes.createdAt,
      adminUserId: tutorRequestAssignmentNotes.adminUserId,
      adminName: users.name,
    })
    .from(tutorRequestAssignmentNotes)
    .leftJoin(users, eq(tutorRequestAssignmentNotes.adminUserId, users.id))
    .where(eq(tutorRequestAssignmentNotes.tutorRequestId, input.requestId))
    .orderBy(desc(tutorRequestAssignmentNotes.id));
}

type ConfirmationLetterSnapshot = Omit<ConfirmationLetterDocument, "letterNumber" | "version" | "issuedAt"> & {
  schemaVersion: 1;
};

function parseRequestSubjects(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((subject): subject is string => typeof subject === "string") : [];
  } catch {
    return value ? [value] : [];
  }
}

function parseConfirmationLetterSnapshot(value: string): ConfirmationLetterSnapshot {
  const parsed = JSON.parse(value) as Partial<ConfirmationLetterSnapshot>;
  if (parsed.schemaVersion !== 1 || typeof parsed.requestId !== "number" || typeof parsed.tutorReference !== "string") {
    throw new Error("Confirmation letter snapshot is invalid");
  }
  return parsed as ConfirmationLetterSnapshot;
}

function nextConfirmationLetterNumber(requestId: number, version: number) {
  return `CTB-${new Date().getUTCFullYear()}-${String(requestId).padStart(6, "0")}-V${version}`;
}

/** Creates one private draft only when the authoritative request has an Admin-confirmed Tutor appointment. */
export async function createConfirmationLetterDraft(input: { requestId: number; adminUserId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database.transaction(async tx => {
    const [request] = await tx
      .select({
        id: tutorRequests.id,
        guardianUserId: tutorRequests.guardianUserId,
        tutorId: tutorRequests.tutorId,
        appointmentConfirmedAt: tutorRequests.appointmentConfirmedAt,
        status: tutorRequests.status,
        category: tutorRequests.category,
        curriculumType: tutorRequests.curriculumType,
        classCourse: tutorRequests.classCourse,
        subjects: tutorRequests.subjects,
        tuitionType: tutorRequests.tuitionType,
        daysPerWeek: tutorRequests.daysPerWeek,
        packageDurationMonths: tutorRequests.packageDurationMonths,
        tutorName: tutors.name,
      })
      .from(tutorRequests)
      .innerJoin(tutors, eq(tutorRequests.tutorId, tutors.id))
      .where(and(
        eq(tutorRequests.id, input.requestId),
        eq(tutorRequests.status, "matched"),
        isNotNull(tutorRequests.appointmentConfirmedAt),
      ))
      .limit(1)
      .for("update");
    if (!request?.tutorId || !request.appointmentConfirmedAt) return { created: false as const, reason: "not-confirmed" as const, letterId: null };

    const [existingDraft] = await tx.select({ id: confirmationLetters.id })
      .from(confirmationLetters)
      .where(and(eq(confirmationLetters.tutorRequestId, request.id), eq(confirmationLetters.status, "draft")))
      .limit(1)
      .for("update");
    if (existingDraft) return { created: false as const, reason: "draft-exists" as const, letterId: existingDraft.id, status: "draft" as const };

    const [latestVersion] = await tx.select({ version: confirmationLetters.version })
      .from(confirmationLetters)
      .where(eq(confirmationLetters.tutorRequestId, request.id))
      .orderBy(desc(confirmationLetters.version))
      .limit(1)
      .for("update");
    const version = (latestVersion?.version ?? 0) + 1;
    const snapshot: ConfirmationLetterSnapshot = {
      schemaVersion: 1,
      requestId: request.id,
      tutorReference: request.tutorId,
      tutorName: request.tutorName,
      category: request.category,
      curriculumType: request.curriculumType,
      classCourse: request.classCourse,
      subjects: parseRequestSubjects(request.subjects),
      tuitionType: request.tuitionType,
      daysPerWeek: request.daysPerWeek,
      agreedStartDate: "",
      agreedFeeMinimum: null,
      agreedFeeMaximum: null,
      packageDurationMonths: request.packageDurationMonths,
    };
    const result = await tx.insert(confirmationLetters).values({
      tutorRequestId: request.id,
      guardianUserId: request.guardianUserId,
      tutorId: request.tutorId,
      createdByAdminUserId: input.adminUserId,
      status: "draft",
      letterNumber: nextConfirmationLetterNumber(request.id, version),
      version,
      contentSnapshot: JSON.stringify(snapshot),
    });
    await tx.update(tutorRequests).set({ lastActivityAt: new Date() }).where(eq(tutorRequests.id, request.id));
    return { created: true as const, letterId: Number(result[0].insertId), status: "draft" as const };
  });
}

/** Issues a reviewed draft as an immutable PDF and creates private Guardian/Tutor notifications. */
export async function issueConfirmationLetter(input: {
  letterId: number;
  adminUserId: number;
  agreedStartDate: string;
  agreedFeeMinimum: number;
  agreedFeeMaximum: number;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [draft] = await database.select({
    id: confirmationLetters.id,
    tutorRequestId: confirmationLetters.tutorRequestId,
    guardianUserId: confirmationLetters.guardianUserId,
    tutorId: confirmationLetters.tutorId,
    status: confirmationLetters.status,
    letterNumber: confirmationLetters.letterNumber,
    version: confirmationLetters.version,
    contentSnapshot: confirmationLetters.contentSnapshot,
  }).from(confirmationLetters).where(and(eq(confirmationLetters.id, input.letterId), eq(confirmationLetters.status, "draft"))).limit(1);
  if (!draft) return { issued: false as const, reason: "draft-unavailable" as const, letterId: input.letterId };

  const snapshot = parseConfirmationLetterSnapshot(draft.contentSnapshot);
  const issuedAt = new Date();
  const agreedStartDate = new Date(`${input.agreedStartDate}T00:00:00.000Z`);
  const document: ConfirmationLetterDocument = {
    ...snapshot,
    letterNumber: draft.letterNumber,
    version: draft.version,
    issuedAt,
    agreedStartDate: input.agreedStartDate,
    agreedFeeMinimum: input.agreedFeeMinimum,
    agreedFeeMaximum: input.agreedFeeMaximum,
  };
  const pdf = await renderConfirmationLetterPdf(document);
  const uploaded = await storagePut(`confirmation-letters/request-${draft.tutorRequestId}/${draft.letterNumber}.pdf`, pdf, "application/pdf");
  const issuedSnapshot = JSON.stringify({ ...snapshot, agreedStartDate: input.agreedStartDate, agreedFeeMinimum: input.agreedFeeMinimum, agreedFeeMaximum: input.agreedFeeMaximum });

  return database.transaction(async tx => {
    const result = await tx.update(confirmationLetters).set({
      status: "issued",
      issuedByAdminUserId: input.adminUserId,
      agreedStartDate,
      agreedFeeMinimum: input.agreedFeeMinimum,
      agreedFeeMaximum: input.agreedFeeMaximum,
      contentSnapshot: issuedSnapshot,
      pdfStorageKey: uploaded.key,
      reviewedAt: issuedAt,
      issuedAt,
    }).where(and(eq(confirmationLetters.id, draft.id), eq(confirmationLetters.status, "draft")));
    if (!result[0].affectedRows) return { issued: false as const, reason: "draft-unavailable" as const, letterId: input.letterId };
    await tx.insert(guardianRequestNotifications).values({
      guardianUserId: draft.guardianUserId,
      tutorRequestId: draft.tutorRequestId,
      type: "confirmation_letter_issued",
      title: "Your confirmation letter is ready",
      message: "Your approved tutor-match confirmation letter is available in your dashboard.",
      actionPath: "/guardian/dashboard/confirmation-letter",
      deduplicationKey: `confirmation-letter:${draft.id}:guardian-issued`,
    }).onDuplicateKeyUpdate({ set: { deduplicationKey: `confirmation-letter:${draft.id}:guardian-issued` } });
    await tx.insert(tutorConfirmationLetterNotifications).values({
      tutorId: draft.tutorId,
      confirmationLetterId: draft.id,
      title: "Your confirmation letter is ready",
      message: "An approved tutor-match confirmation letter is available in your dashboard.",
      actionPath: "/tutor/dashboard/confirmation-letter",
      deduplicationKey: `confirmation-letter:${draft.id}:tutor-issued`,
    }).onDuplicateKeyUpdate({ set: { deduplicationKey: `confirmation-letter:${draft.id}:tutor-issued` } });
    await tx.update(tutorRequests).set({ lastActivityAt: issuedAt }).where(eq(tutorRequests.id, draft.tutorRequestId));
    return { issued: true as const, letterId: draft.id, status: "issued" as const };
  });
}

export async function listConfirmationLettersForGuardian(input: { guardianUserId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database.select({
    id: confirmationLetters.id,
    letterNumber: confirmationLetters.letterNumber,
    version: confirmationLetters.version,
    status: confirmationLetters.status,
    contentSnapshot: confirmationLetters.contentSnapshot,
    issuedAt: confirmationLetters.issuedAt,
    supersededAt: confirmationLetters.supersededAt,
  }).from(confirmationLetters).where(eq(confirmationLetters.guardianUserId, input.guardianUserId)).orderBy(desc(confirmationLetters.id));
}

export async function listConfirmationLettersForTutor(input: { tutorUserId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database.select({
    id: confirmationLetters.id,
    letterNumber: confirmationLetters.letterNumber,
    version: confirmationLetters.version,
    status: confirmationLetters.status,
    contentSnapshot: confirmationLetters.contentSnapshot,
    issuedAt: confirmationLetters.issuedAt,
    supersededAt: confirmationLetters.supersededAt,
  }).from(confirmationLetters)
    .innerJoin(tutors, eq(confirmationLetters.tutorId, tutors.id))
    .where(eq(tutors.userId, input.tutorUserId))
    .orderBy(desc(confirmationLetters.id));
}

export async function getConfirmationLetterRecipientDownload(input: { letterId: number; recipient: { role: "guardian" | "tutor"; userId: number } }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [letter] = await database.select({
    id: confirmationLetters.id,
    guardianUserId: confirmationLetters.guardianUserId,
    tutorId: confirmationLetters.tutorId,
    tutorUserId: tutors.userId,
    status: confirmationLetters.status,
    pdfStorageKey: confirmationLetters.pdfStorageKey,
  }).from(confirmationLetters)
    .innerJoin(tutors, eq(confirmationLetters.tutorId, tutors.id))
    .where(eq(confirmationLetters.id, input.letterId))
    .limit(1);
  const allowed = letter && letter.status === "issued" && letter.pdfStorageKey && (
    input.recipient.role === "guardian"
      ? letter.guardianUserId === input.recipient.userId
      : letter.tutorUserId === input.recipient.userId
  );
  if (!allowed || !letter?.pdfStorageKey) return null;
  return { letterId: letter.id, downloadUrl: await storageGetSignedUrl(letter.pdfStorageKey) };
}

/** Updates a Guardian-owned request only while it remains in the initial Pending stage. */
export async function updateGuardianTutorRequest(input: {
  guardianUserId: number;
  requestId: number;
  tuitionType: "home" | "online" | "both" | "group" | "package";
  category: string;
  curriculumType: string | null;
  classCourse: string;
  subjects: string;
  groupCapacity: number | null;
  packageDurationMonths: number | null;
  studentCount: number | null;
  daysPerWeek: number;
  preferredGender: "male" | "female" | "any";
  studentFirstName: string | null;
  studentGender: "male" | "female" | null;
  addressDetails: string | null;
  tuitionCityLocationId: string | null;
  tuitionLocationId: string | null;
  tuitionLocationLabel: string | null;
  budgetAmount: number | null;
  notes: string | null;
  monthlyBudget: number | null;
  locationText: string;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database.transaction(async tx => {
    const [request] = await tx
      .select({ id: tutorRequests.id })
      .from(tutorRequests)
      .where(and(
        eq(tutorRequests.id, input.requestId),
        eq(tutorRequests.guardianUserId, input.guardianUserId),
        eq(tutorRequests.status, "new"),
        eq(tutorRequests.publicationState, "submitted"),
      ))
      .limit(1)
      .for("update");
    if (!request) return { updated: false as const, lifecycle: "pending" as const };

    await tx.update(tutorRequests).set({
      tuitionType: input.tuitionType,
      category: input.category,
      curriculumType: input.curriculumType,
      classCourse: input.classCourse,
      subjects: input.subjects,
      groupCapacity: input.groupCapacity,
      packageDurationMonths: input.packageDurationMonths,
      studentCount: input.studentCount,
      daysPerWeek: input.daysPerWeek,
      preferredGender: input.preferredGender,
      studentFirstName: input.studentFirstName,
      studentGender: input.studentGender,
      addressDetails: input.addressDetails,
      tuitionCityLocationId: input.tuitionCityLocationId,
      tuitionLocationId: input.tuitionLocationId,
      tuitionLocationLabel: input.tuitionLocationLabel,
      budgetAmount: input.budgetAmount,
      notes: input.notes,
      monthlyBudget: input.monthlyBudget,
      locationText: input.locationText,
      lastActivityAt: new Date(),
    }).where(eq(tutorRequests.id, request.id));
    await tx.insert(tutorRequestOperationEvents).values({
      tutorRequestId: request.id,
      guardianUserId: input.guardianUserId,
      actorUserId: input.guardianUserId,
      action: "guardian_updated",
      changedFields: JSON.stringify(["guardian_pending_update"]),
    });
    return { updated: true as const, lifecycle: "pending" as const };
  });
}

/** Finalizes an Admin-verified appointment only after a Tutor has been assigned. */
export async function confirmTutorRequestAppointment(input: { requestId: number; adminUserId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const now = new Date();
  return database.transaction(async tx => {
    const result = await tx.update(tutorRequests).set({ appointmentConfirmedAt: now, contactConsent: "approved", lastActivityAt: now })
      .where(and(eq(tutorRequests.id, input.requestId), eq(tutorRequests.status, "matched"), isNotNull(tutorRequests.tutorId), isNull(tutorRequests.appointmentConfirmedAt)));
    if (!result[0].affectedRows) return { updated: false as const, lifecycle: "confirmed" as const };
    const [request] = await tx.select({ guardianUserId: tutorRequests.guardianUserId }).from(tutorRequests).where(eq(tutorRequests.id, input.requestId)).limit(1);
    await tx.insert(tutorRequestOperationEvents).values({ tutorRequestId: input.requestId, guardianUserId: request.guardianUserId, actorUserId: input.adminUserId, action: "admin_confirmed", changedFields: JSON.stringify(["appointment_confirmed"]) });
    await tx.insert(guardianRequestNotifications).values({
      guardianUserId: request.guardianUserId,
      tutorRequestId: input.requestId,
      type: "lifecycle",
      title: "Your tutor match is confirmed",
      message: "An Admin has confirmed the selected Tutor for your request.",
      actionPath: `/guardian/dashboard/posted-jobs/${input.requestId}`,
      deduplicationKey: `lifecycle:${input.requestId}:confirmed`,
    }).onDuplicateKeyUpdate({ set: { deduplicationKey: `lifecycle:${input.requestId}:confirmed` } });
    return { updated: true as const, lifecycle: "confirmed" as const };
  });
}

/** Closes any active request with an Admin-supplied private reason and removes its public projection. */
export async function cancelTutorRequest(input: { requestId: number; adminUserId: number; reason: string }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database.transaction(async tx => {
    const [request] = await tx.select({ guardianUserId: tutorRequests.guardianUserId }).from(tutorRequests)
      .where(and(eq(tutorRequests.id, input.requestId), inArray(tutorRequests.status, ["new", "reviewing", "matched"]))).limit(1).for("update");
    if (!request) return { updated: false as const, lifecycle: "cancelled" as const };
    const cancelledAt = new Date();
    await tx.update(tutorRequests).set({ status: "closed", publicationState: "closed", contactConsent: "not_required", cancellationReason: input.reason, lastActivityAt: cancelledAt }).where(eq(tutorRequests.id, input.requestId));
    await tx.update(tutorJobs).set({ publicationStatus: "closed", deactivatedAt: new Date() }).where(eq(tutorJobs.tutorRequestId, input.requestId));
    const supersededLetters = await tx.update(confirmationLetters)
      .set({ status: "superseded", supersededAt: cancelledAt, revisionReason: "Request cancelled by Admin" })
      .where(and(
        eq(confirmationLetters.tutorRequestId, input.requestId),
        inArray(confirmationLetters.status, ["draft", "issued"]),
      ));
    await tx.insert(tutorRequestOperationEvents).values({
      tutorRequestId: input.requestId,
      guardianUserId: request.guardianUserId,
      actorUserId: input.adminUserId,
      action: "admin_cancelled",
      changedFields: JSON.stringify([
        "cancelled",
        "reason_recorded",
        ...(supersededLetters[0].affectedRows ? ["confirmation_letter_superseded"] : []),
      ]),
    });
    await tx.insert(guardianRequestNotifications).values({
      guardianUserId: request.guardianUserId,
      tutorRequestId: input.requestId,
      type: "lifecycle",
      title: "Your tutor request has been cancelled",
      message: "An Admin has closed this request. You can view the private reason in your request details.",
      actionPath: `/guardian/dashboard/posted-jobs/${input.requestId}`,
      deduplicationKey: `lifecycle:${input.requestId}:cancelled`,
    }).onDuplicateKeyUpdate({ set: { deduplicationKey: `lifecycle:${input.requestId}:cancelled` } });
    return { updated: true as const, lifecycle: "cancelled" as const };
  });
}

/** Saves a Guardian's explicit contact-coordination decision only for their matched, pending request. */
export async function decideGuardianTutorRequestContactConsent(input: {
  guardianUserId: number;
  requestId: number;
  decision: "approved" | "declined";
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const result = await database
    .update(tutorRequests)
    .set({ contactConsent: input.decision, lastActivityAt: new Date() })
    .where(and(
      eq(tutorRequests.id, input.requestId),
      eq(tutorRequests.guardianUserId, input.guardianUserId),
      eq(tutorRequests.status, "matched"),
      eq(tutorRequests.contactConsent, "pending"),
    ));
  return { saved: Boolean(result[0].affectedRows), decision: input.decision } as const;
}

export type AdminTutorRequestMatchingFilters = {
  query: string;
  status: "all" | "new" | "reviewing" | "matched" | "closed";
  lifecycle: "all" | "pending" | "live" | "appointed" | "confirmed" | "cancelled";
  tuitionType: "all" | "home" | "online" | "both" | "group" | "package";
  preferredGender: "all" | "male" | "female" | "any";
  contactConsent: "all" | "not_required" | "pending" | "approved" | "declined";
  subject: string;
  category: string;
  location: string;
  assignmentState: "all" | "assigned" | "unassigned";
  appointmentState: "all" | "confirmed" | "pending";
  cancellationState: "all" | "active" | "cancelled";
  budgetMinimum?: number;
  budgetMaximum?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  lastActivityAfter?: Date;
  lastActivityBefore?: Date;
  page: number;
  pageSize: number;
};

export class AdminMatchingSavedViewNameConflictError extends Error {
  constructor() {
    super("ADMIN_MATCHING_SAVED_VIEW_NAME_CONFLICT");
  }
}

/** Lists only the current Admin's personal filter presets, never matching results or private request data. */
export async function listAdminMatchingSavedViews(input: { adminUserId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const rows = await database
    .select({
      id: adminMatchingSavedViews.id,
      name: adminMatchingSavedViews.name,
      filters: adminMatchingSavedViews.filters,
      createdAt: adminMatchingSavedViews.createdAt,
      updatedAt: adminMatchingSavedViews.updatedAt,
      defaultSavedViewId: adminMatchingDefaultSavedViews.savedViewId,
    })
    .from(adminMatchingSavedViews)
    .leftJoin(adminMatchingDefaultSavedViews, and(
      eq(adminMatchingDefaultSavedViews.adminUserId, input.adminUserId),
      eq(adminMatchingDefaultSavedViews.savedViewId, adminMatchingSavedViews.id),
    ))
    .where(eq(adminMatchingSavedViews.adminUserId, input.adminUserId))
    .orderBy(desc(adminMatchingSavedViews.updatedAt), desc(adminMatchingSavedViews.id));

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    filters: parseAdminMatchingSavedViewFilters(row.filters),
    isDefault: row.defaultSavedViewId === row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

/** Creates a personal Saved View after normalizing the strict filter allowlist. */
export async function createAdminMatchingSavedView(input: {
  adminUserId: number;
  name: string;
  filters: unknown;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  try {
    const result = await database.insert(adminMatchingSavedViews).values({
      adminUserId: input.adminUserId,
      name: input.name.trim(),
      filters: JSON.stringify(sanitizeAdminMatchingSavedViewFilters(input.filters)),
    });
    return { created: true as const, id: Number(result[0].insertId) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
      ? error.code
      : "";
    if (code === "ER_DUP_ENTRY" || /duplicate entry/i.test(message)) {
      throw new AdminMatchingSavedViewNameConflictError();
    }
    throw error;
  }
}

/** Renames only the calling Admin's personal Saved View; filters and matching data are untouched. */
export async function renameAdminMatchingSavedView(input: {
  adminUserId: number;
  savedViewId: number;
  name: string;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const name = input.name.trim();
  try {
    const result = await database
      .update(adminMatchingSavedViews)
      .set({ name, updatedAt: new Date() })
      .where(and(
        eq(adminMatchingSavedViews.id, input.savedViewId),
        eq(adminMatchingSavedViews.adminUserId, input.adminUserId),
      ));
    if (!result[0].affectedRows) return { updated: false as const, savedViewId: null, name: null };
    return { updated: true as const, savedViewId: input.savedViewId, name };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
      ? error.code
      : "";
    if (code === "ER_DUP_ENTRY" || /duplicate entry/i.test(message)) {
      throw new AdminMatchingSavedViewNameConflictError();
    }
    throw error;
  }
}

/** Deletes only a Saved View that belongs to the calling Admin. */
export async function deleteAdminMatchingSavedView(input: { adminUserId: number; savedViewId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database.transaction(async tx => {
    await tx.delete(adminMatchingDefaultSavedViews).where(and(
      eq(adminMatchingDefaultSavedViews.adminUserId, input.adminUserId),
      eq(adminMatchingDefaultSavedViews.savedViewId, input.savedViewId),
    ));
    const result = await tx
      .delete(adminMatchingSavedViews)
      .where(and(
        eq(adminMatchingSavedViews.id, input.savedViewId),
        eq(adminMatchingSavedViews.adminUserId, input.adminUserId),
      ));
    return { deleted: Boolean(result[0].affectedRows) };
  });
}

/** Sets a personal Default Saved View after proving the selected view belongs to the calling Admin. */
export async function setAdminMatchingDefaultSavedView(input: { adminUserId: number; savedViewId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const ownedView = await database
    .select({ id: adminMatchingSavedViews.id })
    .from(adminMatchingSavedViews)
    .where(and(
      eq(adminMatchingSavedViews.id, input.savedViewId),
      eq(adminMatchingSavedViews.adminUserId, input.adminUserId),
    ))
    .limit(1);
  if (!ownedView[0]) return { updated: false as const, savedViewId: null };

  await database.insert(adminMatchingDefaultSavedViews)
    .values({ adminUserId: input.adminUserId, savedViewId: input.savedViewId })
    .onDuplicateKeyUpdate({ set: { savedViewId: input.savedViewId, updatedAt: new Date() } });
  return { updated: true as const, savedViewId: input.savedViewId };
}

/** Clears only the caller's personal Default Saved View pointer; Saved Views themselves remain untouched. */
export async function clearAdminMatchingDefaultSavedView(input: { adminUserId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  await database.delete(adminMatchingDefaultSavedViews)
    .where(eq(adminMatchingDefaultSavedViews.adminUserId, input.adminUserId));
  return { updated: true as const };
}

function getAdminTutorRequestFilterConditions(filters: AdminTutorRequestMatchingFilters) {
  const conditions: SQL[] = [];
  if (filters.status !== "all") conditions.push(eq(tutorRequests.status, filters.status));
  if (filters.lifecycle === "pending") conditions.push(and(eq(tutorRequests.status, "new"), eq(tutorRequests.publicationState, "submitted"), isNull(tutorRequests.tutorId))!);
  if (filters.lifecycle === "live") conditions.push(and(inArray(tutorRequests.status, ["new", "reviewing"]), eq(tutorRequests.publicationState, "published"), isNull(tutorRequests.tutorId))!);
  if (filters.lifecycle === "appointed") conditions.push(and(eq(tutorRequests.status, "matched"), isNotNull(tutorRequests.tutorId), isNull(tutorRequests.appointmentConfirmedAt))!);
  if (filters.lifecycle === "confirmed") conditions.push(and(eq(tutorRequests.status, "matched"), isNotNull(tutorRequests.appointmentConfirmedAt))!);
  if (filters.lifecycle === "cancelled") conditions.push(or(eq(tutorRequests.status, "closed"), eq(tutorRequests.publicationState, "closed"), isNotNull(tutorRequests.cancellationReason))!);
  if (filters.tuitionType !== "all") conditions.push(eq(tutorRequests.tuitionType, filters.tuitionType));
  if (filters.preferredGender !== "all") conditions.push(eq(tutorRequests.preferredGender, filters.preferredGender));
  if (filters.contactConsent !== "all") conditions.push(eq(tutorRequests.contactConsent, filters.contactConsent));
  if (filters.subject) conditions.push(like(tutorRequests.subjects, `%${filters.subject}%`));
  if (filters.category) conditions.push(eq(tutorRequests.category, filters.category));
  if (filters.location) conditions.push(or(like(tutorRequests.tuitionLocationLabel, `%${filters.location}%`), like(tutorRequests.locationText, `%${filters.location}%`))!);
  if (filters.assignmentState === "assigned") conditions.push(isNotNull(tutorRequests.tutorId));
  if (filters.assignmentState === "unassigned") conditions.push(isNull(tutorRequests.tutorId));
  if (filters.appointmentState === "confirmed") conditions.push(isNotNull(tutorRequests.appointmentConfirmedAt));
  if (filters.appointmentState === "pending") conditions.push(and(isNotNull(tutorRequests.tutorId), isNull(tutorRequests.appointmentConfirmedAt))!);
  if (filters.cancellationState === "cancelled") conditions.push(or(eq(tutorRequests.status, "closed"), eq(tutorRequests.publicationState, "closed"), isNotNull(tutorRequests.cancellationReason))!);
  if (filters.cancellationState === "active") conditions.push(and(inArray(tutorRequests.status, ["new", "reviewing", "matched"]), inArray(tutorRequests.publicationState, ["submitted", "reviewing", "changes_requested", "approved", "unpublished", "published"]), isNull(tutorRequests.cancellationReason))!);
  // The filter still has two bounds - "between 5,000 and 8,000" - but a request
  // now offers one figure rather than a range, so both bounds compare against
  // the same column. They used to compare against opposite ends of the
  // request's own range, which is what "overlaps this window" meant.
  if (filters.budgetMinimum !== undefined) conditions.push(gte(tutorRequests.budgetAmount, filters.budgetMinimum));
  if (filters.budgetMaximum !== undefined) conditions.push(lte(tutorRequests.budgetAmount, filters.budgetMaximum));
  if (filters.createdAfter) conditions.push(gte(tutorRequests.createdAt, filters.createdAfter));
  if (filters.createdBefore) conditions.push(lte(tutorRequests.createdAt, filters.createdBefore));
  if (filters.lastActivityAfter) conditions.push(gte(tutorRequests.lastActivityAt, filters.lastActivityAfter));
  if (filters.lastActivityBefore) conditions.push(lte(tutorRequests.lastActivityAt, filters.lastActivityBefore));
  if (filters.query) {
    const pattern = `%${filters.query}%`;
    const searchCondition = or(
      like(tutorRequests.category, pattern),
      like(tutorRequests.classCourse, pattern),
      like(tutorRequests.subjects, pattern),
      like(tutorRequests.locationText, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  return conditions;
}

const adminTutorRequestFields = {
  id: tutorRequests.id,
  guardianUserId: tutorRequests.guardianUserId,
  tutorId: tutorRequests.tutorId,
  tuitionType: tutorRequests.tuitionType,
  category: tutorRequests.category,
  classCourse: tutorRequests.classCourse,
  curriculumType: tutorRequests.curriculumType,
  subjects: tutorRequests.subjects,
  groupCapacity: tutorRequests.groupCapacity,
  packageDurationMonths: tutorRequests.packageDurationMonths,
  studentCount: tutorRequests.studentCount,
  daysPerWeek: tutorRequests.daysPerWeek,
  preferredGender: tutorRequests.preferredGender,
  studentFirstName: tutorRequests.studentFirstName,
  studentGender: tutorRequests.studentGender,
  addressDetails: tutorRequests.addressDetails,
  tuitionCityLocationId: tutorRequests.tuitionCityLocationId,
  tuitionLocationId: tutorRequests.tuitionLocationId,
  tuitionLocationLabel: tutorRequests.tuitionLocationLabel,
  budgetAmount: tutorRequests.budgetAmount,
  notes: tutorRequests.notes,
  monthlyBudget: tutorRequests.monthlyBudget,
  locationText: tutorRequests.locationText,
  status: tutorRequests.status,
  publicationState: tutorRequests.publicationState,
  guardianConfirmedAt: tutorRequests.guardianConfirmedAt,
  guardianReconfirmedAt: tutorRequests.guardianReconfirmedAt,
  appointmentConfirmedAt: tutorRequests.appointmentConfirmedAt,
  cancellationReason: tutorRequests.cancellationReason,
  contactConsent: tutorRequests.contactConsent,
  createdAt: tutorRequests.createdAt,
  lastActivityAt: tutorRequests.lastActivityAt,
};

export async function listTutorRequestMatchingPage(filters: AdminTutorRequestMatchingFilters) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const conditions = getAdminTutorRequestFilterConditions(filters);
  const offset = (filters.page - 1) * filters.pageSize;
  const itemQuery = database
    .select(adminTutorRequestFields)
    .from(tutorRequests);
  const items = conditions.length
    ? await itemQuery
      .where(and(...conditions))
      .orderBy(asc(tutorRequests.createdAt))
      .limit(filters.pageSize)
      .offset(offset)
    : await itemQuery
    .orderBy(asc(tutorRequests.createdAt))
    .limit(filters.pageSize)
    .offset(offset);
  const totalQuery = database
    .select({ value: count() })
    .from(tutorRequests);
  const totals = conditions.length
    ? await totalQuery.where(and(...conditions))
    : await totalQuery;
  const total = Number(totals[0]?.value ?? 0);
  return {
    items,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
  };
}

export async function listTutorRequestsForAdmin() {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database
    .select(adminTutorRequestFields)
    .from(tutorRequests)
    .where(inArray(tutorRequests.status, ["new", "reviewing", "matched"]))
    .orderBy(asc(tutorRequests.createdAt));
}

/** Admin-controlled lifecycle actions intentionally exclude direct matching, which must use assignment. */
export async function updateTutorRequestStatus(input: {
  requestId: number;
  status: "reviewing";
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const result = await database
    .update(tutorRequests)
    .set({ status: input.status })
    .where(and(
      eq(tutorRequests.id, input.requestId),
      eq(tutorRequests.status, "new"),
    ));
  return { updated: Boolean(result[0].affectedRows), status: input.status } as const;
}

export type AdminTutorRequestPublicationEdit = {
  category?: string;
  classCourse?: string;
  subjects?: string[];
  daysPerWeek?: number;
  preferredGender?: "male" | "female" | "any";
  budgetAmount?: number;
};

export type PublishedTutorJobListInput = {
  cityId?: string;
  locationId?: string;
  tuitionType?: "home" | "online" | "both" | "group" | "package";
  preferredTutorGender?: "male" | "female" | "any";
  category?: string;
  subject?: string;
  budgetMinimum?: number;
  budgetMaximum?: number;
  jobId?: string;
  page: number;
  pageSize: number;
};

function activePublishedTutorJobConditions(input: PublishedTutorJobListInput) {
  const now = new Date();
  const conditions: SQL[] = [
    eq(tutorJobs.publicationStatus, "published"),
    gte(tutorJobs.expiresAt, now),
  ];
  if (input.cityId) conditions.push(eq(tutorJobs.cityLocationId, input.cityId));
  if (input.locationId) conditions.push(eq(tutorJobs.locationId, input.locationId));
  if (input.tuitionType) conditions.push(eq(tutorJobs.tuitionType, input.tuitionType));
  if (input.preferredTutorGender) conditions.push(eq(tutorJobs.preferredTutorGender, input.preferredTutorGender));
  if (input.category) conditions.push(eq(tutorJobs.category, input.category));
  if (input.subject) conditions.push(like(tutorJobs.subjects, `%${input.subject}%`));
  if (input.budgetMinimum !== undefined) conditions.push(gte(tutorJobs.budgetAmount, input.budgetMinimum));
  if (input.budgetMaximum !== undefined) conditions.push(lte(tutorJobs.budgetAmount, input.budgetMaximum));
  if (input.jobId) conditions.push(eq(tutorJobs.publicJobId, input.jobId));
  return and(...conditions);
}

/** Public/Tutor Job Board read: an explicit column allow-list prevents private request data exposure. */
export async function listPublishedTutorJobs(input: PublishedTutorJobListInput) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const where = activePublishedTutorJobConditions(input);
  const [countRow] = await database.select({ totalCount: count() }).from(tutorJobs).where(where);
  const rows = await database
    .select({
      id: tutorJobs.id,
      publicJobId: tutorJobs.publicJobId,
      tuitionType: tutorJobs.tuitionType,
      category: tutorJobs.category,
      classCourse: tutorJobs.classCourse,
      subjects: tutorJobs.subjects,
      studentCount: tutorJobs.studentCount,
      studentGender: tutorJobs.studentGender,
      preferredTutorGender: tutorJobs.preferredTutorGender,
      daysPerWeek: tutorJobs.daysPerWeek,
      budgetAmount: tutorJobs.budgetAmount,
      country: tutorJobs.country,
      cityLocationId: tutorJobs.cityLocationId,
      locationId: tutorJobs.locationId,
      locationLabel: tutorJobs.locationLabel,
      directionLabel: tutorJobs.directionLabel,
      publishedAt: tutorJobs.publishedAt,
      expiresAt: tutorJobs.expiresAt,
    })
    .from(tutorJobs)
    .where(where)
    .orderBy(desc(tutorJobs.publishedAt), desc(tutorJobs.id))
    .limit(input.pageSize)
    .offset((input.page - 1) * input.pageSize);
  return { items: rows.map(toPublicTutorJob), totalCount: Number(countRow?.totalCount ?? 0) };
}

type TutorInterestDatabaseStatus = TutorJobInterestStatus;

/**
 * Records an authenticated Tutor's private signal of interest. This boundary
 * deliberately returns no Guardian contact, address, or request-note data.
 */
export async function submitTutorJobInterest(input: { tutorId: string; tutorJobId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");

  return database.transaction(async tx => {
    const [job] = await tx
      .select({ id: tutorJobs.id, publicationStatus: tutorJobs.publicationStatus, expiresAt: tutorJobs.expiresAt })
      .from(tutorJobs)
      .where(eq(tutorJobs.id, input.tutorJobId))
      .limit(1)
      .for("update");
    const [existing] = await tx
      .select({ id: tutorJobInterests.id, status: tutorJobInterests.status })
      .from(tutorJobInterests)
      .where(and(eq(tutorJobInterests.tutorJobId, input.tutorJobId), eq(tutorJobInterests.tutorId, input.tutorId)))
      .limit(1)
      .for("update");

    const eligibility = canSubmitTutorInterest({
      tutorId: input.tutorId,
      jobStatus: job?.publicationStatus ?? "closed",
      expiresAt: job?.expiresAt ?? new Date(0),
      now: new Date(),
      existingStatus: (existing?.status as TutorInterestDatabaseStatus | undefined) ?? null,
    });
    if (!eligibility.allowed) throw new Error(`TUTOR_INTEREST_${eligibility.reason.toUpperCase()}`);

    if (existing) {
      await tx
        .update(tutorJobInterests)
        .set({ status: "interested" })
        .where(eq(tutorJobInterests.id, existing.id));
      return { interestId: existing.id, status: "interested" as const, submittedAt: new Date() };
    }

    const [result] = await tx
      .insert(tutorJobInterests)
      .values({ tutorJobId: input.tutorJobId, tutorId: input.tutorId, status: "interested" });
    return { interestId: Number(result.insertId), status: "interested" as const, submittedAt: new Date() };
  });
}

/** Tutor-only withdrawal. An interest never discloses Guardian data to the Tutor. */
export async function withdrawTutorJobInterest(input: { tutorId: string; interestId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [interest] = await database
    .select({ id: tutorJobInterests.id, status: tutorJobInterests.status })
    .from(tutorJobInterests)
    .where(and(eq(tutorJobInterests.id, input.interestId), eq(tutorJobInterests.tutorId, input.tutorId)))
    .limit(1);
  if (!interest) throw new Error("TUTOR_INTEREST_NOT_FOUND");
  const transition = transitionTutorInterest(interest.status as TutorInterestDatabaseStatus, "withdrawn", "tutor");
  if (!transition.allowed) throw new Error(`TUTOR_INTEREST_${transition.reason.toUpperCase()}`);
  await database.update(tutorJobInterests).set({ status: "withdrawn" }).where(eq(tutorJobInterests.id, interest.id));
  return { interestId: interest.id, status: "withdrawn" as const };
}

/**
 * Tutor-owned history: published job facts plus the Tutor's own status. The
 * query intentionally excludes all Guardian information.
 */
export async function listTutorJobInterestsForTutor(tutorId: string) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database
    .select({
      interestId: tutorJobInterests.id,
      status: tutorJobInterests.status,
      createdAt: tutorJobInterests.createdAt,
      publicJobId: tutorJobs.publicJobId,
      tuitionType: tutorJobs.tuitionType,
      category: tutorJobs.category,
      classCourse: tutorJobs.classCourse,
      subjects: tutorJobs.subjects,
      daysPerWeek: tutorJobs.daysPerWeek,
      locationLabel: tutorJobs.locationLabel,
      expiresAt: tutorJobs.expiresAt,
      publicationStatus: tutorJobs.publicationStatus,
    })
    .from(tutorJobInterests)
    .innerJoin(tutorJobs, eq(tutorJobInterests.tutorJobId, tutorJobs.id))
    .where(eq(tutorJobInterests.tutorId, tutorId))
    .orderBy(desc(tutorJobInterests.updatedAt), desc(tutorJobInterests.id));
}

/** Admin-only review queue; full Tutor contact details remain out of this general query. */
export async function listTutorJobInterestsForAdmin(input: { tutorJobId?: number } = {}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const where = input.tutorJobId ? eq(tutorJobInterests.tutorJobId, input.tutorJobId) : undefined;
  return database
    .select({
      interestId: tutorJobInterests.id,
      status: tutorJobInterests.status,
      createdAt: tutorJobInterests.createdAt,
      tutorId: tutors.id,
      tutorName: tutors.name,
      tutorNumber: tutorRegistrations.tutorNumber,
      publicJobId: tutorJobs.publicJobId,
      jobId: tutorJobs.id,
      jobTitle: tutorJobs.classCourse,
    })
    .from(tutorJobInterests)
    .innerJoin(tutorJobs, eq(tutorJobInterests.tutorJobId, tutorJobs.id))
    .innerJoin(tutors, eq(tutorJobInterests.tutorId, tutors.id))
    .leftJoin(tutorRegistrations, eq(tutors.userId, tutorRegistrations.userId))
    .where(where)
    .orderBy(desc(tutorJobInterests.createdAt), desc(tutorJobInterests.id));
}

export async function reviewTutorJobInterestByAdmin(input: {
  interestId: number;
  status: Exclude<TutorInterestDatabaseStatus, "interested" | "withdrawn">;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database.transaction(async tx => {
    const [interest] = await tx
      .select({ id: tutorJobInterests.id, status: tutorJobInterests.status })
      .from(tutorJobInterests)
      .where(eq(tutorJobInterests.id, input.interestId))
      .limit(1)
      .for("update");
    if (!interest) throw new Error("TUTOR_INTEREST_NOT_FOUND");
    const transition = transitionTutorInterest(interest.status as TutorInterestDatabaseStatus, input.status, "admin");
    if (!transition.allowed) throw new Error(`TUTOR_INTEREST_${transition.reason.toUpperCase()}`);
    await tx.update(tutorJobInterests).set({ status: input.status }).where(eq(tutorJobInterests.id, interest.id));
    return { interestId: interest.id, status: input.status };
  });
}

function safeJsonStringArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").map(item => item.trim()).filter(Boolean).slice(0, 12)
      : [];
  } catch {
    return [];
  }
}

type JobProjectionTransaction = Parameters<Parameters<NonNullable<Awaited<ReturnType<typeof getDb>>>["transaction"]>[0]>[0];

async function synchronizePublishedTutorJob(
  tx: JobProjectionTransaction,
  input: {
    action: TutorRequestPublicationAction;
    request: {
      id: number;
      tuitionType: "home" | "online" | "both" | "group" | "package";
      category: string;
      classCourse: string;
      subjects: string;
      groupCapacity: number | null;
      packageDurationMonths: number | null;
      studentCount: number | null;
      studentGender: "male" | "female" | null;
      daysPerWeek: number;
      preferredGender: "male" | "female" | "any";
      tuitionCityLocationId: string | null;
      tuitionLocationId: string | null;
      tuitionLocationLabel: string | null;
      budgetAmount: number | null;
    };
  },
): Promise<{ publicJobId?: string }> {
  if (input.action !== "publish" && input.action !== "extend_expiry" && input.action !== "unpublish" && input.action !== "close") return {};
  const now = new Date();
  const jobExpiryDays = (await getSiteLimits())["jobBoard.expiryDays"];
  const [existingJob] = await tx
    .select({ id: tutorJobs.id, publicJobId: tutorJobs.publicJobId })
    .from(tutorJobs)
    .where(eq(tutorJobs.tutorRequestId, input.request.id))
    .limit(1)
    .for("update");

  if (input.action === "publish") {
    // A job on the public board with no salary is the thing the single-amount
    // change was made to end, so a request that still carries none - the two
    // that predate it - cannot be published until its Guardian names one.
    if (input.request.budgetAmount === null) throw new Error("Published job requires a salary amount.");
    const projection: PublishedTutorJobProjection = buildPublishedTutorJobProjection({
      requestId: input.request.id,
      tuitionType: input.request.tuitionType,
      category: input.request.category,
      classCourse: input.request.classCourse,
      subjects: safeJsonStringArray(input.request.subjects),
      groupCapacity: input.request.groupCapacity,
      studentCount: input.request.studentCount,
      studentGender: input.request.studentGender,
      daysPerWeek: input.request.daysPerWeek,
      preferredTutorGender: input.request.preferredGender,
      cityLocationId: input.request.tuitionCityLocationId,
      locationId: input.request.tuitionLocationId,
      locationLabel: input.request.tuitionLocationLabel,
      budgetAmount: input.request.budgetAmount,
      publishedAt: now,
      // Read here rather than inside the projection so that function stays
      // pure and its tests need no database. Changing the limit moves jobs
      // published from now on; ones already live keep the expiry they were
      // given, which is the only fair reading of "expires on".
    }, jobExpiryDays);
    if (!existingJob) {
      // The number comes from the request and from nowhere else. An Admin used
      // to be able to type one in, which allowed two kinds of ID for the same
      // kind of thing and a collision check to go with it; a derived number can
      // clash with nothing, because one request has one id.
      await tx.insert(tutorJobs).values(projection);
      return { publicJobId: projection.publicJobId };
    }
    await tx
      .update(tutorJobs)
      .set(getPublishedTutorJobRefresh(projection))
      .where(eq(tutorJobs.id, existingJob.id));
    return { publicJobId: existingJob.publicJobId };
  }

  if (input.action === "extend_expiry") {
    if (!existingJob) throw new Error("PUBLISHED_JOB_NOT_FOUND");
    await tx
      .update(tutorJobs)
      // A second hardcoded 14 lived here, so extending an expiry always gave
      // a fortnight no matter what publishing gave. Both read the limit now.
      .set({ expiresAt: addDays(now, jobExpiryDays), publicationStatus: "published", deactivatedAt: null })
      .where(eq(tutorJobs.id, existingJob.id));
    return { publicJobId: existingJob.publicJobId };
  }

  if (!existingJob) return {};
  await tx
    .update(tutorJobs)
    .set({
      publicationStatus: input.action === "unpublish" ? "unpublished" : "closed",
      deactivatedAt: now,
    })
    .where(eq(tutorJobs.id, existingJob.id));
  return { publicJobId: existingJob.publicJobId };
}

/**
 * Applies an Admin verification/publication operation and records its safe,
 * immutable before/after state in one transaction. The allowed edit fields are
 * intentionally limited to job-facing details, excluding Guardian contacts,
 * student identity, notes, exact address, and location IDs.
 */
export async function moderateTutorRequestPublication(input: {
  requestId: number;
  adminUserId: number;
  action: TutorRequestPublicationAction;
  reason?: string;
  edit?: AdminTutorRequestPublicationEdit;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database.transaction(async tx => {
    const [request] = await tx
      .select({
        id: tutorRequests.id,
        guardianUserId: tutorRequests.guardianUserId,
        publicationState: tutorRequests.publicationState,
        guardianConfirmedAt: tutorRequests.guardianConfirmedAt,
        guardianReconfirmedAt: tutorRequests.guardianReconfirmedAt,
        category: tutorRequests.category,
        classCourse: tutorRequests.classCourse,
        subjects: tutorRequests.subjects,
        groupCapacity: tutorRequests.groupCapacity,
        packageDurationMonths: tutorRequests.packageDurationMonths,
        studentCount: tutorRequests.studentCount,
        studentGender: tutorRequests.studentGender,
        daysPerWeek: tutorRequests.daysPerWeek,
        preferredGender: tutorRequests.preferredGender,
        budgetAmount: tutorRequests.budgetAmount,
        tuitionType: tutorRequests.tuitionType,
        tuitionCityLocationId: tutorRequests.tuitionCityLocationId,
        tuitionLocationId: tutorRequests.tuitionLocationId,
        tuitionLocationLabel: tutorRequests.tuitionLocationLabel,
      })
      .from(tutorRequests)
      .where(eq(tutorRequests.id, input.requestId))
      .limit(1)
      .for("update");
    if (!request) return { updated: false as const, reason: "REQUEST_NOT_FOUND" as const };

    const transition = validateAdminRequestPublicationAction({
      from: request.publicationState,
      action: input.action,
      guardianConfirmed: Boolean(request.guardianConfirmedAt),
      guardianReconfirmed: Boolean(request.guardianReconfirmedAt),
    });
    if (!transition.valid) return { updated: false as const, reason: transition.reason };
    if (input.action === "edit" && !input.edit) return { updated: false as const, reason: "EDIT_REQUIRED" as const };

    const beforeSnapshot = buildSafeTutorRequestPublicationSnapshot(request);
    const update: {
      publicationState: typeof request.publicationState;
      category?: string;
      classCourse?: string;
      subjects?: string;
      daysPerWeek?: number;
      preferredGender?: "male" | "female" | "any";
      budgetAmount?: number | null;
      monthlyBudget?: number | null;
      guardianConfirmedAt?: Date | null;
      guardianReconfirmedAt?: Date | null;
      status?: "reviewing" | "closed";
      contactConsent?: "not_required";
      lastActivityAt?: Date;
    } = { publicationState: transition.nextState, lastActivityAt: new Date() };
    if (input.action === "verify") update.status = "reviewing";
    if (input.action === "close") {
      update.status = "closed";
      update.contactConsent = "not_required";
    }
    if (input.action === "guardian_confirmed") update.guardianConfirmedAt = new Date();
    if (input.action === "guardian_reconfirmed") update.guardianReconfirmedAt = new Date();
    if (input.action === "extend_expiry") update.guardianReconfirmedAt = null;
    if (input.action === "edit") {
      const edit = input.edit!;
      if (edit.category !== undefined) update.category = edit.category;
      if (edit.classCourse !== undefined) update.classCourse = edit.classCourse;
      if (edit.subjects !== undefined) update.subjects = JSON.stringify(edit.subjects);
      if (edit.daysPerWeek !== undefined) update.daysPerWeek = edit.daysPerWeek;
      if (edit.preferredGender !== undefined) update.preferredGender = edit.preferredGender;
      if (edit.budgetAmount !== undefined) {
        update.budgetAmount = edit.budgetAmount;
        update.monthlyBudget = null;
      }
      update.guardianConfirmedAt = null;
    }
    const afterSnapshot = buildSafeTutorRequestPublicationSnapshot({
      ...request,
      category: update.category ?? request.category,
      classCourse: update.classCourse ?? request.classCourse,
      subjects: update.subjects ?? request.subjects,
      daysPerWeek: update.daysPerWeek ?? request.daysPerWeek,
      preferredGender: update.preferredGender ?? request.preferredGender,
      budgetAmount: update.budgetAmount === undefined ? request.budgetAmount : update.budgetAmount,
      tuitionLocationLabel: request.tuitionLocationLabel,
    });
    await tx.update(tutorRequests).set(update).where(eq(tutorRequests.id, request.id));
    const jobProjection = await synchronizePublishedTutorJob(tx, {
      action: input.action,
      request: {
        id: request.id,
        tuitionType: request.tuitionType,
        category: update.category ?? request.category,
        classCourse: update.classCourse ?? request.classCourse,
        subjects: update.subjects ?? request.subjects,
        groupCapacity: request.groupCapacity,
        packageDurationMonths: request.packageDurationMonths,
        studentCount: request.studentCount,
        studentGender: request.studentGender,
        daysPerWeek: update.daysPerWeek ?? request.daysPerWeek,
        preferredGender: update.preferredGender ?? request.preferredGender,
        tuitionCityLocationId: request.tuitionCityLocationId,
        tuitionLocationId: request.tuitionLocationId,
        tuitionLocationLabel: request.tuitionLocationLabel,
        budgetAmount: update.budgetAmount === undefined ? request.budgetAmount : update.budgetAmount,
      },
    });
    const result = await tx.insert(tutorRequestPublicationEvents).values({
      tutorRequestId: request.id,
      adminUserId: input.adminUserId,
      action: input.action,
      previousState: request.publicationState,
      nextState: transition.nextState,
      reason: input.reason?.trim() || null,
      beforeSnapshot: JSON.stringify(beforeSnapshot),
      afterSnapshot: JSON.stringify(afterSnapshot),
    });
    if (transition.nextState === "published") {
      await tx.insert(guardianRequestNotifications).values({
        guardianUserId: request.guardianUserId,
        tutorRequestId: request.id,
        type: "lifecycle",
        title: "Your tutor request is now live",
        message: "Your request is published and available for the matching process.",
        actionPath: `/guardian/dashboard/posted-jobs/${request.id}`,
        deduplicationKey: `lifecycle:${request.id}:live`,
      }).onDuplicateKeyUpdate({ set: { deduplicationKey: `lifecycle:${request.id}:live` } });
    }
    return {
      updated: true as const,
      eventId: Number(result[0].insertId),
      previousState: request.publicationState,
      nextState: transition.nextState,
      ...(jobProjection.publicJobId ? { publicJobId: jobProjection.publicJobId } : {}),
    };
  });
}

/** Admin-visible history excludes identity and contact information by design. */
export async function listTutorRequestPublicationEvents(requestId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database
    .select({
      id: tutorRequestPublicationEvents.id,
      adminUserId: tutorRequestPublicationEvents.adminUserId,
      action: tutorRequestPublicationEvents.action,
      previousState: tutorRequestPublicationEvents.previousState,
      nextState: tutorRequestPublicationEvents.nextState,
      reason: tutorRequestPublicationEvents.reason,
      beforeSnapshot: tutorRequestPublicationEvents.beforeSnapshot,
      afterSnapshot: tutorRequestPublicationEvents.afterSnapshot,
      createdAt: tutorRequestPublicationEvents.createdAt,
    })
    .from(tutorRequestPublicationEvents)
    .where(eq(tutorRequestPublicationEvents.tutorRequestId, requestId))
    .orderBy(desc(tutorRequestPublicationEvents.createdAt));
}

export async function assignTutorToRequest(input: { requestId: number; tutorId: string }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [tutor] = await database
    .select({ id: tutors.id })
    .from(tutors)
    .where(and(eq(tutors.id, input.tutorId), eq(tutors.profileStatus, "approved")))
    .limit(1);
  if (!tutor) return { assigned: false as const, reason: "tutor-unavailable" as const };
  return database.transaction(async tx => {
    const [request] = await tx
      .select({ id: tutorRequests.id, guardianUserId: tutorRequests.guardianUserId })
      .from(tutorRequests)
      .where(and(
        eq(tutorRequests.id, input.requestId),
        inArray(tutorRequests.status, ["new", "reviewing"]),
        inArray(tutorRequests.publicationState, ["submitted", "reviewing", "changes_requested", "approved", "unpublished"]),
      ))
      .limit(1)
      .for("update");
    if (!request) return { assigned: false as const, reason: "request-unavailable" as const };
    await tx.update(tutorRequests).set({ tutorId: input.tutorId, status: "matched", contactConsent: "pending", lastActivityAt: new Date() }).where(eq(tutorRequests.id, request.id));
    await tx.insert(guardianRequestNotifications).values({
      guardianUserId: request.guardianUserId,
      tutorRequestId: request.id,
      type: "lifecycle",
      title: "A Tutor has been appointed to your request",
      message: "An Admin has selected a Tutor and is completing the confirmation process.",
      actionPath: `/guardian/dashboard/posted-jobs/${request.id}`,
      deduplicationKey: `lifecycle:${request.id}:appointed`,
    }).onDuplicateKeyUpdate({ set: { deduplicationKey: `lifecycle:${request.id}:appointed` } });
    return { assigned: true as const, contactConsent: "pending" as const };
  });
}

export async function listTutorAssignedRequests(userId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [tutor] = await database.select({ id: tutors.id }).from(tutors).where(eq(tutors.userId, userId)).limit(1);
  if (!tutor) return [];
  return database
    .select({
      id: tutorRequests.id,
      tuitionType: tutorRequests.tuitionType,
      category: tutorRequests.category,
      classCourse: tutorRequests.classCourse,
      subjects: tutorRequests.subjects,
      daysPerWeek: tutorRequests.daysPerWeek,
      preferredGender: tutorRequests.preferredGender,
      monthlyBudget: tutorRequests.monthlyBudget,
      groupCapacity: tutorRequests.groupCapacity,
      packageDurationMonths: tutorRequests.packageDurationMonths,
      studentCount: tutorRequests.studentCount,
      addressDetails: tutorRequests.addressDetails,
      locationText: tutorRequests.locationText,
      status: tutorRequests.status,
      createdAt: tutorRequests.createdAt,
    })
    .from(tutorRequests)
    .where(eq(tutorRequests.tutorId, tutor.id))
    .orderBy(desc(tutorRequests.createdAt));
}

/**
 * Stores only a canonical phone number and opaque expiring handoff reference.
 * A repeat capture safely supersedes an incomplete prior handoff.
 */
export async function createOrResumeGuardianPhoneIntake(input: {
  phone: string;
  handoffTokenHash: string;
  handoffExpiresAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  await db
    .insert(guardianPhoneIntakes)
    .values({
      phone: input.phone,
      status: "pending",
      handoffTokenHash: input.handoffTokenHash,
      handoffExpiresAt: input.handoffExpiresAt,
    })
    .onDuplicateKeyUpdate({
      set: {
        status: "pending",
        handoffTokenHash: input.handoffTokenHash,
        handoffExpiresAt: input.handoffExpiresAt,
        phoneVerifiedAt: null,
        completedAt: null,
      },
    });

  const [intake] = await db
    .select({ id: guardianPhoneIntakes.id })
    .from(guardianPhoneIntakes)
    .where(eq(guardianPhoneIntakes.phone, input.phone))
    .limit(1);
  if (!intake) throw new Error("Guardian phone intake could not be resumed.");
  return { id: intake.id };
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function createAdminInvitation(input: {
  ownerUserId: number;
  email: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const result = await database.insert(adminInvitations).values({
    createdByUserId: input.ownerUserId,
    email: normalizeEmail(input.email),
    tokenHash: input.tokenHash,
    expiresAt: input.expiresAt,
    status: "pending",
  });
  return { id: Number(result[0].insertId) } as const;
}

/** Returns only a pending, unexpired invitation. The token digest itself is never returned. */
export async function getActiveAdminInvitationByTokenHash(tokenHash: string) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [invitation] = await database
    .select({
      id: adminInvitations.id,
      email: adminInvitations.email,
      status: adminInvitations.status,
      expiresAt: adminInvitations.expiresAt,
      createdByUserId: adminInvitations.createdByUserId,
    })
    .from(adminInvitations)
    .where(and(
      eq(adminInvitations.tokenHash, tokenHash),
      eq(adminInvitations.status, "pending"),
      gte(adminInvitations.expiresAt, new Date()),
    ))
    .limit(1);
  return invitation;
}

/** Atomically accepts a pending, unexpired invitation bound to the supplied email. */
export async function acceptAdminInvitation(input: {
  invitationId: number;
  userId: number;
  email: string;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database.transaction(async tx => {
    const [invitation] = await tx
      .select({ id: adminInvitations.id, status: adminInvitations.status, expiresAt: adminInvitations.expiresAt, email: adminInvitations.email })
      .from(adminInvitations)
      .where(eq(adminInvitations.id, input.invitationId))
      .limit(1)
      .for("update");
    if (!invitation || invitation.status !== "pending" || invitation.expiresAt.getTime() < Date.now() || invitation.email !== normalizeEmail(input.email)) {
      return { accepted: false as const };
    }
    const acceptedAt = new Date();
    await tx.update(adminInvitations).set({ status: "accepted", acceptedByUserId: input.userId, acceptedAt }).where(eq(adminInvitations.id, invitation.id));
    await tx.update(users).set({ role: "admin" }).where(eq(users.id, input.userId));
    return { accepted: true as const, acceptedAt };
  });
}

export async function revokeAdminInvitation(invitationId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const result = await database
    .update(adminInvitations)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(and(eq(adminInvitations.id, invitationId), eq(adminInvitations.status, "pending")));
  return { revoked: Boolean(result[0].affectedRows) } as const;
}

export async function listAdminUsers() {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database
    .select({ id: users.id, name: users.name, email: users.email, loginId: adminCredentials.loginId, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn })
    .from(users)
    .leftJoin(adminCredentials, eq(adminCredentials.userId, users.id))
    .where(eq(users.role, "admin"))
    .orderBy(asc(users.createdAt));
}

export async function updateUserRole(userId: number, role: UserRole) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const result = await database.update(users).set({ role }).where(eq(users.id, userId));
  return { updated: Boolean(result[0].affectedRows), role } as const;
}

export async function logAdminAuditEvent(input: {
  userId?: number;
  email?: string;
  event: AdminAuditEvent;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const metadata = input.metadata
    ? JSON.stringify(Object.fromEntries(Object.entries(input.metadata).filter(([, value]) => value !== undefined)))
    : null;
  const result = await database.insert(adminLoginAuditLogs).values({
    userId: input.userId,
    email: input.email ? normalizeEmail(input.email) : null,
    event: input.event,
    metadata,
  });
  return { id: Number(result[0].insertId) } as const;
}

export type AdminAuditLogFilters = {
  event?: AdminAuditEvent | "all";
  email?: string;
  page: number;
  pageSize: number;
};

/** Owner-facing audit data deliberately excludes all credential material. */
export async function listAdminAuditLogPage(filters: AdminAuditLogFilters) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const conditions: SQL[] = [];
  if (filters.event && filters.event !== "all") conditions.push(eq(adminLoginAuditLogs.event, filters.event));
  if (filters.email?.trim()) conditions.push(eq(adminLoginAuditLogs.email, normalizeEmail(filters.email)));
  const offset = (filters.page - 1) * filters.pageSize;
  const query = database
    .select({ id: adminLoginAuditLogs.id, userId: adminLoginAuditLogs.userId, email: adminLoginAuditLogs.email, event: adminLoginAuditLogs.event, metadata: adminLoginAuditLogs.metadata, createdAt: adminLoginAuditLogs.createdAt })
    .from(adminLoginAuditLogs);
  const items = conditions.length
    ? await query.where(and(...conditions)).orderBy(desc(adminLoginAuditLogs.createdAt)).limit(filters.pageSize).offset(offset)
    : await query.orderBy(desc(adminLoginAuditLogs.createdAt)).limit(filters.pageSize).offset(offset);
  const totalQuery = database.select({ value: count() }).from(adminLoginAuditLogs);
  const totals = conditions.length ? await totalQuery.where(and(...conditions)) : await totalQuery;
  const total = Number(totals[0]?.value ?? 0);
  return { items, total, page: filters.page, pageSize: filters.pageSize, totalPages: Math.max(1, Math.ceil(total / filters.pageSize)) };
}

export type AuthEventRole = "tutor" | "guardian" | "admin";

/**
 * Durable counterpart to the `[auth-audit]` stdout line for public (non-Admin)
 * auth flows. Never receives raw identifiers or credential material — callers
 * pass an already-masked identifier. Failures here must not break the request,
 * so callers invoke this best-effort (`void ...catch()`).
 */
export async function recordAuthEvent(input: {
  event: AuthEventType;
  role?: AuthEventRole;
  ip?: string | null;
  identifierMasked?: string | null;
  reason?: string | null;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const result = await database.insert(authEvents).values({
    event: input.event,
    role: input.role ?? null,
    ip: input.ip?.slice(0, 64) ?? null,
    identifierMasked: input.identifierMasked?.slice(0, 128) ?? null,
    reason: input.reason?.slice(0, 120) ?? null,
  });
  return { id: Number(result[0].insertId) } as const;
}

export type AuthEventFilters = {
  event?: AuthEventType | "all";
  role?: AuthEventRole | "all";
  ip?: string;
  page: number;
  pageSize: number;
};

/**
 * Owner-facing, paginated history of public (non-Admin) auth events, newest
 * first. Mirrors `listAdminAuditLogPage`; stores no credential material and only
 * the pre-masked identifier.
 */
export async function listAuthEventsPage(filters: AuthEventFilters) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const conditions: SQL[] = [];
  if (filters.event && filters.event !== "all") conditions.push(eq(authEvents.event, filters.event));
  if (filters.role && filters.role !== "all") conditions.push(eq(authEvents.role, filters.role));
  if (filters.ip?.trim()) conditions.push(eq(authEvents.ip, filters.ip.trim()));
  const offset = (filters.page - 1) * filters.pageSize;
  const query = database
    .select({
      id: authEvents.id,
      event: authEvents.event,
      role: authEvents.role,
      ip: authEvents.ip,
      identifierMasked: authEvents.identifierMasked,
      reason: authEvents.reason,
      createdAt: authEvents.createdAt,
    })
    .from(authEvents);
  const items = conditions.length
    ? await query.where(and(...conditions)).orderBy(desc(authEvents.createdAt)).limit(filters.pageSize).offset(offset)
    : await query.orderBy(desc(authEvents.createdAt)).limit(filters.pageSize).offset(offset);
  const totalQuery = database.select({ value: count() }).from(authEvents);
  const totals = conditions.length ? await totalQuery.where(and(...conditions)) : await totalQuery;
  const total = Number(totals[0]?.value ?? 0);
  return { items, total, page: filters.page, pageSize: filters.pageSize, totalPages: Math.max(1, Math.ceil(total / filters.pageSize)) };
}

/**
 * Stores encrypted seed material only after a successful first-time enrollment
 * verification. The unique user key makes a concurrent replacement attempt
 * fail instead of silently overwriting an established authenticator.
 */
export async function saveAdminTwoFactorSettings(userId: number, secretCiphertext: string) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const enabledAt = new Date();
  await database.insert(adminTwoFactorSettings).values({ userId, secretCiphertext, enabledAt, lastVerifiedAt: enabledAt });
  return { enabledAt } as const;
}

export async function getAdminTwoFactorSettings(userId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [settings] = await database
    .select({ userId: adminTwoFactorSettings.userId, secretCiphertext: adminTwoFactorSettings.secretCiphertext, enabledAt: adminTwoFactorSettings.enabledAt, lastVerifiedAt: adminTwoFactorSettings.lastVerifiedAt })
    .from(adminTwoFactorSettings)
    .where(eq(adminTwoFactorSettings.userId, userId))
    .limit(1);
  return settings;
}

export async function recordAdminTwoFactorVerification(userId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const verifiedAt = new Date();
  const result = await database.update(adminTwoFactorSettings).set({ lastVerifiedAt: verifiedAt }).where(eq(adminTwoFactorSettings.userId, userId));
  return { updated: Boolean(result[0].affectedRows), verifiedAt } as const;
}

export async function replaceAdminRecoveryCodes(userId: number, codeHashes: string[]) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  await database.transaction(async tx => {
    await tx.delete(adminTwoFactorRecoveryCodes).where(eq(adminTwoFactorRecoveryCodes.userId, userId));
    if (codeHashes.length) await tx.insert(adminTwoFactorRecoveryCodes).values(codeHashes.map(codeHash => ({ userId, codeHash })));
  });
  return { saved: codeHashes.length } as const;
}

/** Consumes at most one matching, unused recovery-code digest. */
export async function consumeAdminRecoveryCode(userId: number, codeHash: string) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const result = await database
    .update(adminTwoFactorRecoveryCodes)
    .set({ usedAt: new Date() })
    .where(and(eq(adminTwoFactorRecoveryCodes.userId, userId), eq(adminTwoFactorRecoveryCodes.codeHash, codeHash), isNull(adminTwoFactorRecoveryCodes.usedAt)));
  return { consumed: Boolean(result[0].affectedRows) } as const;
}

/** Owner-only recovery path: clear a lost Admin's enrollment and one-time codes together. */
export async function resetAdminTwoFactor(userId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database.transaction(async tx => {
    await tx.delete(adminTwoFactorRecoveryCodes).where(eq(adminTwoFactorRecoveryCodes.userId, userId));
    const result = await tx.delete(adminTwoFactorSettings).where(eq(adminTwoFactorSettings.userId, userId));
    return { reset: Boolean(result[0].affectedRows) } as const;
  });
}

export type TutorModerationTargetStatus = Extract<TutorProfileStatus, "approved" | "changes_requested" | "suspended">;

/**
 * Locks the current Tutor record, enforces the approved operational lifecycle,
 * then records exactly one immutable moderation event with the status update.
 */
export async function moderateTutorProfile(input: {
  tutorId: string;
  adminUserId: number;
  nextStatus: TutorModerationTargetStatus;
  reason?: string;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database.transaction(async tx => {
    const [tutor] = await tx
      .select({ id: tutors.id, profileStatus: tutors.profileStatus })
      .from(tutors)
      .where(eq(tutors.id, input.tutorId))
      .limit(1)
      .for("update");
    if (!tutor) return { updated: false as const, reason: "TUTOR_NOT_FOUND" as const };

    const validation = validateTutorModerationAction({
      from: tutor.profileStatus,
      to: input.nextStatus,
      reason: input.reason,
    });
    if (!validation.valid) return { updated: false as const, reason: validation.reason };

    const normalizedReason = input.reason?.trim() || null;
    await tx.update(tutors).set({ profileStatus: input.nextStatus }).where(eq(tutors.id, tutor.id));
    const result = await tx.insert(tutorProfileModerationEvents).values({
      tutorId: tutor.id,
      adminUserId: input.adminUserId,
      previousStatus: tutor.profileStatus,
      nextStatus: input.nextStatus,
      reason: normalizedReason,
    });
    return { updated: true as const, eventId: Number(result[0].insertId), previousStatus: tutor.profileStatus, nextStatus: input.nextStatus };
  });
}

/** Returned to authorized Admin review screens without Tutor contact or document fields. */
export async function listTutorModerationEvents(tutorId: string) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database
    .select({
      id: tutorProfileModerationEvents.id,
      adminUserId: tutorProfileModerationEvents.adminUserId,
      previousStatus: tutorProfileModerationEvents.previousStatus,
      nextStatus: tutorProfileModerationEvents.nextStatus,
      reason: tutorProfileModerationEvents.reason,
      createdAt: tutorProfileModerationEvents.createdAt,
    })
    .from(tutorProfileModerationEvents)
    .where(eq(tutorProfileModerationEvents.tutorId, tutorId))
    .orderBy(desc(tutorProfileModerationEvents.createdAt));
}

/**
 * Creates the required append-only record only after a guarded Admin detail
 * procedure has successfully resolved the requested Guardian record.
 */
export async function recordGuardianContactAccess(input: {
  guardianUserId: number;
  adminUserId: number;
  tutorRequestId: number;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const result = await database.insert(guardianContactAccessEvents).values({
    guardianUserId: input.guardianUserId,
    adminUserId: input.adminUserId,
    tutorRequestId: input.tutorRequestId,
    context: "guardian_request",
  });
  return { id: Number(result[0].insertId) } as const;
}

export type AdminTutorDirectoryFilters = {
  query: string;
  profileStatus: "all" | TutorProfileStatus;
  verified: "all" | "verified" | "unverified";
  location: string;
  subject: string;
  tuitionType: "all" | "home" | "online" | "both";
  page: number;
  pageSize: number;
};

function getAdminTutorDirectoryConditions(filters: AdminTutorDirectoryFilters) {
  const conditions: SQL[] = [];
  if (filters.profileStatus !== "all") conditions.push(eq(tutors.profileStatus, filters.profileStatus));
  if (filters.verified === "verified") conditions.push(eq(tutors.verified, 1));
  if (filters.verified === "unverified") conditions.push(eq(tutors.verified, 0));
  if (filters.tuitionType !== "all") conditions.push(eq(tutors.mode, filters.tuitionType));
  if (filters.location) conditions.push(like(locations.label, `%${filters.location}%`));
  if (filters.subject) conditions.push(like(tutors.subjects, `%${filters.subject}%`));
  if (filters.query) {
    const pattern = `%${filters.query}%`;
    const searchCondition = or(
      like(tutors.id, pattern),
      like(tutors.name, pattern),
      like(tutors.headline, pattern),
      like(tutors.institution, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  return conditions;
}

const adminTutorDirectoryFields = {
  id: tutors.id,
  name: tutors.name,
  initials: tutors.initials,
  headline: tutors.headline,
  institution: tutors.institution,
  education: tutors.education,
  subjects: tutors.subjects,
  levels: tutors.levels,
  teachingExperienceYears: tutors.teachingExperienceYears,
  mode: tutors.mode,
  profileStatus: tutors.profileStatus,
  verified: tutors.verified,
  locationLabel: locations.label,
  updatedAt: tutors.updatedAt,
  createdAt: tutors.createdAt,
};

/** Operational Tutor directory deliberately excludes phone, email, documents, and photo keys. */
export async function listAdminTutorDirectoryPage(filters: AdminTutorDirectoryFilters) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const conditions = getAdminTutorDirectoryConditions(filters);
  const offset = (filters.page - 1) * filters.pageSize;
  const itemQuery = database
    .select(adminTutorDirectoryFields)
    .from(tutors)
    .leftJoin(locations, eq(tutors.locationId, locations.id));
  const items = conditions.length
    ? await itemQuery.where(and(...conditions)).orderBy(desc(tutors.updatedAt)).limit(filters.pageSize).offset(offset)
    : await itemQuery.orderBy(desc(tutors.updatedAt)).limit(filters.pageSize).offset(offset);
  const totalQuery = database.select({ value: count() }).from(tutors).leftJoin(locations, eq(tutors.locationId, locations.id));
  const totals = conditions.length ? await totalQuery.where(and(...conditions)) : await totalQuery;
  const total = Number(totals[0]?.value ?? 0);
  return { items, total, page: filters.page, pageSize: filters.pageSize, totalPages: Math.max(1, Math.ceil(total / filters.pageSize)) };
}

/** Single-Tutor review context deliberately excludes private contact and document references. */
export async function getAdminTutorReview(tutorId: string) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const rows = await database
    .select({
      ...adminTutorDirectoryFields,
      experience: tutors.experience,
      priorTeachingExperience: tutors.priorTeachingExperience,
      specialExpertise: tutors.specialExpertise,
      academicAchievement: tutors.academicAchievement,
      monthlyFeeMin: tutors.monthlyFeeMin,
      monthlyFeeMax: tutors.monthlyFeeMax,
      languages: tutors.languages,
      about: tutors.about,
      teachingApproach: tutors.teachingApproach,
    })
    .from(tutors)
    .leftJoin(locations, eq(tutors.locationId, locations.id))
    .where(eq(tutors.id, tutorId))
    .limit(1);
  return rows[0];
}

export type AdminGuardianRequestFilters = {
  query: string;
  status: "all" | "new" | "reviewing" | "matched" | "closed";
  contactConsent: "all" | "not_required" | "pending" | "approved" | "declined";
  tuitionType: "all" | "home" | "online" | "both" | "group" | "package";
  location: string;
  page: number;
  pageSize: number;
};

function getAdminGuardianRequestConditions(filters: AdminGuardianRequestFilters) {
  const conditions: SQL[] = [];
  if (filters.status !== "all") conditions.push(eq(tutorRequests.status, filters.status));
  if (filters.contactConsent !== "all") conditions.push(eq(tutorRequests.contactConsent, filters.contactConsent));
  if (filters.tuitionType !== "all") conditions.push(eq(tutorRequests.tuitionType, filters.tuitionType));
  if (filters.location) conditions.push(like(tutorRequests.locationText, `%${filters.location}%`));
  if (filters.query) {
    const pattern = `%${filters.query}%`;
    const searchCondition = or(
      like(tutorRequests.category, pattern),
      like(tutorRequests.classCourse, pattern),
      like(tutorRequests.subjects, pattern),
      like(tutorRequests.locationText, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  return conditions;
}

const adminGuardianRequestFields = {
  id: tutorRequests.id,
  tutorId: tutorRequests.tutorId,
  tuitionType: tutorRequests.tuitionType,
  category: tutorRequests.category,
  classCourse: tutorRequests.classCourse,
  subjects: tutorRequests.subjects,
  daysPerWeek: tutorRequests.daysPerWeek,
  preferredGender: tutorRequests.preferredGender,
  tuitionLocationLabel: tutorRequests.tuitionLocationLabel,
  monthlyBudget: tutorRequests.monthlyBudget,
  budgetAmount: tutorRequests.budgetAmount,
  locationText: tutorRequests.locationText,
  groupCapacity: tutorRequests.groupCapacity,
  packageDurationMonths: tutorRequests.packageDurationMonths,
  studentCount: tutorRequests.studentCount,
  studentGender: tutorRequests.studentGender,
  addressDetails: tutorRequests.addressDetails,
  status: tutorRequests.status,
  contactConsent: tutorRequests.contactConsent,
  createdAt: tutorRequests.createdAt,
};

/** Request-first activity feed deliberately excludes Guardian contact, student name, and notes. */
export async function listAdminGuardianRequestPage(filters: AdminGuardianRequestFilters) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const conditions = getAdminGuardianRequestConditions(filters);
  const offset = (filters.page - 1) * filters.pageSize;
  const itemQuery = database.select(adminGuardianRequestFields).from(tutorRequests);
  const items = conditions.length
    ? await itemQuery.where(and(...conditions)).orderBy(desc(tutorRequests.createdAt)).limit(filters.pageSize).offset(offset)
    : await itemQuery.orderBy(desc(tutorRequests.createdAt)).limit(filters.pageSize).offset(offset);
  const totalQuery = database.select({ value: count() }).from(tutorRequests);
  const totals = conditions.length ? await totalQuery.where(and(...conditions)) : await totalQuery;
  const total = Number(totals[0]?.value ?? 0);
  return { items, total, page: filters.page, pageSize: filters.pageSize, totalPages: Math.max(1, Math.ceil(total / filters.pageSize)) };
}

/** Resolves one requested Guardian contact record and appends exactly one successful access event. */
export async function getGuardianContactForAdmin(input: { requestId: number; adminUserId: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database.transaction(async tx => {
    const rows = await tx
      .select({
        requestId: tutorRequests.id,
        guardianUserId: tutorRequests.guardianUserId,
        name: users.name,
        email: users.email,
        phone: guardianProfiles.phone,
        cityLabel: locations.label,
      })
      .from(tutorRequests)
      .innerJoin(users, eq(tutorRequests.guardianUserId, users.id))
      .innerJoin(guardianProfiles, eq(tutorRequests.guardianUserId, guardianProfiles.userId))
      .leftJoin(locations, eq(guardianProfiles.locationId, locations.id))
      .where(eq(tutorRequests.id, input.requestId))
      .limit(1);
    const detail = rows[0];
    if (!detail) return undefined;
    await tx.insert(guardianContactAccessEvents).values({
      guardianUserId: detail.guardianUserId,
      adminUserId: input.adminUserId,
      tutorRequestId: detail.requestId,
      context: "guardian_request",
    });
    return {
      requestId: detail.requestId,
      name: detail.name ?? "Guardian",
      email: detail.email,
      phone: detail.phone,
      locationLabel: detail.cityLabel,
    };
  });
}

/** Dashboard metrics and activity intentionally omit all raw contact values. */
export async function getAdminMonitoringOverview() {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [pendingTutors, approvedTutors, suspendedTutors, newRequests, reviewingRequests, matchedRequests, consentBacklog, recentModeration, recentContactAccess] = await Promise.all([
    database.select({ value: count() }).from(tutors).where(inArray(tutors.profileStatus, ["pending", "changes_requested"])),
    database.select({ value: count() }).from(tutors).where(eq(tutors.profileStatus, "approved")),
    database.select({ value: count() }).from(tutors).where(eq(tutors.profileStatus, "suspended")),
    database.select({ value: count() }).from(tutorRequests).where(eq(tutorRequests.status, "new")),
    database.select({ value: count() }).from(tutorRequests).where(eq(tutorRequests.status, "reviewing")),
    database.select({ value: count() }).from(tutorRequests).where(eq(tutorRequests.status, "matched")),
    database.select({ value: count() }).from(tutorRequests).where(and(eq(tutorRequests.status, "matched"), eq(tutorRequests.contactConsent, "pending"))),
    database.select({ id: tutorProfileModerationEvents.id, tutorId: tutorProfileModerationEvents.tutorId, nextStatus: tutorProfileModerationEvents.nextStatus, createdAt: tutorProfileModerationEvents.createdAt }).from(tutorProfileModerationEvents).orderBy(desc(tutorProfileModerationEvents.createdAt)).limit(6),
    database.select({ id: guardianContactAccessEvents.id, tutorRequestId: guardianContactAccessEvents.tutorRequestId, createdAt: guardianContactAccessEvents.createdAt }).from(guardianContactAccessEvents).orderBy(desc(guardianContactAccessEvents.createdAt)).limit(6),
  ]);
  return {
    metrics: {
      pendingTutorReviews: Number(pendingTutors[0]?.value ?? 0),
      approvedTutors: Number(approvedTutors[0]?.value ?? 0),
      suspendedTutors: Number(suspendedTutors[0]?.value ?? 0),
      newRequests: Number(newRequests[0]?.value ?? 0),
      reviewingRequests: Number(reviewingRequests[0]?.value ?? 0),
      matchedRequests: Number(matchedRequests[0]?.value ?? 0),
      consentBacklog: Number(consentBacklog[0]?.value ?? 0),
    },
    recentModeration,
    recentContactAccess,
  };
}

export type OwnerAdminActivityReportInput = {
  windowDays: 7 | 30 | 90;
};

/**
 * Owner-only Admin activity reporting. This intentionally returns aggregate
 * security and operational counts, never raw Guardian contact, credential, or
 * audit metadata values such as IP addresses.
 */
export async function getOwnerAdminActivityReport(input: OwnerAdminActivityReportInput) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");

  const since = new Date(Date.now() - input.windowDays * 24 * 60 * 60 * 1000);
  const [auditRows, moderationRows, contactRows] = await Promise.all([
    database
      .select({ id: adminLoginAuditLogs.id, userId: adminLoginAuditLogs.userId, email: adminLoginAuditLogs.email, event: adminLoginAuditLogs.event, createdAt: adminLoginAuditLogs.createdAt })
      .from(adminLoginAuditLogs)
      .where(gte(adminLoginAuditLogs.createdAt, since))
      .orderBy(desc(adminLoginAuditLogs.createdAt))
      .limit(100),
    database
      .select({ id: tutorProfileModerationEvents.id, adminUserId: tutorProfileModerationEvents.adminUserId, tutorId: tutorProfileModerationEvents.tutorId, nextStatus: tutorProfileModerationEvents.nextStatus, createdAt: tutorProfileModerationEvents.createdAt })
      .from(tutorProfileModerationEvents)
      .where(gte(tutorProfileModerationEvents.createdAt, since))
      .orderBy(desc(tutorProfileModerationEvents.createdAt))
      .limit(100),
    database
      .select({ id: guardianContactAccessEvents.id, adminUserId: guardianContactAccessEvents.adminUserId, tutorRequestId: guardianContactAccessEvents.tutorRequestId, context: guardianContactAccessEvents.context, createdAt: guardianContactAccessEvents.createdAt })
      .from(guardianContactAccessEvents)
      .where(gte(guardianContactAccessEvents.createdAt, since))
      .orderBy(desc(guardianContactAccessEvents.createdAt))
      .limit(100),
  ]);

  const activityUserIds = Array.from(new Set([
    ...auditRows.flatMap(row => row.userId ? [row.userId] : []),
    ...moderationRows.map(row => row.adminUserId),
    ...contactRows.map(row => row.adminUserId),
  ]));
  const activityEmails = Array.from(new Set(auditRows.flatMap(row => row.email ? [normalizeEmail(row.email)] : [])));
  const actorFilters = [eq(users.role, "admin")];
  if (activityUserIds.length) actorFilters.push(inArray(users.id, activityUserIds));
  if (activityEmails.length) actorFilters.push(inArray(users.email, activityEmails));
  const adminActors = await database
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn })
    .from(users)
    .where(or(...actorFilters))
    .orderBy(asc(users.createdAt));
  const activeAdmins = adminActors.filter(admin => admin.role === "admin");
  const adminById = new Map(adminActors.map(admin => [admin.id, admin]));
  const adminIdByEmail = new Map(adminActors.flatMap(admin => admin.email ? [[normalizeEmail(admin.email), admin.id] as const] : []));
  const summaries = new Map(adminActors.map(admin => [admin.id, {
    userId: admin.id,
    name: admin.name ?? "Admin",
    email: admin.email,
    active: admin.role === "admin",
    securityEvents: 0,
    successfulLogins: 0,
    failedLogins: 0,
    twoFactorVerifications: 0,
    tutorModerations: 0,
    guardianContactViews: 0,
    lastActivityAt: null as Date | null,
  }]));

  const updateLastActivity = (userId: number, createdAt: Date) => {
    const summary = summaries.get(userId);
    if (!summary) return;
    if (!summary.lastActivityAt || summary.lastActivityAt < createdAt) summary.lastActivityAt = createdAt;
  };
  const resolvedAuditRows = auditRows.flatMap(row => {
    const adminId = row.userId && adminById.has(row.userId)
      ? row.userId
      : row.email ? adminIdByEmail.get(normalizeEmail(row.email)) : undefined;
    return adminId ? [{ ...row, adminUserId: adminId }] : [];
  });
  for (const row of resolvedAuditRows) {
    const summary = summaries.get(row.adminUserId);
    if (!summary) continue;
    summary.securityEvents += 1;
    if (row.event === "login_success") summary.successfulLogins += 1;
    if (row.event === "login_failure") summary.failedLogins += 1;
    if (row.event === "two_factor_success") summary.twoFactorVerifications += 1;
    updateLastActivity(row.adminUserId, row.createdAt);
  }
  for (const row of moderationRows) {
    const summary = summaries.get(row.adminUserId);
    if (!summary) continue;
    summary.tutorModerations += 1;
    updateLastActivity(row.adminUserId, row.createdAt);
  }
  for (const row of contactRows) {
    const summary = summaries.get(row.adminUserId);
    if (!summary) continue;
    summary.guardianContactViews += 1;
    updateLastActivity(row.adminUserId, row.createdAt);
  }

  const recentEvents = [
    ...resolvedAuditRows.map(row => ({ id: `security-${row.id}`, category: "security" as const, label: row.event, adminUserId: row.adminUserId, createdAt: row.createdAt })),
    ...moderationRows.filter(row => adminById.has(row.adminUserId)).map(row => ({ id: `moderation-${row.id}`, category: "tutor_moderation" as const, label: row.nextStatus, adminUserId: row.adminUserId, targetId: row.tutorId, createdAt: row.createdAt })),
    ...contactRows.filter(row => adminById.has(row.adminUserId)).map(row => ({ id: `contact-${row.id}`, category: "guardian_contact" as const, label: row.context, adminUserId: row.adminUserId, targetId: String(row.tutorRequestId), createdAt: row.createdAt })),
  ].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()).slice(0, 20).map(event => ({
    ...event,
    adminName: adminById.get(event.adminUserId)?.name ?? "Admin",
  }));

  return {
    windowDays: input.windowDays,
    generatedAt: new Date(),
    totals: {
      activeAdmins: activeAdmins.length,
      securityEvents: resolvedAuditRows.length,
      successfulLogins: resolvedAuditRows.filter(row => row.event === "login_success").length,
      failedLogins: resolvedAuditRows.filter(row => row.event === "login_failure").length,
      twoFactorVerifications: resolvedAuditRows.filter(row => row.event === "two_factor_success").length,
      tutorModerations: moderationRows.filter(row => adminById.has(row.adminUserId)).length,
      guardianContactViews: contactRows.filter(row => adminById.has(row.adminUserId)).length,
    },
    adminSummaries: Array.from(summaries.values()).sort((left, right) => {
      const rightActivity = right.lastActivityAt?.getTime() ?? 0;
      const leftActivity = left.lastActivityAt?.getTime() ?? 0;
      return rightActivity - leftActivity || left.name.localeCompare(right.name);
    }),
    recentEvents,
  };
}

/** Admin copy overrides for one page; an empty result means "use the code defaults". */
export async function listSiteContentOverrides(page: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      slotId: siteContentOverrides.slotId,
      text: siteContentOverrides.text,
      textSizePx: siteContentOverrides.textSizePx,
      paddingPx: siteContentOverrides.paddingPx,
      spacing: siteContentOverrides.spacing,
    })
    .from(siteContentOverrides)
    .where(eq(siteContentOverrides.page, page));
}

export async function saveSiteContentOverride(input: {
  slotId: string;
  page: string;
  text: string | null;
  textSizePx: number | null;
  paddingPx: number | null;
  spacing: string | null;
  updatedByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const values = { ...input };
  await db.insert(siteContentOverrides).values(values).onDuplicateKeyUpdate({
    set: {
      page: values.page,
      text: values.text,
      textSizePx: values.textSizePx,
      paddingPx: values.paddingPx,
      spacing: values.spacing,
      updatedByUserId: values.updatedByUserId,
    },
  });
}

/** Clearing an override is a delete, so the code default takes over again. */
export async function clearSiteContentOverride(slotId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(siteContentOverrides).where(eq(siteContentOverrides.slotId, slotId));
}

/** Active notice blocks for one page, in the order an Admin arranged them. */
export async function listSiteContentBlocks(page: string, options?: { includeInactive?: boolean }) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: siteContentBlocks.id,
      anchorId: siteContentBlocks.anchorId,
      heading: siteContentBlocks.heading,
      body: siteContentBlocks.body,
      tone: siteContentBlocks.tone,
      sortOrder: siteContentBlocks.sortOrder,
      active: siteContentBlocks.active,
    })
    .from(siteContentBlocks)
    .where(options?.includeInactive
      ? eq(siteContentBlocks.page, page)
      : and(eq(siteContentBlocks.page, page), eq(siteContentBlocks.active, 1)))
    .orderBy(asc(siteContentBlocks.anchorId), asc(siteContentBlocks.sortOrder), asc(siteContentBlocks.id));
  return rows;
}

export async function createSiteContentBlock(input: {
  anchorId: string;
  page: string;
  heading: string | null;
  body: string | null;
  tone: string;
  active: boolean;
  updatedByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  // New blocks land at the end of their anchor rather than jumping to the top.
  const [last] = await db
    .select({ sortOrder: siteContentBlocks.sortOrder })
    .from(siteContentBlocks)
    .where(eq(siteContentBlocks.anchorId, input.anchorId))
    .orderBy(desc(siteContentBlocks.sortOrder))
    .limit(1);
  await db.insert(siteContentBlocks).values({
    anchorId: input.anchorId,
    page: input.page,
    heading: input.heading,
    body: input.body,
    tone: input.tone,
    active: input.active ? 1 : 0,
    sortOrder: (last?.sortOrder ?? 0) + 1,
    updatedByUserId: input.updatedByUserId,
  });
}

export async function updateSiteContentBlock(id: number, input: {
  heading: string | null;
  body: string | null;
  tone: string;
  active: boolean;
  updatedByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(siteContentBlocks).set({
    heading: input.heading,
    body: input.body,
    tone: input.tone,
    active: input.active ? 1 : 0,
    updatedByUserId: input.updatedByUserId,
  }).where(eq(siteContentBlocks.id, id));
}

export async function deleteSiteContentBlock(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(siteContentBlocks).where(eq(siteContentBlocks.id, id));
}

/** Rewrites the order of one anchor's blocks from the supplied id sequence. */
export async function reorderSiteContentBlocks(anchorId: string, orderedIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  for (let index = 0; index < orderedIds.length; index += 1) {
    const id = orderedIds[index];
    await db.update(siteContentBlocks)
      .set({ sortOrder: index + 1 })
      .where(and(eq(siteContentBlocks.id, id), eq(siteContentBlocks.anchorId, anchorId)));
  }
}

/* ------------------------------------------------------------------ *
 * Option catalog administration
 *
 * The Owner-editable side of the five small catalogs the Tutor and
 * Request-a-tutor forms are built from. The searches above only ever return
 * active rows, because a form must not offer a retired option; these read and
 * write the whole table instead, hidden rows included.
 * ------------------------------------------------------------------ */

const optionCatalogTables = {
  subjects: { table: subjectsCatalog, usage: { table: tutorSubjects, column: tutorSubjects.subjectId } },
  "class-levels": { table: classLevels, usage: { table: tutorClassLevels, column: tutorClassLevels.classLevelId } },
  curricula: { table: curricula, usage: { table: tutorCurricula, column: tutorCurricula.curriculumId } },
  "student-types": { table: studentTypes, usage: { table: tutorStudentTypes, column: tutorStudentTypes.studentTypeId } },
  languages: { table: languagesCatalog, usage: { table: tutorTeachingLanguages, column: tutorTeachingLanguages.languageId } },
} as const;

export type OptionCatalogKey = keyof typeof optionCatalogTables;

function optionCatalogTable(catalog: OptionCatalogKey) {
  return optionCatalogTables[catalog];
}

/**
 * Every row of one catalog with the number of tutors currently using it.
 * The count is what makes deletion safe to offer: a row at zero can go, and a
 * row above zero can only be hidden.
 */
export async function listOptionCatalogEntries(catalog: OptionCatalogKey) {
  const db = await getDb();
  if (!db) return [];
  const { table, usage } = optionCatalogTable(catalog);
  const rows = await db
    .select({
      id: table.id,
      name: table.name,
      active: table.active,
      sortOrder: table.sortOrder,
      origin: table.origin,
      usageCount: sql<number>`(select count(*) from ${usage.table} where ${usage.column} = ${table.id})`,
    })
    .from(table)
    .orderBy(asc(table.sortOrder), asc(table.name));
  return rows.map(row => ({
    ...row,
    active: row.active === 1,
    // MySQL hands a subquery count back as a string through some drivers.
    usageCount: Number(row.usageCount ?? 0),
  }));
}

async function findOptionCatalogEntryByName(db: any, catalog: OptionCatalogKey, normalizedName: string) {
  const { table } = optionCatalogTable(catalog);
  const [existing] = await db
    .select({ id: table.id, name: table.name })
    .from(table)
    .where(eq(table.normalizedName, normalizedName))
    .limit(1);
  return existing as { id: number; name: string } | undefined;
}

/** Adds an Owner-created option at the end of the list. */
export async function createOptionCatalogEntry(catalog: OptionCatalogKey, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const { table } = optionCatalogTable(catalog);
  const normalizedName = normalizeCatalogName(name);

  const existing = await findOptionCatalogEntryByName(db, catalog, normalizedName);
  if (existing) return { created: false as const, id: existing.id, name: existing.name };

  const [last] = await db
    .select({ sortOrder: table.sortOrder })
    .from(table)
    .orderBy(desc(table.sortOrder))
    .limit(1);
  await db.insert(table).values({
    name: name.trim().replace(/\s+/g, " "),
    normalizedName,
    active: 1,
    sortOrder: (last?.sortOrder ?? 0) + 1,
    // Marked as the Owner's so the seed leaves it alone on the next deploy.
    origin: "admin",
  });
  return { created: true as const };
}

/**
 * Renames or hides one option. Editing a seed row flips it to "admin" so the
 * next deploy stops overwriting it - that flag is the whole reason the change
 * survives.
 */
export async function updateOptionCatalogEntry(
  catalog: OptionCatalogKey,
  id: number,
  input: { name: string; active: boolean },
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const { table } = optionCatalogTable(catalog);
  const normalizedName = normalizeCatalogName(input.name);

  const clash = await findOptionCatalogEntryByName(db, catalog, normalizedName);
  if (clash && clash.id !== id) return { renamed: false as const, clashesWith: clash.name };

  await db
    .update(table)
    .set({
      name: input.name.trim().replace(/\s+/g, " "),
      normalizedName,
      active: input.active ? 1 : 0,
      origin: "admin",
    })
    .where(eq(table.id, id));
  return { renamed: true as const };
}

/**
 * Removes an option outright. Only safe while nothing points at it, which the
 * caller checks first; the count is re-read here so a tutor who saved a profile
 * between the two cannot lose a selection.
 */
export async function deleteOptionCatalogEntry(catalog: OptionCatalogKey, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const { table, usage } = optionCatalogTable(catalog);

  const [used] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usage.table)
    .where(eq(usage.column, id));
  if (Number(used?.count ?? 0) > 0) return { deleted: false as const, usageCount: Number(used?.count ?? 0) };

  await db.delete(table).where(eq(table.id, id));
  return { deleted: true as const };
}

/** Applies a drag-and-drop reorder; ids missing from the list keep their place. */
export async function reorderOptionCatalogEntries(catalog: OptionCatalogKey, orderedIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const { table } = optionCatalogTable(catalog);
  for (let index = 0; index < orderedIds.length; index += 1) {
    await db.update(table).set({ sortOrder: index + 1 }).where(eq(table.id, orderedIds[index]));
  }
}

/* ------------------------------------------------------------------ *
 * Institute and Department administration
 *
 * The same edit rules as the five small catalogs, but searched and paged on
 * the server: at 300-odd rows each, sending the whole table to the browser to
 * be filtered there is neither quick nor kind to a phone.
 * ------------------------------------------------------------------ */

const largeCatalogTables = {
  institutes: {
    table: universities,
    // One place points at an Institute.
    usages: [{ table: tutorAcademicProfiles, column: tutorAcademicProfiles.universityId }],
  },
  departments: {
    table: facultyDepartments,
    // Two do for a Department, and both have to be counted or a delete that
    // looked safe would fail on a foreign key.
    usages: [
      { table: tutorAcademicProfiles, column: tutorAcademicProfiles.facultyDepartmentId },
      { table: degreeMajors, column: degreeMajors.facultyDepartmentId },
    ],
  },
} as const;

export type LargeCatalogKey = keyof typeof largeCatalogTables;

/**
 * A backtick-qualified reference to the outer query's `id`, for use inside a
 * correlated subquery.
 *
 * Interpolating the column itself is not enough: drizzle sometimes renders it
 * bare as `` `id` ``, and a bare `id` inside `select ... from other_table`
 * resolves against *that* table when it happens to have an `id` of its own -
 * so the subquery silently compares a row to itself and counts nothing. The
 * table name has to be written out.
 */
export function outerId(table: MySqlTable) {
  return sql.raw(`\`${getTableName(table)}\`.\`id\``);
}

/** `count(*)` across every table that can point at this row, as one expression. */
function largeCatalogUsageSql(catalog: LargeCatalogKey, table: any) {
  const { usages } = largeCatalogTables[catalog];
  const id = outerId(table);
  const parts = usages.map(usage => sql`(select count(*) from ${usage.table} where ${usage.column} = ${id})`);
  return parts.length === 1 ? parts[0] : sql`${parts[0]} + ${parts[1]}`;
}

/**
 * One page of a large catalog, filtered by `query`, with the number of rows
 * that matched so the client can page without counting them itself.
 *
 * Ordered by name rather than `sortOrder`: dragging a row through three hundred
 * is no way to arrange anything, so these read alphabetically and the search
 * box is how a row is found.
 */
export async function searchLargeCatalogEntries(
  catalog: LargeCatalogKey,
  input: { query: string; page: number; pageSize: number },
) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
  const { table } = largeCatalogTables[catalog];
  const pattern = input.query.trim() ? `%${input.query.trim()}%` : undefined;
  const where = pattern ? like(table.name, pattern) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(table)
    .where(where);

  const rows = await db
    .select({
      id: table.id,
      name: table.name,
      active: table.active,
      origin: table.origin,
      usageCount: largeCatalogUsageSql(catalog, table),
    })
    .from(table)
    .where(where)
    .orderBy(asc(table.name))
    .limit(input.pageSize)
    .offset(Math.max(0, input.page - 1) * input.pageSize);

  return {
    total: Number(total ?? 0),
    rows: rows.map(row => ({ ...row, active: row.active === 1, usageCount: Number(row.usageCount ?? 0) })),
  };
}

export async function createLargeCatalogEntry(catalog: LargeCatalogKey, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const { table } = largeCatalogTables[catalog];
  const normalizedName = normalizeCatalogName(name);

  const [existing] = await db
    .select({ id: table.id, name: table.name })
    .from(table)
    .where(eq(table.normalizedName, normalizedName))
    .limit(1);
  if (existing) return { created: false as const, name: existing.name };

  const [last] = await db.select({ sortOrder: table.sortOrder }).from(table).orderBy(desc(table.sortOrder)).limit(1);
  await db.insert(table).values({
    name: name.trim().replace(/\s+/g, " "),
    normalizedName,
    active: 1,
    sortOrder: (last?.sortOrder ?? 0) + 1,
    // Marked as the Owner's, so the seed leaves it alone on the next deploy.
    origin: "admin",
  });
  return { created: true as const };
}

export async function updateLargeCatalogEntry(
  catalog: LargeCatalogKey,
  id: number,
  input: { name: string; active: boolean },
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const { table } = largeCatalogTables[catalog];
  const normalizedName = normalizeCatalogName(input.name);

  const [clash] = await db
    .select({ id: table.id, name: table.name })
    .from(table)
    .where(eq(table.normalizedName, normalizedName))
    .limit(1);
  if (clash && clash.id !== id) return { renamed: false as const, clashesWith: clash.name };

  await db
    .update(table)
    .set({ name: input.name.trim().replace(/\s+/g, " "), normalizedName, active: input.active ? 1 : 0, origin: "admin" })
    .where(eq(table.id, id));
  return { renamed: true as const };
}

/** Removes a row, re-checking every referencing table first. */
export async function deleteLargeCatalogEntry(catalog: LargeCatalogKey, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const { table, usages } = largeCatalogTables[catalog];

  let inUse = 0;
  for (const usage of usages) {
    const [row] = await db.select({ count: sql<number>`count(*)` }).from(usage.table).where(eq(usage.column, id));
    inUse += Number(row?.count ?? 0);
  }
  if (inUse > 0) return { deleted: false as const, usageCount: inUse };

  await db.delete(table).where(eq(table.id, id));
  return { deleted: true as const };
}

/**
 * Every column that names a location, whether or not a foreign key backs it.
 *
 * Five of these are real foreign keys; `tutors.locationId` and the two on
 * `tutor_jobs` are not, so the database would let a delete orphan them without
 * complaint. Counting only the constrained ones would mean the screen reports
 * "nothing uses this" while five tutor profiles quietly lose their district.
 */
const locationUsageColumns = [
  { table: guardianProfiles, column: guardianProfiles.cityLocationId },
  { table: guardianProfiles, column: guardianProfiles.locationId },
  { table: tutors, column: tutors.locationId },
  { table: tutorTeachingAreas, column: tutorTeachingAreas.locationId },
  { table: tutorRequests, column: tutorRequests.tuitionCityLocationId },
  { table: tutorRequests, column: tutorRequests.tuitionLocationId },
  { table: tutorJobs, column: tutorJobs.cityLocationId },
  { table: tutorJobs, column: tutorJobs.locationId },
] as const;

/** `count(*)` across all eight of them, as one expression. */
function locationUsageSql() {
  const id = outerId(locations);
  const parts = locationUsageColumns.map(
    usage => sql`(select count(*) from ${usage.table} where ${usage.column} = ${id})`,
  );
  return parts.reduce((left, right) => sql`${left} + ${right}`);
}

// Self-referencing, so the alias is doing real work: without `child` the inner
// `locations` would shadow the outer one and every row would count itself.
const locationChildCountSql = sql<number>`(select count(*) from ${locations} as child where child.parentId = ${outerId(locations)})`;

type LocationCatalogRow = {
  id: string;
  label: string;
  type: string;
  active: boolean;
  origin: string;
  usageCount: number;
  childCount: number;
};

function toLocationCatalogRow(row: Record<string, unknown>): LocationCatalogRow {
  return {
    id: String(row.id),
    label: String(row.label),
    type: String(row.type),
    active: row.enabled === 1,
    origin: String(row.origin ?? "seed"),
    usageCount: Number(row.usageCount ?? 0),
    childCount: Number(row.childCount ?? 0),
  };
}

const locationSelection = {
  id: locations.id,
  label: locations.label,
  type: locations.type,
  enabled: locations.enabled,
  origin: locations.origin,
  usageCount: locationUsageSql(),
  childCount: locationChildCountSql,
};

type LocationTreeNode = { id: string; label: string; parentId: string | null };

/**
 * Every id, label and parent in one go, so an ancestor trail can be walked in
 * memory rather than with a query per level. The whole catalog is 597 rows -
 * cheaper to fetch once than to climb it five times.
 */
async function loadLocationTree(database: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const all = await database
    .select({ id: locations.id, label: locations.label, parentId: locations.parentId })
    .from(locations);
  return new Map<string, LocationTreeNode>(all.map(row => [row.id, { ...row, parentId: row.parentId ?? null }]));
}

function ancestorTrail(tree: Map<string, LocationTreeNode>, id: string | null) {
  const trail: Array<{ id: string; label: string }> = [];
  let cursor = id;
  // Bounded rather than `while (cursor)`: a parentId cycle would otherwise
  // hang the request, and the deepest real path is five levels.
  for (let depth = 0; cursor && depth < 12; depth += 1) {
    const node = tree.get(cursor);
    if (!node) break;
    trail.unshift({ id: node.id, label: node.label });
    cursor = node.parentId;
  }
  return trail;
}

/**
 * One level of the tree: the children of `parentId`, or the roots when it is
 * null, with the trail of ancestors above them for the breadcrumb.
 */
export async function browseLocations(input: { parentId: string | null; query: string; page: number; pageSize: number }) {
  const database = await getDb();
  if (!database) return { rows: [], total: 0, trail: [], parentType: null };

  const term = input.query.trim();
  const where = and(
    input.parentId === null ? isNull(locations.parentId) : eq(locations.parentId, input.parentId),
    term ? like(locations.label, `%${term}%`) : undefined,
  );

  const [totalRow] = await database.select({ total: sql<number>`count(*)` }).from(locations).where(where);

  const rows = await database
    .select(locationSelection)
    .from(locations)
    .where(where)
    // Coarser levels first, then alphabetically, so a city's thanas do not sit
    // shuffled in among its areas.
    .orderBy(asc(locations.type), asc(locations.label))
    .limit(input.pageSize)
    .offset(Math.max(0, input.page - 1) * input.pageSize);

  const tree = await loadLocationTree(database);
  let parentType: string | null = null;
  if (input.parentId) {
    const [parent] = await database
      .select({ type: locations.type })
      .from(locations)
      .where(eq(locations.id, input.parentId))
      .limit(1);
    parentType = parent?.type ?? null;
  }

  return {
    total: Number(totalRow?.total ?? 0),
    rows: rows.map(toLocationCatalogRow),
    trail: ancestorTrail(tree, input.parentId),
    parentType,
  };
}

/**
 * Searches the whole tree rather than one level, because an Owner looking for
 * "Mirpur" should not have to remember which city holds it. Each hit carries
 * the path to it, which is the only thing telling one "Bazar" from another.
 */
export async function searchLocations(input: { query: string; page: number; pageSize: number }) {
  const database = await getDb();
  if (!database) return { rows: [], total: 0 };
  const term = input.query.trim();
  if (!term) return { rows: [], total: 0 };

  const where = like(locations.label, `%${term}%`);
  const [totalRow] = await database.select({ total: sql<number>`count(*)` }).from(locations).where(where);

  const rows = await database
    .select({ ...locationSelection, parentId: locations.parentId })
    .from(locations)
    .where(where)
    .orderBy(asc(locations.type), asc(locations.label))
    .limit(input.pageSize)
    .offset(Math.max(0, input.page - 1) * input.pageSize);

  const tree = await loadLocationTree(database);
  return {
    total: Number(totalRow?.total ?? 0),
    rows: rows.map(row => ({
      ...toLocationCatalogRow(row),
      parentId: row.parentId ?? null,
      path: ancestorTrail(tree, row.parentId ?? null).map(step => step.label),
    })),
  };
}

/** A free id in the style of the stored ones, with a fallback for labels that slugify to nothing. */
async function reserveLocationId(database: NonNullable<Awaited<ReturnType<typeof getDb>>>, label: string) {
  const base = locationSlug(label) || `loc-${Date.now().toString(36)}`;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`.slice(0, MAX_LOCATION_ID_LENGTH);
    const [taken] = await database.select({ id: locations.id }).from(locations).where(eq(locations.id, candidate)).limit(1);
    if (!taken) return candidate;
  }
  return `loc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function createLocation(input: { parentId: string; type: string; label: string }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");

  const [parent] = await database
    .select({ id: locations.id, type: locations.type, country: locations.country })
    .from(locations)
    .where(eq(locations.id, input.parentId))
    .limit(1);
  if (!parent) return { created: false as const, reason: "missing-parent" as const };
  if (!isValidChildType(parent.type as LocationType, input.type as LocationType)) {
    return { created: false as const, reason: "bad-type" as const, parentType: parent.type };
  }

  const label = input.label.trim().replace(/\s+/g, " ");
  // The unique index is on (parentId, type, label), so a clash is only a clash
  // under the same parent: two "Bazar Area" in different cities are both fine.
  const [clash] = await database
    .select({ label: locations.label })
    .from(locations)
    .where(and(
      eq(locations.parentId, input.parentId),
      eq(locations.type, input.type as LocationType),
      eq(locations.label, label),
    ))
    .limit(1);
  if (clash) return { created: false as const, reason: "duplicate" as const, label: clash.label };

  const id = await reserveLocationId(database, label);
  await database.insert(locations).values({
    id,
    label,
    type: input.type as LocationType,
    country: parent.country,
    parentId: parent.id,
    enabled: 1,
    // The Owner's own row, so a later migration refreshing the shipped catalog
    // leaves it alone.
    origin: "admin",
  });
  return { created: true as const, id };
}

export async function updateLocation(id: string, input: { label: string; active: boolean }) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");

  const [current] = await database
    .select({ parentId: locations.parentId, type: locations.type })
    .from(locations)
    .where(eq(locations.id, id))
    .limit(1);
  if (!current) return { renamed: false as const, reason: "missing" as const };

  const label = input.label.trim().replace(/\s+/g, " ");
  const [clash] = await database
    .select({ id: locations.id, label: locations.label })
    .from(locations)
    .where(and(
      current.parentId === null ? isNull(locations.parentId) : eq(locations.parentId, current.parentId),
      eq(locations.type, current.type),
      eq(locations.label, label),
    ))
    .limit(1);
  if (clash && clash.id !== id) return { renamed: false as const, reason: "duplicate" as const, label: clash.label };

  await database
    .update(locations)
    .set({ label, enabled: input.active ? 1 : 0, origin: "admin" })
    .where(eq(locations.id, id));
  return { renamed: true as const };
}

/**
 * Removes a location, refusing while anything still names it or hangs beneath
 * it. Children are checked as well as usages: deleting a city would otherwise
 * strand its areas somewhere no breadcrumb reaches.
 */
/**
 * Moves a place under a different parent.
 *
 * Without this the only way to correct a place added in the wrong spot was to
 * delete it and add it again - and a place anyone has already chosen cannot be
 * deleted, so the mistake stayed. Moving keeps the id, which is what Guardian
 * profiles and published jobs actually store, so nothing they point at breaks.
 *
 * Four things can make a move wrong, and all four are checked here rather than
 * trusted from the screen:
 *
 *   - the destination has to exist;
 *   - it has to be allowed to hold this kind of place (the rank rule);
 *   - it must not be the place itself or anything inside it, which would cut a
 *     branch off the tree and leave it pointing at nobody;
 *   - the destination must not already hold a place of the same type and name,
 *     which the unique index would refuse anyway, but with a worse message.
 */
export async function moveLocation(id: string, newParentId: string) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");

  const [node] = await database
    .select({ id: locations.id, label: locations.label, type: locations.type, parentId: locations.parentId })
    .from(locations)
    .where(eq(locations.id, id))
    .limit(1);
  if (!node) return { moved: false as const, reason: "missing" as const };
  if (node.parentId === newParentId) return { moved: false as const, reason: "already-there" as const };

  const [parent] = await database
    .select({ id: locations.id, label: locations.label, type: locations.type, country: locations.country })
    .from(locations)
    .where(eq(locations.id, newParentId))
    .limit(1);
  if (!parent) return { moved: false as const, reason: "missing-parent" as const };

  // Asked before the type check, which would otherwise answer first and answer
  // worse: a place dropped into itself fails the rank rule too, and "an Area
  // cannot sit inside an Area" is a confusing way to say "that is the same
  // place". Walking up from the destination is the cheap way to ask whether the
  // destination is inside the thing being carried; the tree is 597 rows, so it
  // is loaded whole rather than climbed with a query per level.
  //
  // Note this is a belt on top of braces. The rank rule already makes a cycle
  // impossible - a descendant always outranks its ancestor, so no descendant
  // can ever be a legal parent - but that is a property of the rank table
  // rather than of this function, and it should not go unguarded here if the
  // table is ever rearranged.
  const tree = await loadLocationTree(database);
  if (newParentId === id || ancestorTrail(tree, newParentId).some(step => step.id === id)) {
    return { moved: false as const, reason: "into-itself" as const, label: node.label };
  }

  if (!isValidChildType(parent.type as LocationType, node.type as LocationType)) {
    return { moved: false as const, reason: "bad-type" as const, parentType: parent.type, nodeType: node.type };
  }

  const [clash] = await database
    .select({ id: locations.id, label: locations.label })
    .from(locations)
    .where(and(
      eq(locations.parentId, newParentId),
      eq(locations.type, node.type),
      eq(locations.label, node.label),
    ))
    .limit(1);
  if (clash && clash.id !== id) {
    return { moved: false as const, reason: "duplicate" as const, label: clash.label, parentLabel: parent.label };
  }

  await database
    .update(locations)
    // `country` follows the new parent: it is the country the place is in, not
    // a label of its own, so leaving the old one behind would be a quiet lie.
    .set({ parentId: parent.id, country: parent.country, origin: "admin" })
    .where(eq(locations.id, id));

  return { moved: true as const, label: node.label, parentLabel: parent.label };
}

export async function deleteLocation(id: string) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");

  const [child] = await database
    .select({ count: sql<number>`count(*)` })
    .from(locations)
    .where(eq(locations.parentId, id));
  const childCount = Number(child?.count ?? 0);
  if (childCount > 0) return { deleted: false as const, reason: "has-children" as const, childCount };

  let inUse = 0;
  for (const usage of locationUsageColumns) {
    const [row] = await database.select({ count: sql<number>`count(*)` }).from(usage.table).where(eq(usage.column, id));
    inUse += Number(row?.count ?? 0);
  }
  if (inUse > 0) return { deleted: false as const, reason: "in-use" as const, usageCount: inUse };

  await database.delete(locations).where(eq(locations.id, id));
  return { deleted: true as const };
}

/**
 * The legal page bodies the Owner writes.
 *
 * Overrides, never replacements, like the rest of the content control: a row
 * exists only for a page the Owner has actually edited, so an empty table
 * renders the bodies the code ships and "Reset" is a delete.
 */
export async function listPolicyDocuments() {
  const database = await getDb();
  if (!database) return [];
  const rows = await database
    .select({ pageKey: sitePolicyDocuments.pageKey, body: sitePolicyDocuments.body, updatedAt: sitePolicyDocuments.updatedAt })
    .from(sitePolicyDocuments);
  return rows.map(row => ({ ...row, updatedAt: row.updatedAt ?? null }));
}

export async function savePolicyDocument(pageKey: string, body: string) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  await database
    .insert(sitePolicyDocuments)
    .values({ pageKey, body })
    .onDuplicateKeyUpdate({ set: { body } });
  return { pageKey };
}

/** Drops the Owner's version, so the page falls back to the body in the registry. */
export async function resetPolicyDocument(pageKey: string) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  await database.delete(sitePolicyDocuments).where(eq(sitePolicyDocuments.pageKey, pageKey));
  return { pageKey };
}

/**
 * The Owner's numbers, folded onto the ones the code ships with.
 *
 * Every request that validates a capped field calls this, so it is cached for
 * a short while rather than queried each time. Short, because an Owner who
 * lowers a limit should see it take effect while they are still looking at the
 * screen - not because staleness would be dangerous.
 */
let siteLimitCache: { values: SiteLimitValues; readAt: number } | null = null;
const SITE_LIMIT_CACHE_MS = 15_000;

export async function getSiteLimits(): Promise<SiteLimitValues> {
  if (siteLimitCache && Date.now() - siteLimitCache.readAt < SITE_LIMIT_CACHE_MS) return siteLimitCache.values;
  const database = await getDb();
  // Without a database the shipped numbers are the honest answer: they are what
  // the code was written against.
  if (!database) return defaultSiteLimits();
  const rows = await database.select({ limitId: siteLimitsTable.limitId, value: siteLimitsTable.value }).from(siteLimitsTable);
  const values = resolveSiteLimits(rows.map(row => ({ limitId: row.limitId, value: Number(row.value) })));
  siteLimitCache = { values, readAt: Date.now() };
  return values;
}

/** Rows as stored, for the editor - which must show what was saved, not what was resolved. */
export async function listSiteLimitOverrides() {
  const database = await getDb();
  if (!database) return [];
  return database
    .select({ limitId: siteLimitsTable.limitId, value: siteLimitsTable.value })
    .from(siteLimitsTable);
}

export async function saveSiteLimit(limitId: string, value: number) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  await database
    .insert(siteLimitsTable)
    .values({ limitId, value })
    .onDuplicateKeyUpdate({ set: { value } });
  siteLimitCache = null;
  return { limitId, value };
}

/** Drops the Owner's number, so the limit falls back to the shipped one. */
export async function resetSiteLimit(limitId: string) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  await database.delete(siteLimitsTable).where(eq(siteLimitsTable.limitId, limitId));
  siteLimitCache = null;
  return { limitId };
}

/**
 * The login id an Admin signs in with, for the workspace header.
 *
 * Their display name comes from `users`, but that is not what they type at
 * `/admin/login`, and with more than one Admin the name alone does not say
 * which account is open.
 */
export async function getAdminLoginId(userId: number) {
  const database = await getDb();
  if (!database) return null;
  const [row] = await database
    .select({ loginId: adminCredentials.loginId })
    .from(adminCredentials)
    .where(eq(adminCredentials.userId, userId))
    .limit(1);
  return row?.loginId ?? null;
}
