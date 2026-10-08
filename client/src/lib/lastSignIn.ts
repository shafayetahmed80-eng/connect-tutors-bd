/** "8 Oct 2026, 5:15 PM · 203.0.113.9" - when an Admin last signed in with their password, and from where. */
export function describeLastSignIn(lastSignIn: { at: string | Date; ip: string | null } | null | undefined) {
  if (!lastSignIn) return "Not yet";
  const when = new Date(lastSignIn.at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
  return lastSignIn.ip ? `${when} · ${lastSignIn.ip}` : when;
}
