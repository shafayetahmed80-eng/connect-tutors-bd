/**
 * What an Admin can narrow the Tutor Chats list by, beyond the Active and
 * Archived tabs and the search box.
 *
 * The state is what the panel holds - every value a string, so an empty box and
 * a missing filter are the same thing; the input is what the server takes, and
 * `buildAdminChatFilterInput` is the only way from one to the other.
 *
 * These narrow the list; the Recent / Unread first / Mine first choice beside
 * the search only regroups what is on it, and is a separate thing.
 */

export type AdminChatFilterState = {
  /** Whether a Tutor message is waiting that no Admin has read. */
  status: "" | "unread" | "read";
  /** Who has claimed the conversation: the Admin looking, no one, or another Admin. */
  handledBy: "" | "mine" | "nobody" | "others";
  /** Hours the oldest unread Tutor message has been waiting, at the least. */
  waiting: "" | "1" | "6" | "24" | "72";
  /** `yyyy-mm-dd`, as a date input gives it: the day of the last message. */
  lastFrom: string;
  lastTo: string;
};

export const DEFAULT_ADMIN_CHAT_FILTERS: AdminChatFilterState = {
  status: "",
  handledBy: "",
  waiting: "",
  lastFrom: "",
  lastTo: "",
};

export const adminChatStatusOptions = [
  { id: "unread", label: "Unread" },
  { id: "read", label: "Read" },
] as const;

export const adminChatHandledByOptions = [
  { id: "mine", label: "Me" },
  { id: "nobody", label: "Nobody" },
  { id: "others", label: "Another Admin" },
] as const;

export const adminChatWaitingOptions = [
  { id: "1", label: "1+ hour" },
  { id: "6", label: "6+ hours" },
  { id: "24", label: "24+ hours" },
  { id: "72", label: "3+ days" },
] as const;

function startOfDay(value: string) {
  const day = value.trim();
  return day ? new Date(`${day}T00:00:00`) : undefined;
}

/** The last moment of the day, or a message sent at noon on the last day would fall outside the range. */
function endOfDay(value: string) {
  const day = value.trim();
  return day ? new Date(`${day}T23:59:59.999`) : undefined;
}

export function buildAdminChatFilterInput(filters: AdminChatFilterState) {
  const lastMessageFrom = startOfDay(filters.lastFrom);
  const lastMessageTo = endOfDay(filters.lastTo);
  return {
    ...(filters.status ? { unread: filters.status } : {}),
    ...(filters.handledBy ? { claim: filters.handledBy === "nobody" ? ("unclaimed" as const) : filters.handledBy } : {}),
    ...(filters.waiting ? { waitingHours: Number(filters.waiting) } : {}),
    ...(lastMessageFrom ? { lastMessageFrom } : {}),
    ...(lastMessageTo ? { lastMessageTo } : {}),
  };
}

export type AdminChatFilterInput = ReturnType<typeof buildAdminChatFilterInput>;

export function countAdminChatFilters(filters: AdminChatFilterState): number {
  return Object.keys(buildAdminChatFilterInput(filters)).length;
}

export function adminChatFilterAlerts(filters: AdminChatFilterState): string[] {
  return filters.lastFrom && filters.lastTo && filters.lastFrom > filters.lastTo
    ? ["The 'from' date cannot be later than the 'to' date."]
    : [];
}
