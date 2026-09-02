import { TRPCError } from "@trpc/server";
import { findSiteLimit, type SiteLimitId, type SiteLimitValues } from "@shared/site-limits";

/**
 * Enforces the Owner's numbers, which zod cannot.
 *
 * A zod schema is built once when the module loads, long before the stored
 * limits can be read, so its `.max()` has to be the registry's *ceiling* - the
 * highest the Owner could ever set. That protects the database. This guard
 * runs inside the mutation, after the limits have been resolved, and enforces
 * what the Owner actually chose.
 *
 * Two checks rather than one, deliberately. The schema is a wall the request
 * cannot pass whatever happens to the settings table; the guard is the policy
 * of the day, and it can move.
 */
export function assertWithinLimit(
  limits: SiteLimitValues,
  id: SiteLimitId,
  actual: number,
  noun: string,
) {
  const allowed = limits[id];
  if (actual <= allowed) return;
  const meta = findSiteLimit(id);
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: `Choose at most ${allowed} ${meta?.unit ?? noun}. You chose ${actual}.`,
  });
}

/** The same, for a length rather than a count, where the message reads differently. */
export function assertWithinLengthLimit(
  limits: SiteLimitValues,
  id: SiteLimitId,
  actual: number,
  fieldLabel: string,
) {
  const allowed = limits[id];
  if (actual <= allowed) return;
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: `${fieldLabel} must be ${allowed} characters or fewer.`,
  });
}
