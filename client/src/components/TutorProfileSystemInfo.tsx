import React from "react";

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

  return <section aria-labelledby="profile-system-information-heading" className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
    <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Section H</p>
        <h2 id="profile-system-information-heading" className="mt-1 text-lg font-bold text-slate-900">Section H · System information</h2>
        <p className="mt-1 text-sm text-slate-600">These values are calculated and managed by Connect Tutors BD.</p>
      </div>
      {isPending && <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Pending review</span>}
    </div>

    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <dt className="text-xs font-medium text-slate-500">Profile completion</dt>
        <dd className="mt-1 text-xl font-bold text-sky-700">{profile.completionPercentage}%</dd>
      </div>
      <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <dt className="text-xs font-medium text-slate-500">Last updated</dt>
        <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{formatTutorProfileLastUpdated(profile.lastUpdatedAt)}</dd>
      </div>
      <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <dt className="text-xs font-medium text-slate-500">Profile status</dt>
        <dd className="mt-1 text-sm font-semibold text-slate-800">{profileStatus}</dd>
      </div>
      <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <dt className="text-xs font-medium text-slate-500">Account status</dt>
        <dd className="mt-1 text-sm font-semibold text-slate-800">{accountStatus}</dd>
      </div>
      <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <dt className="text-xs font-medium text-slate-500">Assigned requests</dt>
        <dd className="mt-1 text-sm font-semibold text-slate-800">{assignedLabel}</dd>
      </div>
    </dl>
  </section>;
}
