export type AdminMatchingSavedViewFilters = {
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
  createdAfter: string;
  createdBefore: string;
  lastActivityAfter: string;
  lastActivityBefore: string;
  pageSize: number;
};

export const adminMatchingSavedViewFilterDefaults: AdminMatchingSavedViewFilters = {
  query: "",
  status: "all",
  lifecycle: "all",
  tuitionType: "all",
  preferredGender: "all",
  contactConsent: "all",
  subject: "",
  category: "",
  location: "",
  assignmentState: "all",
  appointmentState: "all",
  cancellationState: "all",
  createdAfter: "",
  createdBefore: "",
  lastActivityAfter: "",
  lastActivityBefore: "",
  pageSize: 20,
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeText(value: unknown, maximum: number) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length <= maximum ? trimmed : "";
}

function safeEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? value as T : fallback;
}

function safeInteger(value: unknown, minimum: number, maximum: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum
    ? value
    : undefined;
}

function safeDateInput(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const candidate = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(candidate.getTime()) || candidate.toISOString().slice(0, 10) !== value ? "" : value;
}

/**
 * Keeps only filter fields that the Admin matching query accepts. This prevents
 * Saved Views from becoming a side channel for request results or private data.
 * Legacy malformed JSON or unknown keys safely fall back to the neutral queue.
 */
export function sanitizeAdminMatchingSavedViewFilters(value: unknown): AdminMatchingSavedViewFilters {
  const source = isRecord(value) ? value : {};
  const budgetMinimum = safeInteger(source.budgetMinimum, 0, 1_000_000);
  const budgetMaximum = safeInteger(source.budgetMaximum, 0, 1_000_000);
  const createdAfter = safeDateInput(source.createdAfter);
  const createdBefore = safeDateInput(source.createdBefore);
  const lastActivityAfter = safeDateInput(source.lastActivityAfter);
  const lastActivityBefore = safeDateInput(source.lastActivityBefore);
  const budgetsAreInvalid = budgetMinimum !== undefined && budgetMaximum !== undefined && budgetMinimum > budgetMaximum;
  const createdDatesAreInvalid = Boolean(createdAfter && createdBefore && createdAfter > createdBefore);
  const activityDatesAreInvalid = Boolean(lastActivityAfter && lastActivityBefore && lastActivityAfter > lastActivityBefore);

  return {
    query: safeText(source.query, 100),
    status: safeEnum(source.status, ["all", "new", "reviewing", "matched", "closed"], "all"),
    lifecycle: safeEnum(source.lifecycle, ["all", "pending", "live", "appointed", "confirmed", "cancelled"], "all"),
    tuitionType: safeEnum(source.tuitionType, ["all", "home", "online", "both", "group", "package"], "all"),
    preferredGender: safeEnum(source.preferredGender, ["all", "male", "female", "any"], "all"),
    contactConsent: safeEnum(source.contactConsent, ["all", "not_required", "pending", "approved", "declined"], "all"),
    subject: safeText(source.subject, 100),
    category: safeText(source.category, 120),
    location: safeText(source.location, 120),
    assignmentState: safeEnum(source.assignmentState, ["all", "assigned", "unassigned"], "all"),
    appointmentState: safeEnum(source.appointmentState, ["all", "confirmed", "pending"], "all"),
    cancellationState: safeEnum(source.cancellationState, ["all", "active", "cancelled"], "all"),
    ...(budgetsAreInvalid
      ? {}
      : { ...(budgetMinimum !== undefined ? { budgetMinimum } : {}), ...(budgetMaximum !== undefined ? { budgetMaximum } : {}) }),
    createdAfter: createdDatesAreInvalid ? "" : createdAfter,
    createdBefore: createdDatesAreInvalid ? "" : createdBefore,
    lastActivityAfter: activityDatesAreInvalid ? "" : lastActivityAfter,
    lastActivityBefore: activityDatesAreInvalid ? "" : lastActivityBefore,
    pageSize: safeInteger(source.pageSize, 1, 50) ?? 20,
  };
}

export function parseAdminMatchingSavedViewFilters(value: string): AdminMatchingSavedViewFilters {
  try {
    return sanitizeAdminMatchingSavedViewFilters(JSON.parse(value));
  } catch {
    return { ...adminMatchingSavedViewFilterDefaults };
  }
}
