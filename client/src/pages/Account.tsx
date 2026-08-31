import { Redirect } from "wouter";
import { LockKeyhole } from "lucide-react";
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

function AccountStatusPanel({ title, description }: { title: string; description: string }) {
  return <main className="auth-page"><div className="auth-shell"><section className="auth-panel auth-support-panel" aria-live="polite"><div className="auth-icon"><LockKeyhole size={21} /></div><p className="eyebrow">Secure account access</p><h1>{title}</h1><p>{description}</p></section></div></main>;
}

export default function AccountPage() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" });

  if (loading || !user) {
    return <AccountStatusPanel title="Checking your account…" description="We are confirming your account permissions before opening your workspace." />;
  }

  return <Redirect to={getAccountRedirectPath(user.role)} />;
}
