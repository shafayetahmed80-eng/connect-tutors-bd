import { COOKIE_NAME, ONE_YEAR_MS, PENDING_REDIRECT_COOKIE } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { createGuardianIntakeHandoff, verifyGuardianIntakeHandoff } from "./guardian-intake-handoff";
import { guardianRegistrationSchema, GuardianRegistrationError, GUARDIAN_TERMS_VERSION } from "./guardian-registration.validation";
import { GuardianIntakeValidationError, normalizeBangladeshMobile } from "./guardian-intake.validation";
import {
  getGuardianProfilePhotoForOwner,
  getPendingGuardianPhotoModerationQueue,
  reviewGuardianProfilePhoto,
} from "./guardian-profile-photo";
import { adminProcedure, guardianProcedure, protectedProcedure, publicProcedure, router, tutorProcedure } from "./_core/trpc";
import { notifyTelegramAdmin } from "./telegram-notification";
import { getSafeTutorProfileFieldIssues } from "./tutor-profile-error-contract";
import { tutorProfileEditableDraftSchema } from "./tutor-profile.validation";
import { guardianProfilePhotoRejectionReasonValues } from "../drizzle/schema";
import { generateAdminInviteToken, hashAdminInviteToken } from "./admin-security";
import {
  createTutorPortalExpiry,
  createTutorPortalToken,
  getTutorPortalTokenFromHeaders,
  hashTutorPortalToken,
} from "./tutor-portal-session";

export const tuitionTypeSchema = z.enum(["home", "online", "both"]);
export const guardianRequestTuitionTypeSchema = z.enum(["home", "online", "both", "group", "package"]);
const tutorAuthInputSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(160),
  email: z.string().trim().email("Enter a valid email address.").max(320),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
  confirmPassword: z.string().min(8).max(128),
  phone: z.string().trim().regex(/^\+8801[3-9]\d{8}$/, "Enter a valid Bangladesh mobile number."),
  gender: z.enum(["male", "female"]),
  cityId: z.string().trim().min(1).max(80),
  locationId: z.string().trim().min(1).max(80),
}).refine(value => value.password === value.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});
const tutorLoginInputSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(320),
  password: z.string().min(1, "Enter your password.").max(128),
});
const passwordAccountLoginInputSchema = z.object({
  role: z.enum(["guardian", "tutor"]),
  identifier: z.string().trim().min(1, "Enter your email or mobile number.").max(320),
  password: z.string().min(1, "Enter your password.").max(128),
});
const PASSWORD_ACCOUNT_LOGIN_ERROR = "Email/mobile number or password is not correct.";
const adminPasswordLoginInputSchema = z.object({
  userId: z.string().trim().min(1, "Enter your User ID.").max(64),
  password: z.string().min(1, "Enter your password.").max(128),
});
const ADMIN_PASSWORD_LOGIN_ERROR = "User ID or password is not correct.";

const activeTutorIdentityProcedure = tutorProcedure.use(async ({ ctx, next }) => {
  const accountStatus = await db.getTutorAccountStatusByUserId(ctx.user.id);
  if (accountStatus !== "active") {
    throw new TRPCError({ code: "FORBIDDEN", message: "This Tutor account is not active." });
  }
  return next({ ctx });
});

const activeTutorProcedure = activeTutorIdentityProcedure.use(async ({ ctx, next }) => {
  const token = getTutorPortalTokenFromHeaders(ctx.req.headers);
  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in to open this Tutor Dashboard tab." });
  }
  const now = new Date();
  const isActive = await db.renewTutorPortalSession({
    userId: ctx.user.id,
    tokenHash: hashTutorPortalToken(token),
    now,
    nextExpiry: createTutorPortalExpiry(now),
  });
  if (!isActive) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "This Tutor Dashboard tab has expired. Sign in again to continue." });
  }
  return next({ ctx });
});

async function issueTutorPortalSession(userId: number) {
  const token = createTutorPortalToken();
  await db.createTutorPortalSession({
    userId,
    tokenHash: hashTutorPortalToken(token),
    expiresAt: createTutorPortalExpiry(),
  });
  return token;
}

async function getAuthenticatedTutorProfileId(userId: number) {
  const profile = await db.getTutorProfileByUserId(userId);
  if (!profile?.tutorId) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complete your Tutor registration before responding to Job Board listings." });
  }
  return profile.tutorId;
}

async function getApprovedTutorProfileId(userId: number) {
  const profile = await db.getTutorProfileByUserId(userId);
  if (!profile?.tutorId || profile.profileStatus !== "approved") {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complete and verify your Tutor profile before applying to Job Board listings." });
  }
  return profile.tutorId;
}

function rethrowTutorInterestError(error: unknown): never {
  if (!(error instanceof Error)) throw error;
  const errors: Record<string, TRPCError> = {
    TUTOR_INTEREST_ALREADY_INTERESTED: new TRPCError({ code: "CONFLICT", message: "You have already expressed interest in this tuition." }),
    TUTOR_INTEREST_JOB_UNAVAILABLE: new TRPCError({ code: "CONFLICT", message: "This tuition is no longer available for interest." }),
    TUTOR_INTEREST_NOT_FOUND: new TRPCError({ code: "NOT_FOUND", message: "Your Job Board interest was not found." }),
    TUTOR_INTEREST_INVALID_TRANSITION: new TRPCError({ code: "CONFLICT", message: "This interest cannot be moved to that status." }),
    TUTOR_INTEREST_ADMIN_ONLY: new TRPCError({ code: "FORBIDDEN", message: "Only an Admin can perform that interest action." }),
  };
  throw errors[error.message] ?? error;
}

function rethrowProfileValidationError(error: unknown): never {
  if (error instanceof db.TutorProfileStateError) {
    throw new TRPCError({ code: "CONFLICT", message: error.message });
  }
  if (error instanceof db.TutorProfileValidationError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error.issues.map(issue => issue.message).join(" "),
      cause: { tutorProfileFieldIssues: getSafeTutorProfileFieldIssues(error.issues) },
    });
  }
  throw error;
}

const catalogSearchInputSchema = z.object({
  query: z.string().trim().max(100).default(""),
  limit: z.number().int().min(1).max(50).default(30),
});

const tutorListingInputSchema = z.object({
  query: z.string().trim().max(100).default(""),
  country: z.string().trim().max(120).default("all"),
  city: z.string().trim().max(120).default("all"),
  division: z.string().trim().max(120).default("all"),
  district: z.string().trim().max(120).default("all"),
  mode: tuitionTypeSchema.or(z.literal("all")).default("all"),
  subjects: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  levels: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  languages: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
  gender: z.enum(["all", "male", "female"]).default("all"),
  verifiedOnly: z.boolean().default(false),
  minFee: z.number().int().min(0).max(500000).optional(),
  maxFee: z.number().int().min(0).max(500000).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(6),
}).refine(value => value.minFee === undefined || value.maxFee === undefined || value.minFee <= value.maxFee, {
  message: "Minimum fee cannot exceed maximum fee.",
  path: ["minFee"],
});

