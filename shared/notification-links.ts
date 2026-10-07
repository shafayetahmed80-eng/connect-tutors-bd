/**
 * Where a stored notification can take its reader.
 *
 * Every notification carries an `actionPath`, but a notice an Admin sends on its
 * own has nothing to open: its path is the inbox the reader is already in. Showing
 * "Open" on those leads nowhere, so a notification only counts as having a
 * destination when its path is some other page.
 */
export function notificationDestination(actionPath: string | null | undefined, inboxPath: string): string | null {
  const path = (actionPath ?? "").trim();
  if (!path.startsWith("/")) return null;
  const withoutQuery = path.split(/[?#]/, 1)[0] ?? "";
  const bare = withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, "") : withoutQuery;
  return bare === inboxPath ? null : path;
}

export const TUTOR_NOTIFICATIONS_PATH = "/tutor/dashboard/notifications";
export const GUARDIAN_NOTIFICATIONS_PATH = "/guardian/dashboard/notifications";
