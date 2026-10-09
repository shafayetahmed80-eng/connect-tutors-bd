import { z } from "zod";
import { ADMIN_JOB_LOCATION_LIMIT, ADMIN_JOB_SUBJECT_LIMIT } from "@shared/admin-job-filters";
import { jobPaymentStatusValues } from "@shared/job-payment-status";
import { cancellationReasons } from "@shared/platform-charge";

/**
 * What the Admin's tuition lists accept to narrow by. The client's own shape
 * is `AdminJobFilterInput` in `@shared/admin-job-filters`; this is the same
 * thing as the server enforces it, so a hand-made request cannot ask for more
 * than the panel could.
 */
const baseFilters = z.object({
  postedFrom: z.coerce.date().optional(),
  postedTo: z.coerce.date().optional(),
  cityId: z.string().trim().min(1).max(80).optional(),
  locationIds: z.array(z.string().trim().min(1).max(80)).max(ADMIN_JOB_LOCATION_LIMIT).optional(),
  tuitionTypes: z.array(z.enum(["home", "online", "both", "group", "package"])).max(5).optional(),
  daysPerWeek: z.array(z.number().int().min(1).max(7)).max(7).optional(),
  categories: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  classCourses: z.array(z.string().trim().min(1).max(120)).max(40).optional(),
  subjects: z.array(z.string().trim().min(1).max(120)).max(ADMIN_JOB_SUBJECT_LIMIT).optional(),
  studentGender: z.enum(["male", "female"]).optional(),
  preferredTutorGender: z.enum(["male", "female", "any"]).optional(),
  jobId: z.string().trim().min(1).max(32).optional(),
  salaryFrom: z.number().int().min(0).max(10_000_000).optional(),
  salaryTo: z.number().int().min(0).max(10_000_000).optional(),
  postedBy: z.enum(["guardian", "admin"]).optional(),
  guardian: z.string().trim().min(1).max(120).optional(),
  heardAboutUs: z.array(z.enum(["friends_family", "facebook", "websites", "others"])).max(4).optional(),
  waitingRequest: z.enum(["any", "confirm", "remove_tutor", "cancel_tuition"]).optional(),
  daysInStage: z.number().int().min(1).max(365).optional(),
  publicationStates: z.array(z.enum(["submitted", "reviewing", "changes_requested", "approved", "unpublished"])).max(5).optional(),
  applicants: z.enum(["none", "few", "many"]).optional(),
  expiringSoon: z.literal(true).optional(),
  appointedFrom: z.coerce.date().optional(),
  appointedTo: z.coerce.date().optional(),
  confirmedFrom: z.coerce.date().optional(),
  confirmedTo: z.coerce.date().optional(),
  cancelledFrom: z.coerce.date().optional(),
  cancelledTo: z.coerce.date().optional(),
  tutorGender: z.enum(["male", "female"]).optional(),
  paymentStatuses: z.array(z.enum(jobPaymentStatusValues)).max(4).optional(),
  letter: z.enum(["issued", "not_issued"]).optional(),
  settlement: z.enum(["not_settled", "settled", "refund"]).optional(),
  refundDisposition: z.enum(["credited", "refunded"]).optional(),
  settlementReasons: z.array(z.enum(cancellationReasons)).max(4).optional(),
  cancelReason: z.string().trim().min(1).max(120).optional(),
});

const dateRanges = [
  ["postedFrom", "postedTo"],
  ["appointedFrom", "appointedTo"],
  ["confirmedFrom", "confirmedTo"],
  ["cancelledFrom", "cancelledTo"],
] as const;

export const adminJobFiltersSchema = baseFilters.superRefine((value, context) => {
  for (const [from, to] of dateRanges) {
    const start = value[from];
    const end = value[to];
    if (start && end && start > end) context.addIssue({ code: "custom", message: "The 'from' date cannot be later than the 'to' date.", path: [from] });
  }
  if (value.salaryFrom !== undefined && value.salaryTo !== undefined && value.salaryFrom > value.salaryTo) {
    context.addIssue({ code: "custom", message: "The lowest salary cannot be above the highest.", path: ["salaryFrom"] });
  }
});

export type AdminJobFilters = z.infer<typeof adminJobFiltersSchema>;
