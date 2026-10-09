import { z } from "zod";

/**
 * What the Guardian Requests screens accept to narrow by, beyond the status tab
 * and the search. The client's own shape is `AdminGuardianRequestFilterInput`
 * in `@shared/admin-request-filters`; this is the same thing as the server
 * enforces it, so a hand-made request cannot ask for more than the panel could.
 * A range the wrong way round finds nothing, as the panel would not let it be sent.
 */
export const adminGuardianRequestQueueFiltersSchema = z.object({
  requestedFrom: z.coerce.date().optional(),
  requestedTo: z.coerce.date().optional(),
  requestType: z.enum(["remove_tutor", "cancel_tuition"]).optional(),
  postedBy: z.enum(["guardian", "admin"]).optional(),
  tuitionStage: z.enum(["live", "appointed", "confirmed", "cancelled"]).optional(),
});

export type AdminGuardianRequestQueueFilters = z.infer<typeof adminGuardianRequestQueueFiltersSchema>;