const adminMatchingRequestInputSchema = z.object({
  query: z.string().trim().max(100).default(""),
  status: z.enum(["all", "new", "reviewing", "matched", "closed"]).default("all"),
  lifecycle: z.enum(["all", "pending", "live", "appointed", "confirmed", "cancelled"]).default("all"),
  tuitionType: guardianRequestTuitionTypeSchema.or(z.literal("all")).default("all"),
  preferredGender: z.enum(["all", "male", "female", "any"]).default("all"),
  contactConsent: z.enum(["all", "not_required", "pending", "approved", "declined"]).default("all"),
  subject: z.string().trim().max(100).default(""),
  category: z.string().trim().max(120).default(""),
  location: z.string().trim().max(120).default(""),
  assignmentState: z.enum(["all", "assigned", "unassigned"]).default("all"),
  appointmentState: z.enum(["all", "confirmed", "pending"]).default("all"),
  cancellationState: z.enum(["all", "active", "cancelled"]).default("all"),
  budgetMinimum: z.number().int().min(0).max(1000000).optional(),
  budgetMaximum: z.number().int().min(0).max(1000000).optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
  lastActivityAfter: z.coerce.date().optional(),
  lastActivityBefore: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
})
  .refine(value => value.budgetMinimum === undefined || value.budgetMaximum === undefined || value.budgetMinimum <= value.budgetMaximum, { message: "Minimum budget cannot exceed maximum budget.", path: ["budgetMinimum"] })
  .refine(value => value.createdAfter === undefined || value.createdBefore === undefined || value.createdAfter <= value.createdBefore, { message: "Created-date range is invalid.", path: ["createdAfter"] })
  .refine(value => value.lastActivityAfter === undefined || value.lastActivityBefore === undefined || value.lastActivityAfter <= value.lastActivityBefore, { message: "Activity-date range is invalid.", path: ["lastActivityAfter"] });

const adminMatchingSavedViewFiltersInputSchema = z.object({
  query: z.string().trim().max(100).optional(),
  status: z.enum(["all", "new", "reviewing", "matched", "closed"]).optional(),
  lifecycle: z.enum(["all", "pending", "live", "appointed", "confirmed", "cancelled"]).optional(),
  tuitionType: guardianRequestTuitionTypeSchema.or(z.literal("all")).optional(),
  preferredGender: z.enum(["all", "male", "female", "any"]).optional(),
  contactConsent: z.enum(["all", "not_required", "pending", "approved", "declined"]).optional(),
  subject: z.string().trim().max(100).optional(),
  category: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  assignmentState: z.enum(["all", "assigned", "unassigned"]).optional(),
  appointmentState: z.enum(["all", "confirmed", "pending"]).optional(),
  cancellationState: z.enum(["all", "active", "cancelled"]).optional(),
  budgetMinimum: z.number().int().min(0).max(1_000_000).optional(),
  budgetMaximum: z.number().int().min(0).max(1_000_000).optional(),
  createdAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(),
  createdBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(),
  lastActivityAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(),
  lastActivityBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(),
  pageSize: z.number().int().min(1).max(50).optional(),
}).strict()
  .refine(value => value.budgetMinimum === undefined || value.budgetMaximum === undefined || value.budgetMinimum <= value.budgetMaximum, { message: "Minimum budget cannot exceed maximum budget.", path: ["budgetMinimum"] })
  .refine(value => !value.createdAfter || !value.createdBefore || value.createdAfter <= value.createdBefore, { message: "Created-date range is invalid.", path: ["createdAfter"] })
  .refine(value => !value.lastActivityAfter || !value.lastActivityBefore || value.lastActivityAfter <= value.lastActivityBefore, { message: "Activity-date range is invalid.", path: ["lastActivityAfter"] });

const adminTutorRequestStatusInputSchema = z.object({
  requestId: z.number().int().positive(),
  status: z.literal("reviewing"),
});

const adminTutorRequestPublicationEditSchema = z.object({
  category: z.string().trim().min(1).max(120).optional(),
  classCourse: z.string().trim().min(1).max(120).optional(),
  subjects: z.array(z.string().trim().min(1).max(120)).min(1).max(12).optional(),
  daysPerWeek: z.number().int().min(1).max(7).optional(),
  preferredGender: z.enum(["male", "female", "any"]).optional(),
  budget: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("range"),
      minimum: z.number().int().min(0).max(1000000),
      maximum: z.number().int().min(0).max(1000000),
    }).refine(value => value.minimum <= value.maximum, {
      message: "Minimum budget cannot exceed maximum budget.",
      path: ["minimum"],
    }),
    z.object({ kind: z.literal("discuss") }),
  ]).optional(),
}).refine(value => Object.values(value).some(entry => entry !== undefined), {
  message: "Provide at least one approved job-facing edit.",
});

const adminTutorRequestPublicationInputSchema = z.object({
  requestId: z.number().int().positive(),
  action: z.enum(["verify", "edit", "guardian_confirmed", "guardian_reconfirmed", "request_changes", "approve", "publish", "extend_expiry", "unpublish", "close"]),
  reason: z.string().trim().max(1000).optional(),
  edit: adminTutorRequestPublicationEditSchema.optional(),
  manualJobId: z.string().trim().min(3).max(32).optional(),
}).superRefine((value, context) => {
  if (value.action === "edit" && !value.edit) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["edit"], message: "A safe job-facing edit is required." });
  }
  if (value.action === "request_changes" && !value.reason) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["reason"], message: "A Guardian follow-up reason is required." });
  }
  if (value.manualJobId && value.action !== "publish") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["manualJobId"], message: "A manual Job ID can only be set while publishing." });
  }
});

const publishedTutorJobBoardInputSchema = z.object({
  cityId: z.string().trim().min(1).max(80).optional(),
  locationId: z.string().trim().min(1).max(80).optional(),
  tuitionType: guardianRequestTuitionTypeSchema.optional(),
  preferredTutorGender: z.enum(["male", "female", "any"]).optional(),
  category: z.string().trim().min(1).max(120).optional(),
  subject: z.string().trim().min(1).max(120).optional(),
  budgetMinimum: z.number().int().min(0).max(1000000).optional(),
  budgetMaximum: z.number().int().min(0).max(1000000).optional(),
  jobId: z.string().trim().min(3).max(32).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
}).refine(value => value.budgetMinimum === undefined || value.budgetMaximum === undefined || value.budgetMinimum <= value.budgetMaximum, {
  message: "Minimum budget cannot exceed maximum budget.",
  path: ["budgetMinimum"],
});

