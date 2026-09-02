import { Redirect } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * `/account` has no page of its own — a signed-in visitor is sent straight to
 * their workspace, an unknown role back to the public site, and an
 * unauthenticated visitor to sign-in (via `useAuth`). It stays as a route so
 * old links and bookmarks keep working.
 */
export function getAccountRedirectPath(role: string | null | undefined): string {
  if (role === "tutor") return "/tutor/dashboard/jobs";
  if (role === "admin") return "/admin/matching";
  if (role === "guardian" || role === "user") return "/guardian/dashboard/posted-jobs";
  return "/";
}

export default function AccountPage() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" });

  // Nothing is drawn while the session resolves. This used to show a "Checking
  // your account…" panel, which read as a real page the visitor had arrived at
  // rather than the redirect it actually is - and it is on screen for a moment
  // either way.
  if (loading || !user) return null;

  return <Redirect to={getAccountRedirectPath(user.role)} />;
}
