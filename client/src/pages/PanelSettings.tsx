import { BadgeCheck, KeyRound, Phone, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { Link } from "wouter";
import {
  CloseAccountRequest,
  OwnerContactForm,
  requestStatus,
  useAccountChanges,
  ValueChangeRequest,
  VerificationRequest,
  type AccountChanges,
} from "@/components/AccountChangeRequests";
import { AccountSettings, ChangePasswordForm, SettingValue, type AccountSettingsItem } from "@/components/AccountSettings";
import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { GuardianVerificationBadge } from "@/components/GuardianVerificationBadge";
import { trpc } from "@/lib/trpc";

/*
 * Each panel's Settings page: the same buttons and cards, filled with that
 * panel's own account. The password changes here and now; a name, a mobile
 * number, a Guardian's verification and closing the account are requests an
 * Admin decides - except the Project Owner's own name and mobile, which have
 * nobody above them to ask.
 */

export const ADMIN_SETTINGS_PATH = "/admin/settings";
export const GUARDIAN_SETTINGS_PATH = "/guardian/dashboard/settings";
export const TUTOR_SETTINGS_PATH = "/tutor/dashboard/settings";

const LIVE_TUITION_MESSAGE = "An Appointed or Confirmed tuition is still running on this account. It has to end before the account can be closed.";

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

/** Name and mobile, asked for through a request. */
function requestedValueItems(changes: AccountChanges): AccountSettingsItem[] {
  const name = changes.data?.currentName ?? "";
  const mobile = changes.data?.currentMobile ?? "";
  return [
    { key: "name", label: "Name", icon: UserRound, iconTone: "violet", value: name, status: requestStatus(changes, "name"), content: <ValueChangeRequest changes={changes} type="name" label="Name" current={name} /> },
    { key: "mobile", label: "Mobile Number", shortLabel: "Mobile", icon: Phone, iconTone: "rose", value: mobile, status: requestStatus(changes, "mobile"), content: <ValueChangeRequest changes={changes} type="mobile" label="Mobile Number" current={mobile} /> },
  ];
}

function closeAccountItem(changes: AccountChanges): AccountSettingsItem {
  const status = requestStatus(changes, "close_account");
  return {
    key: "delete",
    label: "Account Delete",
    shortLabel: "Delete",
    icon: Trash2,
    value: status?.label === "Pending" ? "Requested" : "Active",
    status,
    danger: true,
    content: <CloseAccountRequest changes={changes} liveTuitionMessage={changes.data?.liveTuition ? LIVE_TUITION_MESSAGE : null} />,
  };
}

/**
 * The Admin panel's Settings. The Project Owner edits their own name and
 * mobile directly and has no account to close; another Admin asks for all
 * three. An Admin has no verification to ask for.
 */
export function AdminSettingsContent() {
  const changes = useAccountChanges();
  const profile = trpc.adminProfile.me.useQuery().data;
  if (changes.isLoading) return null;
  const name = changes.data?.currentName ?? null;
  const mobile = changes.data?.currentMobile ?? null;
  const items: AccountSettingsItem[] = changes.data?.isOwner
    ? [
        { key: "name", label: "Name", icon: UserRound, iconTone: "violet", value: name ?? "", content: <OwnerContactForm field="name" name={name} phone={mobile} /> },
        { key: "mobile", label: "Mobile Number", shortLabel: "Mobile", icon: Phone, iconTone: "rose", value: mobile ?? "", content: <OwnerContactForm field="mobile" name={name} phone={mobile} /> },
        passwordItem("User ID", profile?.loginId ?? ""),
      ]
    : [...requestedValueItems(changes), passwordItem("User ID", profile?.loginId ?? ""), closeAccountItem(changes)];
  return <AccountSettings items={items} basePath={ADMIN_SETTINGS_PATH} />;
}

export default function AdminSettings() {
  return <AdminWorkspaceLayout title="Settings"><AdminSettingsContent /></AdminWorkspaceLayout>;
}

/** The Guardian panel's Settings. */
export function GuardianSettingsContent() {
  const changes = useAccountChanges();
  const profile = trpc.guardianProfile.me.useQuery().data;
  if (changes.isLoading) return null;
  const verification = profile?.verificationStatus ?? "unverified";
  const waiting = requestStatus(changes, "verification");
  const items: AccountSettingsItem[] = [
    ...requestedValueItems(changes),
    passwordItem(),
    {
      key: "verification",
      label: "Profile Verification",
      shortLabel: "Verification",
      icon: ShieldCheck,
      iconTone: "teal",
      alwaysOpen: true,
      value: verification === "verified" ? "Verified" : verification === "rejected" ? "Not approved" : "Not verified",
      status: verification === "verified"
        ? { label: "Verified", tone: "good" }
        : waiting ?? (verification === "rejected" ? { label: "Rejected", tone: "bad" } : undefined),
      content: <div className="space-y-3">
        <GuardianVerificationBadge status={verification} rejectionReason={profile?.verificationRejectionReason} />
        <SettingValue label="NID card (front)" value={profile?.nidFrontUploaded ? "Uploaded" : ""} />
        <SettingValue label="NID card (back)" value={profile?.nidBackUploaded ? "Uploaded" : ""} />
        <Link href="/guardian/dashboard/profile" className="inline-flex text-sm font-bold text-[#1267c8] hover:underline">Open Profile</Link>
        <VerificationRequest changes={changes} verified={verification === "verified"} nidReady={Boolean(profile?.nidFrontUploaded && profile?.nidBackUploaded)} />
      </div>,
    },
    closeAccountItem(changes),
  ];
  return <AccountSettings items={items} basePath={GUARDIAN_SETTINGS_PATH} />;
}

type TutorSettingsProfile = {
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
  const changes = useAccountChanges();
  if (changes.isLoading) return null;
  const review = tutorReviewStates[profile?.profileStatus ?? "draft"] ?? tutorReviewStates.draft;
  const items: AccountSettingsItem[] = [
    ...requestedValueItems(changes),
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
    closeAccountItem(changes),
  ];
  return <AccountSettings items={items} basePath={TUTOR_SETTINGS_PATH} />;
}
