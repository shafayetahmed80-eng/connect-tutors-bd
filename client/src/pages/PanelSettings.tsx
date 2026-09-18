import { BadgeCheck, KeyRound, Phone, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "wouter";
import { AccountSettings, ChangePasswordForm, SettingValue, type AccountSettingsItem } from "@/components/AccountSettings";
import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { GuardianVerificationBadge } from "@/components/GuardianVerificationBadge";
import { useSiteContact } from "@/lib/siteContent";
import { trpc } from "@/lib/trpc";

/*
 * Each panel's Settings page: the same buttons and panels, filled with that
 * panel's own account. Name and mobile are shown here; the requests to change
 * them are the next step of the Settings work.
 */

export const ADMIN_SETTINGS_PATH = "/admin/settings";
export const GUARDIAN_SETTINGS_PATH = "/guardian/dashboard/settings";
export const TUTOR_SETTINGS_PATH = "/tutor/dashboard/settings";

function passwordItem(signInLabel?: string, signInValue?: string): AccountSettingsItem {
  return {
    key: "password",
    label: "Password",
    icon: KeyRound,
    iconTone: "indigo",
    value: "••••••••",
    content: <div className="space-y-4">
      {signInLabel ? <SettingValue label={signInLabel} value={signInValue ?? ""} /> : null}
      <ChangePasswordForm />
    </div>,
  };
}

/** The Admin panel's Settings: name, mobile and password. An Admin has no verification to ask for. */
export function AdminSettingsContent() {
  const profile = trpc.adminProfile.me.useQuery().data;
  const items: AccountSettingsItem[] = [
    { key: "name", label: "Name", icon: UserRound, iconTone: "violet", value: profile?.name || "Not set", content: <SettingValue label="Name" value={profile?.name ?? ""} /> },
    { key: "mobile", label: "Mobile Number", shortLabel: "Mobile", icon: Phone, iconTone: "rose", value: profile?.phone || "Not set", content: <SettingValue label="Mobile Number" value={profile?.phone ?? ""} /> },
    passwordItem("User ID", profile?.loginId ?? ""),
  ];
  return <AccountSettings items={items} basePath={ADMIN_SETTINGS_PATH} />;
}

export default function AdminSettings() {
  return <AdminWorkspaceLayout title="Settings"><AdminSettingsContent /></AdminWorkspaceLayout>;
}

/** The Guardian panel's Settings. */
export function GuardianSettingsContent() {
  const contact = useSiteContact();
  const profile = trpc.guardianProfile.me.useQuery().data;
  const verification = profile?.verificationStatus ?? "unverified";
  // Until change requests arrive, name and number still change through support.
  const support = <p className="mt-4 text-sm text-j-ink-soft">
    <a className="font-bold text-[#1267c8] underline-offset-2 hover:underline" href={contact.whatsapp()} target="_blank" rel="noreferrer">01516 131 411</a>
  </p>;
  const items: AccountSettingsItem[] = [
    { key: "name", label: "Name", icon: UserRound, iconTone: "violet", value: profile?.name || "Not set", content: <><SettingValue label="Name" value={profile?.name ?? ""} />{support}</> },
    { key: "mobile", label: "Mobile Number", shortLabel: "Mobile", icon: Phone, iconTone: "rose", value: profile?.phone || "Not set", content: <><SettingValue label="Mobile Number" value={profile?.phone ?? ""} />{support}</> },
    passwordItem(),
    {
      key: "verification",
      label: "Profile Verification",
      shortLabel: "Verification",
      icon: ShieldCheck,
      iconTone: "teal",
      alwaysOpen: true,
      value: verification === "verified" ? "Verified" : verification === "rejected" ? "Not approved" : "Not verified",
      status: verification === "verified" ? { label: "Verified", tone: "good" } : verification === "rejected" ? { label: "Rejected", tone: "bad" } : undefined,
      content: <div className="space-y-3">
        <GuardianVerificationBadge status={verification} rejectionReason={profile?.verificationRejectionReason} />
        <SettingValue label="NID card (front)" value={profile?.nidFrontUploaded ? "Uploaded" : ""} />
        <SettingValue label="NID card (back)" value={profile?.nidBackUploaded ? "Uploaded" : ""} />
        <Link href="/guardian/dashboard/profile" className="inline-flex text-sm font-bold text-[#1267c8] hover:underline">Open Profile</Link>
      </div>,
    },
  ];
  return <AccountSettings items={items} basePath={GUARDIAN_SETTINGS_PATH} />;
}

type TutorSettingsProfile = {
  name?: string | null;
  phone?: string | null;
  contactEmail?: string | null;
  profileStatus?: string | null;
  verified?: number | boolean | null;
} | null | undefined;

const tutorReviewStates: Record<string, { label: string; tone: "good" | "waiting" | "bad" | "neutral" }> = {
  draft: { label: "Draft", tone: "neutral" },
  pending: { label: "Pending review", tone: "waiting" },
  changes_requested: { label: "Changes requested", tone: "bad" },
  approved: { label: "Approved", tone: "good" },
  suspended: { label: "Suspended", tone: "bad" },
};

/** The Tutor panel's Settings. Verification is the profile review, sent from the Profile tab. */
export function TutorSettingsContent({ profile }: { profile: TutorSettingsProfile }) {
  const review = tutorReviewStates[profile?.profileStatus ?? "draft"] ?? tutorReviewStates.draft;
  const items: AccountSettingsItem[] = [
    { key: "name", label: "Name", icon: UserRound, iconTone: "violet", value: profile?.name || "Not set", content: <SettingValue label="Name" value={profile?.name ?? ""} /> },
    { key: "mobile", label: "Mobile Number", shortLabel: "Mobile", icon: Phone, iconTone: "rose", value: profile?.phone || "Not set", content: <SettingValue label="Mobile Number" value={profile?.phone ?? ""} /> },
    passwordItem("Sign-in email", profile?.contactEmail ?? ""),
    {
      key: "verification",
      label: "Profile Verification",
      shortLabel: "Verification",
      icon: BadgeCheck,
      iconTone: "teal",
      alwaysOpen: true,
      value: review.label,
      status: profile?.verified ? { label: "Verified", tone: "good" } : { label: review.label, tone: review.tone },
      content: <div className="space-y-3">
        <SettingValue label="Profile review" value={review.label} />
        <SettingValue label="Verified Tutor" value={profile?.verified ? "Yes" : "Not yet"} />
        <Link href="/tutor/dashboard/profile" className="inline-flex text-sm font-bold text-[#1267c8] hover:underline">Open Profile</Link>
      </div>,
    },
  ];
  return <AccountSettings items={items} basePath={TUTOR_SETTINGS_PATH} />;
}
