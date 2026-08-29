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

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error, path }) {
    if (!path || !tutorProfileValidationPaths.has(path)) return shape;
    const tutorProfileFieldIssues = getSafeTutorProfileFieldIssues(getValidationIssuesFromCause(error.cause));
    if (tutorProfileFieldIssues.length === 0) return shape;
    return {
      ...shape,
      data: {
        ...shape.data,
        tutorProfileFieldIssues,
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
