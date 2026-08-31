import React from "react";
import { tutorProfileTheme as tp } from "@/pages/tutorProfileTheme";

type TutorProfileSystemInfoProps = {
  profile: {
    completionPercentage: number;
    lastUpdatedAt: Date | string | null | undefined;
    profileStatus: string;
    accountStatus: string;
    assignedRequestCount: number;
  };
};

const profileStatusLabel: Record<string, string> = {
  draft: "Draft",
  pending: "Pending review",
  changes_requested: "Changes requested",
  approved: "Approved",
  suspended: "Suspended",
};

function humanize(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map(word => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function formatTutorProfileLastUpdated(value: Date | string | null | undefined) {
  if (!value) return "Not available yet";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available yet" : date.toLocaleString();
}

export function TutorProfileSystemInfo({ profile }: TutorProfileSystemInfoProps) {
  const profileStatus = profileStatusLabel[profile.profileStatus] ?? humanize(profile.profileStatus);
  const accountStatus = humanize(profile.accountStatus);
  const isPending = profile.profileStatus === "pending";
  const assignedLabel = profile.assignedRequestCount === 0
    ? "No requests are assigned yet."
    : `${profile.assignedRequestCount} ${profile.assignedRequestCount === 1 ? "request is" : "requests are"} assigned.`;

  return <section aria-labelledby="profile-system-information-heading" className={`${tp.cardSunken} p-5`}>
    <div className="flex flex-col gap-2 border-b border-j-border pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className={tp.eyebrow}>System</p>
        <h2 id="profile-system-information-heading" className={`mt-1 text-lg ${tp.heading}`}>System information</h2>
        <p className={`mt-1 text-sm ${tp.bodySoft}`}>These values are calculated and managed by Connect Tutors BD.</p>
      </div>
      {isPending && <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Pending review</span>}
    </div>

    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="rounded-xl border border-j-border bg-white p-3">
        <dt className={tp.rowLabel}>Profile completion</dt>
        <dd className="mt-1 text-xl font-bold text-j-accent">{profile.completionPercentage}%</dd>
      </div>
      <div className="rounded-xl border border-j-border bg-white p-3">
        <dt className={tp.rowLabel}>Last updated</dt>
        <dd className={`mt-1 break-words ${tp.rowValue}`}>{formatTutorProfileLastUpdated(profile.lastUpdatedAt)}</dd>
      </div>
      <div className="rounded-xl border border-j-border bg-white p-3">
        <dt className={tp.rowLabel}>Profile status</dt>
        <dd className={`mt-1 ${tp.rowValue}`}>{profileStatus}</dd>
      </div>
      <div className="rounded-xl border border-j-border bg-white p-3">
        <dt className={tp.rowLabel}>Account status</dt>
        <dd className={`mt-1 ${tp.rowValue}`}>{accountStatus}</dd>
      </div>
      <div className="rounded-xl border border-j-border bg-white p-3">
        <dt className={tp.rowLabel}>Assigned requests</dt>
        <dd className={`mt-1 ${tp.rowValue}`}>{assignedLabel}</dd>
      </div>
    </dl>
  </section>;
}
