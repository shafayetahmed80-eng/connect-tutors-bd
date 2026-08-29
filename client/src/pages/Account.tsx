import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { CircleHelp, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const allowedRoles = ["guardian", "tutor", "user", "admin"] as const;
type AccountRole = (typeof allowedRoles)[number];

export type AccountPresentation = {
  roleLabel: "Guardian" | "Tutor" | "Admin";
  primaryAction: { href: string; label: string };
  secondaryAction?: { href: string; label: string };
  description: string;
};

export function getAccountPresentation(role: string | null | undefined): AccountPresentation | null {
  if (role === "tutor") {
    return {
      roleLabel: "Tutor",
      primaryAction: { href: "/tutor/dashboard", label: "Open Tutor Dashboard" },
      description: "This private account area is available to your signed-in Tutor account.",
    };
  }
  if (role === "admin") {
    return {
      roleLabel: "Admin",
      primaryAction: { href: "/admin/matching", label: "Open Admin Matching" },
      description: "This protected area is available to authorized Connect Tutors BD administrators.",
    };
  }
  if (role === "guardian" || role === "user") {
    return {
      roleLabel: "Guardian",
      primaryAction: { href: "/guardian/dashboard", label: "Open Guardian Dashboard" },
      secondaryAction: { href: "/request-tutor", label: "Create a tutor request" },
      description: "This private account area is available to your signed-in Guardian account.",
    };
  }
  return null;
}

function AccountStatusPanel({ title, description }: { title: string; description: string }) {
  return <main className="auth-page"><div className="auth-shell"><section className="auth-panel auth-support-panel" aria-live="polite"><div className="auth-icon"><LockKeyhole size={21} /></div><p className="eyebrow">Secure account access</p><h1>{title}</h1><p>{description}</p></section></div></main>;
}

export default function AccountPage() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" });
  const [, navigate] = useLocation();
  const presentation = getAccountPresentation(user?.role);

  useEffect(() => {
    if (!loading && user && !allowedRoles.includes(user.role as AccountRole)) navigate("/");
  }, [loading, navigate, user]);

  if (loading || !user) {
    return <AccountStatusPanel title="Checking your account…" description="We are confirming your account permissions before showing private information." />;
  }

  if (!presentation) {
    return <AccountStatusPanel title="Returning you safely" description="This account does not have a supported workspace. We are returning you to the public site." />;
  }

  return <main className="auth-page"><div className="auth-shell"><section className="auth-panel auth-account-panel"><div className="auth-account-topline"><div className="auth-icon"><UserRound size={22} /></div><span className="auth-status-pill"><ShieldCheck size={15} /> Signed in</span></div><p className="eyebrow">Your account</p><h1>Welcome, {user.name || presentation.roleLabel}.</h1><p>{presentation.description}</p><div className="auth-feature-list"><div><ShieldCheck size={17} /><span>Account type: <strong>{presentation.roleLabel}</strong></span></div><div><UserRound size={17} /><span>Authenticated Connect Tutors account</span></div><div><LockKeyhole size={17} /><span>Your contact details remain private.</span></div></div><div className="auth-actions"><Link className="button-primary" href={presentation.primaryAction.href}>{presentation.primaryAction.label}</Link>{presentation.secondaryAction ? <Link className="button-secondary" href={presentation.secondaryAction.href}>{presentation.secondaryAction.label}</Link> : <Link className="button-secondary" href="/tutors">Browse tutors</Link>}</div><Link href="/contact" className="auth-help-link"><CircleHelp size={16} /> Need account help? Contact us</Link></section></div></main>;
}
