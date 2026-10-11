// What an Admin searched for last, kept in the browser so the same words can be
// picked again instead of typed again. A convenience only: unreadable or blocked
// storage just means no suggestions, and nothing here reaches the server.
//
// Searches name people (a Guardian, a Tutor, a phone number), so they are kept
// per signed-in Admin on this device, not shared by whoever uses the browser next.

const PREFIX = "connect-tutors:recent-search";
export const RECENT_SEARCH_LIMIT = 5;
const MIN_LENGTH = 2;
const MAX_LENGTH = 80;

let scope = "device";

/** Called once by the Admin layout with the signed-in Admin's id; `null` falls back to the device. */
export function setRecentSearchScope(userId: number | string | null | undefined) {
  scope = userId === null || userId === undefined ? "device" : String(userId);
}

const keyFor = (page: string) => `${PREFIX}:${scope}:${page}`;

export function readRecentSearches(page: string): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(keyFor(page)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, RECENT_SEARCH_LIMIT) : [];
  } catch {
    return [];
  }
}

/** Puts a search first, drops an earlier copy of it, and keeps the newest few. Too short or too long is ignored. */
export function rememberRecentSearch(page: string, term: string): string[] {
  const clean = term.trim().replace(/\s+/g, " ");
  const current = readRecentSearches(page);
  if (clean.length < MIN_LENGTH || clean.length > MAX_LENGTH) return current;
  const next = [clean, ...current.filter(item => item.toLowerCase() !== clean.toLowerCase())].slice(0, RECENT_SEARCH_LIMIT);
  try {
    window.localStorage.setItem(keyFor(page), JSON.stringify(next));
  } catch {
    // Private windows and blocked storage just lose the convenience.
  }
  return next;
}

export function clearRecentSearches(page: string) {
  try {
    window.localStorage.removeItem(keyFor(page));
  } catch {
    // Nothing to forget if nothing could be kept.
  }
}