const adminTutorDirectoryInputSchema = z.object({
  query: z.string().trim().max(100).default(""),
  profileStatus: z.enum(["all", "draft", "pending", "changes_requested", "approved", "suspended"]).default("all"),
  verified: z.enum(["all", "verified", "unverified"]).default("all"),
  location: z.string().trim().max(160).default(""),
  subject: z.string().trim().max(100).default(""),
  tuitionType: tuitionTypeSchema.or(z.literal("all")).default("all"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

const adminTutorModerationInputSchema = z.object({
  tutorId: z.string().trim().min(1).max(32),
  nextStatus: z.enum(["approved", "changes_requested", "suspended"]),
  reason: z.string().trim().max(1000).optional(),
});

const adminGuardianRequestInputSchema = z.object({
  query: z.string().trim().max(100).default(""),
  status: z.enum(["all", "new", "reviewing", "matched", "closed"]).default("all"),
  contactConsent: z.enum(["all", "not_required", "pending", "approved", "declined"]).default("all"),
  tuitionType: guardianRequestTuitionTypeSchema.or(z.literal("all")).default("all"),
  location: z.string().trim().max(160).default(""),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

const GUARDIAN_INTAKE_HANDOFF_TTL_MS = 20 * 60 * 1000;

function getRequestIp(ctx: { req: { headers: Record<string, string | string[] | undefined>; ip?: string } }) {
  const forwarded = ctx.req.headers["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return forwardedValue?.split(",")[0]?.trim() || ctx.req.ip || "unknown";
}

const ownerAdminProcedure = adminProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the Project Owner can manage Admin security." });
  }
  return next({ ctx });
});

async function setPasswordSession(ctx: { req: Parameters<typeof getSessionCookieOptions>[0]; res: { cookie: (name: string, value: string, options: Record<string, unknown>) => void } }, user: { openId: string; name: string | null }) {
  const sessionToken = await sdk.createSessionToken(user.openId, {
    name: user.name ?? "",
    expiresInMs: ONE_YEAR_MS,
  });
  ctx.res.cookie(COOKIE_NAME, sessionToken, getSessionCookieOptions(ctx.req));
}

/** Browser-safe account identity; server authorization continues to use complete user rows. */
export function toClientAuthIdentity(user: {
  id: number;
  name: string | null;
  role: "guardian" | "tutor" | "admin" | "user";
  accountStatus: "active" | "suspended" | "closed";
}) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    accountStatus: user.accountStatus,
  } as const;
}
const tutorRequestBudgetSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("range"),
    minimum: z.number().int().min(0).max(1000000),
    maximum: z.number().int().min(0).max(1000000),
  }).refine(value => value.minimum <= value.maximum, {
    message: "Minimum budget cannot exceed maximum budget.",
    path: ["minimum"],
  }),
  z.object({ kind: z.literal("discuss") }),
]);

const tutorRequestBaseInputSchema = z.object({
  category: z.string().trim().min(1).max(120),
  curriculumType: z.string().trim().max(32).optional(),
  classCourse: z.string().trim().min(1).max(120),
  subjects: z.array(z.string().trim().min(1)).min(1).max(12),
  daysPerWeek: z.number().int().min(1).max(7),
  preferredGender: z.enum(["male", "female", "any"]),
  studentFirstName: z.string().trim().min(1).max(80).optional(),
  studentGender: z.enum(["male", "female"]).optional(),
  addressDetails: z.string().trim().min(1).max(160).optional(),
  budget: tutorRequestBudgetSchema,
  notes: z.string().trim().max(2000).optional(),
});

export const tutorRequestInputSchema = z.discriminatedUnion("tuitionType", [
  tutorRequestBaseInputSchema.extend({
    tuitionType: z.literal("home"),
    tuitionCityLocationId: z.string().trim().min(1).max(80),
    tuitionLocationId: z.string().trim().min(1).max(80),
    studentCount: z.number().int().min(1).max(100),
  }).strict(),
  tutorRequestBaseInputSchema.extend({
    tuitionType: z.literal("both"),
    tuitionCityLocationId: z.string().trim().min(1).max(80),
    tuitionLocationId: z.string().trim().min(1).max(80),
  }).strict(),
  tutorRequestBaseInputSchema.extend({
    tuitionType: z.literal("group"),
    tuitionCityLocationId: z.string().trim().min(1).max(80),
    tuitionLocationId: z.string().trim().min(1).max(80),
    groupCapacity: z.number().int().min(2).max(100),
  }).strict(),
  tutorRequestBaseInputSchema.extend({
    tuitionType: z.literal("package"),
    tuitionCityLocationId: z.string().trim().min(1).max(80),
    tuitionLocationId: z.string().trim().min(1).max(80),
    packageDurationMonths: z.number().int().min(1).max(24),
    studentCount: z.number().int().min(1).max(100),
  }).strict(),
  tutorRequestBaseInputSchema.extend({
    tuitionType: z.literal("online"),
    studentCount: z.number().int().min(1).max(100),
  }).strict(),
]).superRefine((input, ctx) => {
  const curriculumTypes = ["British", "Cambridge", "Ed-excel"] as const;
  if (input.category === "English Medium" && !curriculumTypes.includes(input.curriculumType as typeof curriculumTypes[number])) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["curriculumType"], message: "Choose a Curriculum Type for English Medium to continue." });
  }
  if (input.category !== "English Medium" && input.curriculumType !== undefined && input.curriculumType !== "") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["curriculumType"], message: "Curriculum Type is only available for English Medium requests." });
  }
});

const guardianPendingTutorRequestUpdateSchema = z.object({
  requestId: z.number().int().positive(),
}).passthrough().and(z.preprocess(value => {
  if (!value || typeof value !== "object") return value;
  const { requestId: _requestId, ...requestInput } = value as Record<string, unknown>;
  return requestInput;
}, tutorRequestInputSchema));

export const tutorProfileInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().regex(/^\+?[0-9\s-]{10,24}$/, "Enter a valid mobile number."),
  contactEmail: z.string().trim().email().max(320),
  gender: z.enum(["male", "female"]),
  subjects: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
  levels: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
  experience: z.number().int().min(0).max(60),
  fee: z.number().int().min(0).max(500000),
  mode: tuitionTypeSchema,
  locationId: z.string().trim().min(1).max(80),
  institution: z.string().trim().min(2).max(240),
  education: z.string().trim().min(2).max(240),
  availability: z.string().trim().min(2).max(160),
  languages: z.array(z.string().trim().min(1).max(60)).min(1).max(6),
  about: z.string().trim().min(20).max(2000),
});

