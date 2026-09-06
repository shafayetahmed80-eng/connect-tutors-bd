import { BadgeCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import type { GuardianVerificationStatus } from "@shared/guardian-profile";

const PRESENTATION: Record<GuardianVerificationStatus, { label: string; icon: typeof BadgeCheck; className: string }> = {
  verified: { label: "Verified", icon: BadgeCheck, className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  rejected: { label: "Verification failed", icon: ShieldAlert, className: "border-rose-200 bg-rose-50 text-rose-800" },
  unverified: { label: "Not verified yet", icon: ShieldQuestion, className: "border-j-border bg-j-surface-sunken text-j-ink-soft" },
};

/**
 * The Guardian's identity-verification state. An Admin flips it after a light
 * anti-fraud check - there is no submit-for-review step and it never gates
 * anything the Guardian can do. `rejected` shows the Admin's reason beneath.
 */
export function GuardianVerificationBadge({
  status,
  rejectionReason,
  className = "",
}: {
  status: GuardianVerificationStatus;
  rejectionReason?: string | null;
  className?: string;
}) {
  const { label, icon: Icon, className: tone } = PRESENTATION[status] ?? PRESENTATION.unverified;
  return (
    <div className={className}>
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${tone}`}>
        <Icon size={13} aria-hidden={true} />
        {label}
      </span>
      {status === "rejected" && rejectionReason?.trim() ? (
        <p className="mt-1.5 text-2xs leading-4 text-rose-700">{rejectionReason.trim()}</p>
      ) : null}
    </div>
  );
}
