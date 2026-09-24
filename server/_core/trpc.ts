import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
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

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error, path }) {
    const zodFieldErrors = error.code === "BAD_REQUEST" ? getZodFieldErrorsFromCause(error.cause) : undefined;
    const tutorProfileFieldIssues = path && tutorProfileValidationPaths.has(path)
      ? getSafeTutorProfileFieldIssues(getValidationIssuesFromCause(error.cause))
      : [];

    const accountRole = path === "auth.loginAccount" && error.code === "UNAUTHORIZED" ? getAccountRoleFromCause(error.cause) : undefined;

    if (!zodFieldErrors && tutorProfileFieldIssues.length === 0 && !accountRole) return shape;

    return {
      ...shape,
      data: {
        ...shape.data,
        ...(zodFieldErrors ? { zodFieldErrors } : {}),
        ...(tutorProfileFieldIssues.length ? { tutorProfileFieldIssues } : {}),
        ...(accountRole ? { accountRole } : {}),
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
export const guardianProcedure = t.procedure.use(requireRole(["guardian", "user"]));
export const tutorProcedure = t.procedure.use(requireRole(["tutor"]));
export const adminProcedure = t.procedure.use(requireRole(["admin"]));

export const notAdminError = () => new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