export const appRouter = router({
  system: router({}),
  guardianIntake: router({
    capturePhone: publicProcedure
      .input(z.object({ phone: z.string().trim().min(1).max(32) }))
      .mutation(async ({ ctx, input }) => {
        let phone: string;
        try {
          phone = normalizeBangladeshMobile(input.phone);
        } catch (error) {
          if (error instanceof GuardianIntakeValidationError) {
            throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          }
          throw error;
        }

        const handoff = createGuardianIntakeHandoff({
          secret: ENV.cookieSecret,
          ttlMs: GUARDIAN_INTAKE_HANDOFF_TTL_MS,
        });
        try {
          await db.createOrResumeGuardianPhoneIntake({
            phone,
            handoffTokenHash: handoff.tokenHash,
            handoffExpiresAt: handoff.expiresAt,
          });
        } catch {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "আমরা এখন আপনার নম্বরটি সংরক্ষণ করতে পারছি না। অনুগ্রহ করে আবার চেষ্টা করুন।",
          });
        }
        ctx.res.cookie("guardian-intake-handoff", handoff.cookieValue, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: GUARDIAN_INTAKE_HANDOFF_TTL_MS,
        });

        return { success: true } as const;
      }),
  }),
  guardianAuth: router({
    register: publicProcedure.input(guardianRegistrationSchema).mutation(async ({ ctx, input }) => {
      const handoff = verifyGuardianIntakeHandoff(parseCookieHeader(ctx.req.headers.cookie ?? "")["guardian-intake-handoff"], { secret: ENV.cookieSecret });
      if (!handoff) throw new TRPCError({ code: "UNAUTHORIZED", message: "আপনার নিবন্ধন সেশনটি আর সক্রিয় নেই। ফোন নম্বর দিয়ে আবার শুরু করুন।" });
      let result: Awaited<ReturnType<typeof db.registerGuardianFromIntake>>;
      try {
        const { confirmPassword: _confirmPassword, termsAccepted: _termsAccepted, ...registration } = input;
        result = await db.registerGuardianFromIntake({ ...registration, phone: input.phone ?? "", termsVersion: GUARDIAN_TERMS_VERSION, handoffTokenHash: handoff.tokenHash });
      } catch (error) {
        if (error instanceof GuardianRegistrationError) {
          if (error.reason === "duplicate") throw new TRPCError({ code: "CONFLICT", message: "এই তথ্য দিয়ে নিবন্ধন সম্পন্ন করা যাচ্ছে না। অনুগ্রহ করে সাইন ইন করুন অথবা অন্য তথ্য দিয়ে চেষ্টা করুন।" });
          if (error.reason === "invalid-location") throw new TRPCError({ code: "BAD_REQUEST", message: "নির্বাচিত লোকেশনটি শহরের মধ্যে বৈধ নয়।" });
          throw new TRPCError({ code: "UNAUTHORIZED", message: "আপনার নিবন্ধন সেশনটি আর সক্রিয় নেই। ফোন নম্বর দিয়ে আবার শুরু করুন।" });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "নিবন্ধন সম্পন্ন করা যাচ্ছে না। অনুগ্রহ করে আবার চেষ্টা করুন।" });
      }
      await setPasswordSession(ctx, result.user);
      ctx.res.clearCookie("guardian-intake-handoff", { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true, next: "request-details" as const, user: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role, accountStatus: "active" as const } };
    }),
  }),
  guardianProfile: router({
    me: guardianProcedure.query(async ({ ctx }) => {
      const profile = await db.getGuardianProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Guardian profile not found" });
      return profile;
    }),
    photo: guardianProcedure.query(({ ctx }) => getGuardianProfilePhotoForOwner({ user: ctx.user })),
    update: guardianProcedure.input(z.object({
      name: z.string().trim().min(2, "Enter your full name.").max(120),
      gender: z.enum(["male", "female"]),
      cityLocationId: z.string().trim().min(1).max(80),
      locationId: z.string().trim().min(1).max(80),
    })).mutation(async ({ ctx, input }) => {
      try {
        return await db.updateGuardianProfileByUserId({ userId: ctx.user.id, ...input });
      } catch (error) {
        if (error instanceof db.TutorRequestLocationError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Select a valid location within your City." });
        }
        throw error;
      }
    }),
    changePassword: guardianProcedure.input(z.object({
      currentPassword: z.string().min(1, "Enter your current password.").max(128),
      newPassword: z.string().min(8, "Password must be at least 8 characters.").max(128),
      confirmNewPassword: z.string().min(8).max(128),
    }).superRefine((input, context) => {
      if (input.newPassword !== input.confirmNewPassword) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmNewPassword"], message: "New passwords do not match." });
      }
    })).mutation(async ({ ctx, input }) => {
      const result = await db.changeGuardianPasswordByUserId({
        userId: ctx.user.id,
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
      });
      if (result === "invalid-current-password") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Your current password is incorrect." });
      }
      return { changed: true } as const;
    }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user ? toClientAuthIdentity(opts.ctx.user) : null),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      if (ctx.user?.role === "tutor") {
        await db.revokeAllTutorPortalSessions({ userId: ctx.user.id, now: new Date() });
      }
      const isTutor = ctx.user?.role === "tutor";
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true, globalTutorPortalLogout: isTutor } as const;
    }),
    registerTutor: publicProcedure.input(tutorAuthInputSchema).mutation(async ({ ctx, input }) => {
      const result = await db.registerPasswordTutor(input);
      if (!result.created) {
        throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
      }
      await setPasswordSession(ctx, result.user);
      const tutorPortalToken = await issueTutorPortalSession(result.user.id);
      return {
        success: true,
        user: toClientAuthIdentity(result.user),
        tutorRegistration: result.registration,
        tutorPortalToken,
      } as const;
    }),
    loginTutor: publicProcedure.input(tutorLoginInputSchema).mutation(async ({ ctx, input }) => {
      const user = await db.verifyTutorPassword(input.email, input.password);
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: PASSWORD_ACCOUNT_LOGIN_ERROR });
      }
      await setPasswordSession(ctx, user);
      const tutorPortalToken = await issueTutorPortalSession(user.id);
      return { success: true, user: toClientAuthIdentity(user), tutorPortalToken } as const;
    }),
    loginAccount: publicProcedure.input(passwordAccountLoginInputSchema).mutation(async ({ ctx, input }) => {
      const user = await db.verifyPasswordAccount(input);
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: PASSWORD_ACCOUNT_LOGIN_ERROR });
      }
      await setPasswordSession(ctx, user);
      const tutorPortalToken = user.role === "tutor" ? await issueTutorPortalSession(user.id) : undefined;
      return { success: true, user: toClientAuthIdentity(user), tutorPortalToken } as const;
    }),
    loginAdmin: publicProcedure.input(adminPasswordLoginInputSchema).mutation(async ({ ctx, input }) => {
      const user = await db.verifyAdminPassword(input);
      if (!user) {
        try {
          await db.logAdminAuditEvent({ event: "login_failure", metadata: { ipAddress: getRequestIp(ctx), reason: "invalid-password-credentials" } });
        } catch {
          // Preserve the generic authentication failure if audit storage is unavailable.
        }
        throw new TRPCError({ code: "UNAUTHORIZED", message: ADMIN_PASSWORD_LOGIN_ERROR });
      }
      await db.logAdminAuditEvent({
        userId: user.id,
        email: user.email ?? undefined,
        event: "login_success",
        metadata: { ipAddress: getRequestIp(ctx), reason: "password-login" },
      });
      await setPasswordSession(ctx, user);
      return { success: true, user: toClientAuthIdentity(user) } as const;
    }),
    endTutorPortalSession: activeTutorIdentityProcedure.input(z.object({
      tutorPortalToken: z.string().trim().min(1).max(512).optional(),
    })).mutation(async ({ ctx, input }) => {
      const token = input.tutorPortalToken ?? getTutorPortalTokenFromHeaders(ctx.req.headers);
      if (!token) return { success: true } as const;
      await db.revokeTutorPortalSession({
        userId: ctx.user.id,
        tokenHash: hashTutorPortalToken(token),
        now: new Date(),
      });
      return { success: true } as const;
    }),
    recordAdminAccessAttempt: publicProcedure.mutation(async ({ ctx }) => {
      const user = ctx.user;
      const isAdmin = user?.role === "admin";
      await db.logAdminAuditEvent({
        userId: user?.id,
        email: user?.email ?? undefined,
        event: isAdmin ? "login_success" : "login_failure",
        metadata: { ipAddress: getRequestIp(ctx), reason: isAdmin ? "admin-session-established" : user ? "role-not-admin" : "unauthenticated" },
      });
      return { success: isAdmin } as const;
    }),
    selectRole: publicProcedure.input(z.object({ role: z.enum(["guardian", "tutor"]), redirectTo: z.enum(["/", "/account", "/tutor/dashboard"]).optional() })).mutation(({ ctx, input }) => {
      ctx.res.cookie("connect-role", input.role, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 10 * 60 * 1000, path: "/" });
      if (input.redirectTo) {
        ctx.res.cookie(PENDING_REDIRECT_COOKIE, input.redirectTo, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 10 * 60 * 1000, path: "/" });
      }
      return { success: true, role: input.role, redirectTo: input.redirectTo ?? "/" } as const;
    }),
  }),
  locations: router({
    list: publicProcedure.query(() => db.listLocations()),
  }),
  catalog: router({
    searchUniversities: activeTutorProcedure.input(catalogSearchInputSchema).query(({ input }) => db.searchUniversities(input)),
    searchAcademicFaculties: activeTutorProcedure.input(catalogSearchInputSchema.extend({ universityId: z.number().int().positive() })).query(({ input }) => {
      const { universityId, ...search } = input;
      return db.searchAcademicFaculties(universityId, search);
    }),
    searchFacultyDepartments: activeTutorProcedure.input(catalogSearchInputSchema.extend({ facultyId: z.number().int().positive() })).query(({ input }) => {
      const { facultyId, ...search } = input;
      return db.searchFacultyDepartments(facultyId, search);
    }),
    searchDegreeMajors: activeTutorProcedure.input(catalogSearchInputSchema.extend({ facultyDepartmentId: z.number().int().positive() })).query(({ input }) => {
      const { facultyDepartmentId, ...search } = input;
      return db.searchDegreeMajors(facultyDepartmentId, search);
    }),
    searchSubjects: activeTutorProcedure.input(catalogSearchInputSchema).query(({ input }) => db.searchSubjects(input)),
    searchClassLevels: activeTutorProcedure.input(catalogSearchInputSchema).query(({ input }) => db.searchClassLevels(input)),
    searchCurricula: activeTutorProcedure.input(catalogSearchInputSchema).query(({ input }) => db.searchCurricula(input)),
    searchStudentTypes: activeTutorProcedure.input(catalogSearchInputSchema).query(({ input }) => db.searchStudentTypes(input)),
    searchLanguages: activeTutorProcedure.input(catalogSearchInputSchema).query(({ input }) => db.searchLanguages(input)),
    searchBangladeshLocations: activeTutorProcedure
      .input(catalogSearchInputSchema.extend({
        types: z.array(z.enum(["city", "division", "district", "thana", "upazila", "subdivision", "area"])).max(7).optional(),
        ids: z.array(z.string().trim().min(1).max(120)).min(1).max(50).optional(),
        parentId: z.string().trim().min(1).max(80).optional(),
      }))
      .query(({ input }) => db.searchBangladeshLocations(input)),
    searchGuardianLocations: publicProcedure
      .input(catalogSearchInputSchema.extend({
        types: z.array(z.enum(["city", "thana", "upazila", "subdivision", "area"])).max(5).optional(),
        ids: z.array(z.string().trim().min(1).max(120)).min(1).max(50).optional(),
        parentId: z.string().trim().min(1).max(80).optional(),
      }))
      .query(({ input }) => db.searchBangladeshLocations(input)),
    searchRegistrationLocations: publicProcedure
      .input(z.object({
        cityId: z.string().trim().min(1).max(80),
        query: z.string().trim().max(100).default(""),
        limit: z.number().int().min(1).max(300).default(300),
      }))
      .query(({ input }) => db.searchRegistrationCityLocations(input)),
  }),
  tutors: router({
    list: publicProcedure.query(() => db.listTutors()),
    listPage: publicProcedure.input(tutorListingInputSchema).query(({ input }) => db.listTutorListingPage(input)),
    byId: publicProcedure.input(z.object({ id: z.string().min(1) })).query(({ input }) => db.getTutorById(input.id)),
  }),
  jobBoard: router({
    list: publicProcedure.input(publishedTutorJobBoardInputSchema).query(({ input }) => db.listPublishedTutorJobs(input)),
    expressInterest: activeTutorProcedure
      .input(z.object({ tutorJobId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const tutorId = await getApprovedTutorProfileId(ctx.user.id);
        try {
          return await db.submitTutorJobInterest({ tutorId, tutorJobId: input.tutorJobId });
        } catch (error) {
          return rethrowTutorInterestError(error);
        }
      }),
    withdrawInterest: activeTutorProcedure
      .input(z.object({ interestId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const tutorId = await getAuthenticatedTutorProfileId(ctx.user.id);
        try {
          return await db.withdrawTutorJobInterest({ tutorId, interestId: input.interestId });
        } catch (error) {
          return rethrowTutorInterestError(error);
        }
      }),
    myInterests: activeTutorProcedure.query(async ({ ctx }) => {
      const tutorId = await getAuthenticatedTutorProfileId(ctx.user.id);
      return db.listTutorJobInterestsForTutor(tutorId);
    }),
  }),
  tutor: router({
    getMyProfile: activeTutorProcedure.query(({ ctx }) => db.getTutorProfileByUserId(ctx.user.id)),
    saveProfileDraft: activeTutorProcedure.input(tutorProfileEditableDraftSchema).mutation(async ({ ctx, input }) => {
      try {
        return await db.saveTutorProfileDraft(ctx.user.id, input);
      } catch (error) {
        return rethrowProfileValidationError(error);
      }
    }),
    submitProfile: activeTutorProcedure.mutation(async ({ ctx }) => {
      try {
        return await db.submitTutorProfile(ctx.user.id);
      } catch (error) {
        return rethrowProfileValidationError(error);
      }
    }),
    getDashboardStats: activeTutorProcedure.query(({ ctx }) => db.getTutorDashboardStats(ctx.user.id)),
    myJobInterests: activeTutorProcedure.query(async ({ ctx }) => {
      const tutorId = await getAuthenticatedTutorProfileId(ctx.user.id);
      return db.listTutorJobInterestsForTutor(tutorId);
    }),
  }),
  admin: router({
    getWorkspaceAccess: adminProcedure.query(({ ctx }) => {
      ctx.res.setHeader("Cache-Control", "private, no-store, max-age=0");
      ctx.res.setHeader("Vary", "Cookie");
      return { isOwner: ctx.user.openId === ENV.ownerOpenId } as const;
    }),
    createInvitation: ownerAdminProcedure.input(z.object({ email: z.string().trim().email().max(320), expiresInHours: z.number().int().min(1).max(24 * 30).default(24 * 7) })).mutation(async ({ ctx, input }) => {
      const token = generateAdminInviteToken();
      const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000);
      const invitation = await db.createAdminInvitation({ ownerUserId: ctx.user.id, email: input.email, tokenHash: hashAdminInviteToken(token, ENV.cookieSecret), expiresAt });
      const forwardedProtocol = ctx.req.headers["x-forwarded-proto"];
      const protocol = (Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol)?.split(",")[0]?.trim() || ctx.req.protocol || "https";
      const host = ctx.req.headers.host;
      const invitationLink = host ? `${protocol}://${host}/admin/invitation/${token}` : `/admin/invitation/${token}`;
      await db.logAdminAuditEvent({ userId: ctx.user.id, email: ctx.user.email ?? undefined, event: "invitation_created", metadata: { invitationId: invitation.id, expiresAt: expiresAt.toISOString() } });
      return { invitationId: invitation.id, invitationLink, expiresAt };
    }),
    acceptInvitation: protectedProcedure.input(z.object({ token: z.string().trim().regex(/^[a-f0-9]{64}$/i) })).mutation(async ({ ctx, input }) => {
      const invitation = await db.getActiveAdminInvitationByTokenHash(hashAdminInviteToken(input.token, ENV.cookieSecret));
      if (!invitation || !ctx.user.email || invitation.email !== db.normalizeEmail(ctx.user.email)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "This Admin invitation is invalid, expired, or not assigned to this account." });
      }
      const result = await db.acceptAdminInvitation({ invitationId: invitation.id, userId: ctx.user.id, email: ctx.user.email });
      if (!result.accepted) throw new TRPCError({ code: "CONFLICT", message: "This Admin invitation is no longer available." });
      await db.logAdminAuditEvent({ userId: ctx.user.id, email: ctx.user.email, event: "invitation_accepted", metadata: { invitationId: invitation.id } });
      return { accepted: true } as const;
    }),
    listAdmins: ownerAdminProcedure.query(() => db.listAdminUsers()),
    revokeAdmin: ownerAdminProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const target = await db.getUserById(input.userId);
      if (!target || target.role !== "admin") throw new TRPCError({ code: "NOT_FOUND", message: "Admin account not found." });
      if (target.id === ctx.user.id || target.openId === ENV.ownerOpenId) throw new TRPCError({ code: "FORBIDDEN", message: "The Project Owner Admin account cannot be revoked." });
      const result = await db.updateUserRole(target.id, "user");
      await db.logAdminAuditEvent({ userId: target.id, email: target.email ?? undefined, event: "invitation_revoked", metadata: { action: "admin-role-revoked", revokedByUserId: ctx.user.id } });
      return result;
    }),
    provisionPasswordCredential: ownerAdminProcedure.input(z.object({
      userId: z.number().int().positive(),
      loginId: z.string().trim().min(3, "User ID must be at least 3 characters.").max(64),
      password: z.string().min(8, "Password must be at least 8 characters.").max(128),
      confirmPassword: z.string().min(8).max(128),
    }).refine(value => value.password === value.confirmPassword, {
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    })).mutation(async ({ ctx, input }) => {
      const result = await db.provisionAdminPasswordCredential({ userId: input.userId, loginId: input.loginId, password: input.password });
      if (!result.updated) {
        const errors: Record<string, TRPCError> = {
          INVALID_LOGIN_ID: new TRPCError({ code: "BAD_REQUEST", message: "Use 3–64 letters, numbers, hyphens, or underscores; start with a letter." }),
          ADMIN_NOT_FOUND: new TRPCError({ code: "NOT_FOUND", message: "Admin account not found." }),
          LOGIN_ID_IN_USE: new TRPCError({ code: "CONFLICT", message: "This User ID is already assigned to another Admin." }),
        };
        throw errors[result.reason ?? "INVALID_LOGIN_ID"];
      }
      await db.logAdminAuditEvent({
        userId: input.userId,
        event: result.action === "provisioned" ? "credential_provisioned" : "credential_reset",
        metadata: { provisionedByUserId: ctx.user.id },
      });
      return { updated: true } as const;
    }),
    getAuditLog: ownerAdminProcedure.input(z.object({
      event: z.enum(["all", "login_success", "login_failure", "two_factor_required", "two_factor_success", "two_factor_failure", "recovery_code_used", "invitation_created", "invitation_accepted", "invitation_revoked", "two_factor_reset", "credential_provisioned", "credential_reset"]).default("all"),
      email: z.string().trim().max(320).default(""),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(50).default(20),
    })).query(({ input }) => db.listAdminAuditLogPage(input)),
    getActivityReport: ownerAdminProcedure
      .input(z.object({ windowDays: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30) }))
      .query(({ input }) => db.getOwnerAdminActivityReport(input)),
    getMonitoringOverview: adminProcedure.query(() => db.getAdminMonitoringOverview()),
    listTutorDirectory: adminProcedure
      .input(adminTutorDirectoryInputSchema)
      .query(({ input }) => db.listAdminTutorDirectoryPage(input)),
    getTutorReview: adminProcedure
      .input(z.object({ tutorId: z.string().trim().min(1).max(32) }))
      .query(async ({ input }) => {
        const tutor = await db.getAdminTutorReview(input.tutorId);
        if (!tutor) throw new TRPCError({ code: "NOT_FOUND", message: "Tutor profile is unavailable." });
        return tutor;
      }),
    getTutorModerationHistory: adminProcedure
      .input(z.object({ tutorId: z.string().trim().min(1).max(32) }))
      .query(({ input }) => db.listTutorModerationEvents(input.tutorId)),
    moderateTutorProfile: adminProcedure
      .input(adminTutorModerationInputSchema)
      .mutation(async ({ ctx, input }) => {
        const result = await db.moderateTutorProfile({ ...input, adminUserId: ctx.user.id });
        if (result.updated) return result;
        if (result.reason === "TUTOR_NOT_FOUND") {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tutor profile is unavailable." });
        }
        throw new TRPCError({ code: "CONFLICT", message: result.reason });
      }),
    listGuardianRequests: adminProcedure
      .input(adminGuardianRequestInputSchema)
      .query(({ input }) => db.listAdminGuardianRequestPage(input)),
    getGuardianContact: adminProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const detail = await db.getGuardianContactForAdmin({ requestId: input.requestId, adminUserId: ctx.user.id });
        if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Guardian details are unavailable." });
        return detail;
      }),
    listTutorRequests: adminProcedure.query(() => db.listTutorRequestsForAdmin()),
    listMatchingRequests: adminProcedure
      .input(adminMatchingRequestInputSchema)
      .query(({ input }) => db.listTutorRequestMatchingPage(input)),
    listMatchingSavedViews: adminProcedure
      .query(({ ctx }) => db.listAdminMatchingSavedViews({ adminUserId: ctx.user.id })),
    createMatchingSavedView: adminProcedure
      .input(z.object({
        name: z.string().trim().min(1, "Enter a name for this Saved View.").max(80),
        filters: adminMatchingSavedViewFiltersInputSchema,
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.createAdminMatchingSavedView({ ...input, adminUserId: ctx.user.id });
        } catch (error) {
          if (error instanceof db.AdminMatchingSavedViewNameConflictError) {
            throw new TRPCError({ code: "CONFLICT", message: "A Saved View with this name already exists." });
          }
          throw error;
        }
      }),
    renameMatchingSavedView: adminProcedure
      .input(z.object({
        savedViewId: z.number().int().positive(),
        name: z.string().trim().min(1, "Enter a name for this Saved View.").max(80),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await db.renameAdminMatchingSavedView({ ...input, adminUserId: ctx.user.id });
          if (!result.updated) throw new TRPCError({ code: "NOT_FOUND", message: "Saved View is unavailable." });
          return result;
        } catch (error) {
          if (error instanceof db.AdminMatchingSavedViewNameConflictError) {
            throw new TRPCError({ code: "CONFLICT", message: "A Saved View with this name already exists." });
          }
          throw error;
        }
      }),
    deleteMatchingSavedView: adminProcedure
      .input(z.object({ savedViewId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.deleteAdminMatchingSavedView({ adminUserId: ctx.user.id, savedViewId: input.savedViewId });
        if (!result.deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Saved View is unavailable." });
        return result;
      }),
    setMatchingDefaultSavedView: adminProcedure
      .input(z.object({ savedViewId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.setAdminMatchingDefaultSavedView({ adminUserId: ctx.user.id, savedViewId: input.savedViewId });
        if (!result.updated) throw new TRPCError({ code: "NOT_FOUND", message: "Saved View is unavailable." });
        return result;
      }),
    clearMatchingDefaultSavedView: adminProcedure
      .mutation(({ ctx }) => db.clearAdminMatchingDefaultSavedView({ adminUserId: ctx.user.id })),
    listMatchingTutors: adminProcedure.query(() => db.listTutors()),
    updateTutorRequestStatus: adminProcedure
      .input(adminTutorRequestStatusInputSchema)
      .mutation(async ({ input }) => {
        const result = await db.updateTutorRequestStatus(input);
        if (!result.updated) {
          throw new TRPCError({ code: "CONFLICT", message: "এই request-এর status এখন পরিবর্তন করা যাচ্ছে না।" });
        }
        return result;
      }),
    confirmTutorRequestAppointment: adminProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.confirmTutorRequestAppointment({ ...input, adminUserId: ctx.user.id });
        if (!result.updated) {
          throw new TRPCError({ code: "CONFLICT", message: "This request cannot be confirmed until an assigned Tutor is available." });
        }
        return result;
      }),
    createConfirmationLetterDraft: adminProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createConfirmationLetterDraft({ requestId: input.requestId, adminUserId: ctx.user.id });
        if (!result.created && result.reason === "not-confirmed") {
          throw new TRPCError({ code: "CONFLICT", message: "A letter draft can be created only after an Admin-confirmed Tutor appointment." });
        }
        return result;
      }),
    issueConfirmationLetter: adminProcedure
      .input(z.object({
        letterId: z.number().int().positive(),
        agreedStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD for the agreed start date."),
        agreedFeeMinimum: z.number().int().min(0).max(10_000_000),
        agreedFeeMaximum: z.number().int().min(0).max(10_000_000),
      }).refine(value => value.agreedFeeMaximum >= value.agreedFeeMinimum, {
        path: ["agreedFeeMaximum"],
        message: "The maximum agreed fee must be at least the minimum fee.",
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.issueConfirmationLetter({ ...input, adminUserId: ctx.user.id });
        if (!result.issued) throw new TRPCError({ code: "CONFLICT", message: "This confirmation-letter draft is no longer available for issue." });
        return result;
      }),
    cancelTutorRequest: adminProcedure
      .input(z.object({ requestId: z.number().int().positive(), reason: z.string().trim().min(3).max(280) }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.cancelTutorRequest({ ...input, adminUserId: ctx.user.id });
        if (!result.updated) {
          throw new TRPCError({ code: "CONFLICT", message: "This request is already closed or unavailable." });
        }
        return result;
      }),
    moderateTutorRequestPublication: adminProcedure
      .input(adminTutorRequestPublicationInputSchema)
      .mutation(async ({ ctx, input }) => {
        const result = await db.moderateTutorRequestPublication({ ...input, adminUserId: ctx.user.id });
        if (result.updated) return result;
        if (result.reason === "REQUEST_NOT_FOUND") {
          throw new TRPCError({ code: "NOT_FOUND", message: "This Tutor Request is unavailable." });
        }
        if (result.reason === "GUARDIAN_CONFIRMATION_REQUIRED") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Record the Guardian confirmation or reconfirmation call before this action." });
        }
        throw new TRPCError({ code: "CONFLICT", message: "This publication action is no longer available for the request." });
      }),
    listTutorJobInterests: adminProcedure
      .input(z.object({ tutorJobId: z.number().int().positive().optional() }))
      .query(({ input }) => db.listTutorJobInterestsForAdmin(input)),
    listPendingGuardianPhotos: adminProcedure
      .query(() => getPendingGuardianPhotoModerationQueue()),
    reviewGuardianPhoto: adminProcedure
      .input(z.object({
        photoId: z.number().int().positive(),
        nextStatus: z.enum(["approved", "rejected"]),
        rejectionReason: z.enum(guardianProfilePhotoRejectionReasonValues).optional(),
        moderationNote: z.string().trim().max(280).optional(),
      }).superRefine((input, context) => {
        if (input.nextStatus === "rejected" && !input.rejectionReason) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["rejectionReason"],
            message: "Select a rejection reason.",
          });
        }
        if (input.nextStatus === "approved" && (input.rejectionReason || input.moderationNote)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["nextStatus"],
            message: "Approved photos cannot include rejection details.",
          });
        }
      }))
      .mutation(({ ctx, input }) => reviewGuardianProfilePhoto({ ...input, adminUserId: ctx.user.id })),
    reviewTutorJobInterest: adminProcedure
      .input(z.object({ interestId: z.number().int().positive(), status: z.enum(["shortlisted", "declined", "matched"]) }))
      .mutation(async ({ input }) => {
        try {
          return await db.reviewTutorJobInterestByAdmin(input);
        } catch (error) {
          return rethrowTutorInterestError(error);
        }
      }),
    listTutorRequestPublicationEvents: adminProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(({ input }) => db.listTutorRequestPublicationEvents(input.requestId)),
    assignTutorRequest: adminProcedure
      .input(z.object({ requestId: z.number().int().positive(), tutorId: z.string().trim().min(1).max(32) }))
      .mutation(async ({ input }) => {
        const result = await db.assignTutorToRequest(input);
        if (!result.assigned) {
          throw new TRPCError({ code: "CONFLICT", message: result.reason === "tutor-unavailable" ? "এই Tutor বর্তমানে manual matching-এর জন্য অনুমোদিত নয়।" : "এই request ইতিমধ্যে assign করা হয়েছে বা আর active নেই।" });
        }
        return { ...result, contactConsent: "pending" as const };
      }),
    addTutorRequestAssignmentNote: adminProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        category: z.enum(["matching", "guardian_contact", "tutor_follow_up", "internal_risk"]),
        body: z.string().trim().min(1, "Enter a note.").max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.addTutorRequestAssignmentNote({ ...input, adminUserId: ctx.user.id });
        if (!result.created) throw new TRPCError({ code: "NOT_FOUND", message: "Tutor request was not found." });
        return result;
      }),
    listTutorRequestAssignmentNotes: adminProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(({ input }) => db.listTutorRequestAssignmentNotes(input)),
    createGuardianRequestFollowUp: adminProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        kind: z.enum(["availability_confirmation", "information_required", "meeting_update"]),
        message: z.string().trim().min(1, "Enter a follow-up message.").max(360),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createGuardianRequestFollowUp({ ...input, adminUserId: ctx.user.id });
        if (!result.created) throw new TRPCError({ code: "NOT_FOUND", message: "Tutor request was not found." });
        return result;
      }),
  }),
  guardianNotifications: router({
    mine: guardianProcedure
      .input(z.object({
        limit: z.number().int().min(1).max(50).default(20),
        cursor: z.number().int().positive().optional(),
      }))
      .query(({ ctx, input }) => db.listGuardianNotifications({ guardianUserId: ctx.user.id, ...input })),
    unreadCount: guardianProcedure
      .query(({ ctx }) => db.getGuardianNotificationUnreadCount({ guardianUserId: ctx.user.id })),
    markRead: guardianProcedure
      .input(z.object({ notificationId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => db.markGuardianNotificationRead({ guardianUserId: ctx.user.id, ...input })),
    markAllRead: guardianProcedure
      .mutation(({ ctx }) => db.markAllGuardianNotificationsRead({ guardianUserId: ctx.user.id })),
  }),
  confirmationLetters: router({
    guardianMine: guardianProcedure.query(({ ctx }) => db.listConfirmationLettersForGuardian({ guardianUserId: ctx.user.id })),
    tutorMine: activeTutorProcedure.query(({ ctx }) => db.listConfirmationLettersForTutor({ tutorUserId: ctx.user.id })),
    download: protectedProcedure
      .input(z.object({ letterId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const role = ctx.user.role === "tutor" ? "tutor" : ctx.user.role === "guardian" || ctx.user.role === "user" ? "guardian" : null;
        if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "Only the authorised Guardian or assigned Tutor can access this letter." });
        const result = await db.getConfirmationLetterRecipientDownload({ letterId: input.letterId, recipient: { role, userId: ctx.user.id } });
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "This confirmation letter is unavailable." });
        return result;
      }),
  }),
  tutorRequests: router({
    assigned: activeTutorProcedure.query(({ ctx }) => db.listTutorAssignedRequests(ctx.user.id)),
    mine: guardianProcedure.query(({ ctx }) => db.listGuardianTutorRequests(ctx.user.id)),
    decideContactConsent: guardianProcedure
      .input(z.object({
        requestId: z.number().int().positive(),
        decision: z.enum(["approved", "declined"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.decideGuardianTutorRequestContactConsent({
          guardianUserId: ctx.user.id,
          requestId: input.requestId,
          decision: input.decision,
        });
        if (!result.saved) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "এই request-এর জন্য এখন contact coordination-এর সিদ্ধান্ত দেওয়া যাচ্ছে না।",
          });
        }
        return result;
      }),
    updatePending: guardianProcedure
      .input(guardianPendingTutorRequestUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        let tuitionLocation: Awaited<ReturnType<typeof db.getTutorRequestLocation>> | null = null;
        if (input.tuitionType !== "online") {
          try {
            tuitionLocation = await db.getTutorRequestLocation({
              cityLocationId: input.tuitionCityLocationId,
              locationId: input.tuitionLocationId,
            });
          } catch (error) {
            if (error instanceof db.TutorRequestLocationError) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "নির্বাচিত City এবং tuition location মিলছে না।" });
            }
            throw error;
          }
        }
        const result = await db.updateGuardianTutorRequest({
          guardianUserId: ctx.user.id,
          requestId: input.requestId,
          tuitionType: input.tuitionType,
          category: input.category,
          curriculumType: input.curriculumType || null,
          classCourse: input.classCourse,
          subjects: JSON.stringify(input.subjects),
          groupCapacity: input.tuitionType === "group" ? input.groupCapacity : null,
          packageDurationMonths: input.tuitionType === "package" ? input.packageDurationMonths : null,
          studentCount: "studentCount" in input && typeof input.studentCount === "number" ? input.studentCount : null,
          daysPerWeek: input.daysPerWeek,
          preferredGender: input.preferredGender,
          studentFirstName: input.studentFirstName ?? null,
          studentGender: input.studentGender ?? null,
          addressDetails: input.addressDetails ?? null,
          tuitionCityLocationId: tuitionLocation?.cityLocationId ?? null,
          tuitionLocationId: tuitionLocation?.locationId ?? null,
          tuitionLocationLabel: tuitionLocation?.locationLabel ?? null,
          budgetMode: input.budget.kind,
          budgetMinimum: input.budget.kind === "range" ? input.budget.minimum : null,
          budgetMaximum: input.budget.kind === "range" ? input.budget.maximum : null,
          notes: input.notes ?? null,
          monthlyBudget: input.budget.kind === "range" ? input.budget.maximum : null,
          locationText: tuitionLocation?.locationLabel ?? "Online tuition",
        });
        if (!result.updated) {
          throw new TRPCError({ code: "CONFLICT", message: "শুধু নিজের Pending request update করা যায়।" });
        }
        return result;
      }),
    create: guardianProcedure.input(tutorRequestInputSchema).mutation(async ({ ctx, input }) => {
      let tuitionLocation: Awaited<ReturnType<typeof db.getTutorRequestLocation>> | null = null;
      if (input.tuitionType !== "online") {
        try {
          tuitionLocation = await db.getTutorRequestLocation({
            cityLocationId: input.tuitionCityLocationId,
            locationId: input.tuitionLocationId,
          });
        } catch (error) {
          if (error instanceof db.TutorRequestLocationError) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "নির্বাচিত City এবং tuition location মিলছে না।" });
          }
          throw error;
        }
      }
      const monthlyBudget = input.budget.kind === "range" ? input.budget.maximum : null;
      const locationText = tuitionLocation?.locationLabel ?? "Online tuition";
      const studentCount = "studentCount" in input ? input.studentCount : null;
      const result = await db.createTutorRequest({
        guardianUserId: ctx.user.id,
        tuitionType: input.tuitionType,
        category: input.category,
        curriculumType: input.curriculumType || null,
        classCourse: input.classCourse,
        subjects: JSON.stringify(input.subjects),
        groupCapacity: input.tuitionType === "group" ? input.groupCapacity : null,
        packageDurationMonths: input.tuitionType === "package" ? input.packageDurationMonths : null,
        studentCount,
        daysPerWeek: input.daysPerWeek,
        preferredGender: input.preferredGender,
        studentFirstName: input.studentFirstName ?? null,
        studentGender: input.studentGender ?? null,
        addressDetails: input.addressDetails ?? null,
        tuitionCityLocationId: tuitionLocation?.cityLocationId ?? null,
        tuitionLocationId: tuitionLocation?.locationId ?? null,
        tuitionLocationLabel: tuitionLocation?.locationLabel ?? null,
        budgetMode: input.budget.kind,
        budgetMinimum: input.budget.kind === "range" ? input.budget.minimum : null,
        budgetMaximum: input.budget.kind === "range" ? input.budget.maximum : null,
        notes: input.notes ?? null,
        contactConsent: "not_required",
        monthlyBudget,
        locationText,
      });
      const notificationDelivered = await notifyTelegramAdmin({
        requestId: result.id,
        category: input.category,
        classCourse: input.classCourse,
        subjects: input.subjects,
        tuitionType: input.tuitionType,
        groupCapacity: input.tuitionType === "group" ? input.groupCapacity : null,
        packageDurationMonths: input.tuitionType === "package" ? input.packageDurationMonths : null,
        daysPerWeek: input.daysPerWeek,
        preferredGender: input.preferredGender,
        monthlyBudget,
        locationText,
      });
      return { success: true, notificationDelivered, ...result } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
