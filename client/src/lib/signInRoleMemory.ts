// Which account type this device last signed in (or registered) as, so the
// next visit to /auth opens with that card already chosen. A convenience only:
// a `?role=` in the link still wins, and anything unreadable falls back to
// Guardian exactly as before.

export type SignInRole = "guardian" | "tutor";

const STORAGE_KEY = "connect-tutors.sign-in-role";

export function readRememberedSignInRole(): SignInRole | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "guardian" || value === "tutor" ? value : null;
  } catch {
    return null;
  }
}

/** Accepts a server role; the legacy `user` role is a Guardian. Anything else is ignored. */
export function rememberSignInRole(role: string) {
  const signInRole: SignInRole | null = role === "tutor" ? "tutor" : role === "guardian" || role === "user" ? "guardian" : null;
  if (!signInRole) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, signInRole);
  } catch {
    // Private windows and blocked storage just lose the convenience.
  }
}
