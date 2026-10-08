import { ADMIN_PASSWORD_CHANGE_REQUIRED_ERR_MSG, ADMIN_TWO_FACTOR_REQUIRED_ERR_MSG, LOGIN_TWO_FACTOR_REQUIRED_ERR_MSG, NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { hasAdminTwoFactorProof } from "../admin-two-factor";
import { hasLoginTwoFactorProof } from "../login-two-factor";
import * as db from "../db";
import { getSafeTutorProfileFieldIssues } from "../tutor-profile-error-contract";
import type { TrpcContext } from "./context";

const tutorProfileValidationPaths = new Set(["tutor.saveProfileDraft", "tutor.submitProfile"]);

function getValidationIssuesFromCause(cause: unknown) {
  if (Array.isArray(cause)) return cause;
  if (!cause || typeof cause !== "object") return [];
  const candidate = cause as { issues?: unknown; tutorProfileFieldIssues?: unknown };
  if (Array.isArray(candidate.tutorProfileFieldIssues)) return candidate.tutorProfileFieldIssues;
  return Array.isArray(candidate.issues) ? candidate.issues : [];
}

/**
 * Flattens a failed Zod input parse into `{ field: [messages] }` so a client can
 * point the user at the exact field the server rejected, instead of falling back
 * to a generic "something was wrong" message when its own checks were looser.
 */
export function getZodFieldErrorsFromCause(cause: unknown): Record<string, string[]> | undefined {
  const issues = getValidationIssuesFromCause(cause);
  if (!issues.length) return undefined;
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    if (!issue || typeof issue !== "object") continue;
    const { path, message } = issue as { path?: unknown; message?: unknown };
    if (typeof message !== "string") continue;
    const field = Array.isArray(path) && typeof path[0] === "string" ? path[0] : "_form";
    (fieldErrors[field] ??= []).push(message);
  }
  return Object.keys(fieldErrors).length ? fieldErrors : undefined;
}

/**
 * The account type a refused sign-in's details really belong to - set only by
 * `auth.loginAccount` once the password has matched the other public role.
 */
export function getAccountRoleFromCause(cause: unknown): "guardian" | "tutor" | undefined {
  if (!cause || typeof cause !== "object") return undefined;
  const role = (cause as { accountRole?: unknown }).accountRole;
  return role === "guardian" || role === "tutor" ? role : undefined;
}

export function getSupportReferenceFromCause(cause: unknown): string | undefined {
  if (!cause || typeof cause !== "object") return undefined;
  const reference = (cause as { supportReference?: unknown }).supportReference;
  return typeof reference === "string" && /^[A-F0-9]{6}$/.test(reference) ? reference : undefined;
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error, path }) {
    const zodFieldErrors = error.code === "BAD_REQUEST" ? getZodFieldErrorsFromCause(error.cause) : undefined;
    const tutorProfileFieldIssues = path && tutorProfileValidationPaths.has(path)
      ? getSafeTutorProfileFieldIssues(getValidationIssuesFromCause(error.cause))
      : [];

    const accountRole = path === "auth.loginAccount" && error.code === "UNAUTHORIZED" ? getAccountRoleFromCause(error.cause) : undefined;
    // The short code a Tutor reads out when a save fails for a reason of ours; it finds the log line.
    const supportReference = path && tutorProfileValidationPaths.has(path) && error.code === "INTERNAL_SERVER_ERROR" ? getSupportReferenceFromCause(error.cause) : undefined;

    if (!zodFieldErrors && tutorProfileFieldIssues.length === 0 && !accountRole && !supportReference) return shape;

    return {
      ...shape,
      data: {
        ...shape.data,
        ...(zodFieldErrors ? { zodFieldErrors } : {}),
        ...(tutorProfileFieldIssues.length ? { tutorProfileFieldIssues } : {}),
        ...(accountRole ? { accountRole } : {}),
        ...(supportReference ? { supportReference } : {}),
      },
    };
  },
});
export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export function hasRequiredRole(role: string | undefined, roles: readonly string[]) {
  return Boolean(role && roles.includes(role));
}

const requireRole = (roles: string[]) => t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  if (!hasRequiredRole(ctx.user.role, roles)) throw new TRPCError({ code: "FORBIDDEN", message: "This action is not available for your account role." });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(requireUser);
/** A signed-in Tutor or Guardian, whether or not this browser has cleared the sign-in SMS code. */
export const loginIdentityProcedure = t.procedure.use(requireRole(["tutor", "guardian", "user"]));

const requireLoginTwoFactor = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  const { enabled, epoch } = await db.getTutorGuardianLoginOtpSettings();
  if (enabled && !hasLoginTwoFactorProof(ctx.req, ctx.user.id, epoch)) {
    throw new TRPCError({ code: "FORBIDDEN", message: LOGIN_TWO_FACTOR_REQUIRED_ERR_MSG });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const guardianProcedure = t.procedure.use(requireRole(["guardian", "user"])).use(requireLoginTwoFactor);
export const tutorProcedure = t.procedure.use(requireRole(["tutor"])).use(requireLoginTwoFactor);
/** A Tutor or a Guardian, for what both have - Settings. */
export const memberProcedure = t.procedure.use(requireRole(["tutor", "guardian", "user"])).use(requireLoginTwoFactor);

/**
 * An Admin whose password was right - nothing about their second factor.
 * Only the two-factor lifecycle itself (status, setup, the challenge, a
 * recovery code) may use this: everywhere else in the Admin surface uses
 * `adminProcedure`, which also refuses an enrolled Admin who has not cleared
 * this browser's challenge in the last 30 days.
 */
export const adminIdentityProcedure = t.procedure.use(requireRole(["admin"]));

const requireAdminTwoFactor = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  const settings = await db.getAdminTwoFactorSettings(ctx.user.id);
  if (settings && !hasAdminTwoFactorProof(ctx.req, ctx.user.id, ctx.user.sessionsValidFrom)) {
    throw new TRPCError({ code: "FORBIDDEN", message: ADMIN_TWO_FACTOR_REQUIRED_ERR_MSG });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/** An Admin still on the password the Owner chose for them does nothing in the workspace until they have changed it. */
const requireAdminPasswordChanged = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  if (await db.getAdminPasswordChangeRequired(ctx.user.id)) {
    throw new TRPCError({ code: "FORBIDDEN", message: ADMIN_PASSWORD_CHANGE_REQUIRED_ERR_MSG });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminProcedure = adminIdentityProcedure.use(requireAdminPasswordChanged).use(requireAdminTwoFactor);

export const notAdminError = () => new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
