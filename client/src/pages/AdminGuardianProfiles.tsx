import AccountChangeHistory from "@/components/AccountChangeHistory";
import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { GuardianVerificationBadge } from "@/components/GuardianVerificationBadge";
import RecordTable, { type RecordColumn } from "@/components/RecordTable";
import StatusTabRow from "@/components/StatusTabRow";
import { TutorListPager } from "@/components/TutorListPager";
import { trpc } from "@/lib/trpc";
import { GuardianActivityContent, GuardianVerificationModal } from "@/pages/AdminGuardianActivity";
import { formatRequestSource } from "@shared/request-source";
import { ArrowLeft, Loader2, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useRoute, useSearch } from "wouter";

type Verification = "all" | "unverified" | "verified" | "rejected";

type GuardianRow = {
  userId: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  guardianId: string | null;
  verificationStatus: string;
  accountStatus: string;
  joinedAt: string | Date;
  tuitions: number;
  pendingRequests: number;
};

const verificationTabs: Array<{ key: Verification; label: string }> = [
  { key: "all", label: "All" },
  { key: "unverified", label: "Unverified" },
  { key: "verified", label: "Verified" },
  { key: "rejected", label: "Rejected" },
];

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function asVerification(value: string) {
  return (value === "verified" || value === "rejected" ? value : "unverified") as "unverified" | "verified" | "rejected";
}

const columns: RecordColumn<GuardianRow>[] = [
  {
    key: "guardian", label: "Guardian", place: "head",
    cell: row => <div className="min-w-0">
      <Link href={`/admin/guardians/${row.userId}`} className="font-bold text-j-ink hover:text-j-accent hover:underline">{row.name?.trim() || "Unnamed Guardian"}</Link>
      {row.guardianId ? <p className="text-xs tabular-nums text-j-ink-soft">Guardian ID {row.guardianId}</p> : null}
    </div>,
  },
  { key: "verification", label: "Verification", place: "head", cell: row => <GuardianVerificationBadge status={asVerification(row.verificationStatus)} /> },
  { key: "mobile", label: "Mobile", cell: row => <span className="whitespace-nowrap tabular-nums">{row.phone ?? "—"}</span> },
  { key: "email", label: "Email", cell: row => <span className="break-all">{row.email ?? "—"}</span> },
  { key: "tuitions", label: "Tuitions", cell: row => <span className="tabular-nums">{row.tuitions}</span> },
  {
    key: "requests", label: "Change requests",
    cell: row => row.pendingRequests > 0
      ? <span className="whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-bold text-amber-800">{row.pendingRequests} waiting</span>
      : <span className="text-j-ink-faint">—</span>,
  },
  {
    key: "joined", label: "Joined",
    cell: row => <span className="whitespace-nowrap tabular-nums">{formatDate(row.joinedAt)}{row.accountStatus === "closed" ? <span className="ml-1.5 rounded-full bg-red-50 px-2 py-0.5 text-2xs font-bold text-red-700">Closed</span> : null}</span>,
  },
];

/** Every Guardian account, one row each, under counted verification tabs. */
export function AdminGuardianProfilesContent() {
  const [query, setQuery] = useState("");
  const [verification, setVerification] = useState<Verification>("all");
  const [page, setPage] = useState(1);
  const guardians = trpc.admin.listGuardianProfiles.useQuery({ query, verification, page, pageSize: 20 });
  const counts = guardians.data?.counts;

  return <div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:border-b sm:border-[#dce9f1]">
      <StatusTabRow label="Verification" flush items={verificationTabs.map(tab => ({ ...tab, count: counts?.[tab.key] }))} selected={verification} onSelect={key => { setVerification(key ?? "all"); setPage(1); }} />
      <label className="relative pb-2 sm:w-80">
        <span className="sr-only">Search Guardians</span>
        <Search className="pointer-events-none absolute left-3 top-[calc(50%-4px)] h-4 w-4 -translate-y-1/2 text-j-ink-faint" />
        <input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Search name, Guardian ID, mobile or email"
          className="h-9 w-full rounded-lg border border-j-border bg-white pl-9 pr-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100" />
      </label>
    </div>
    {guardians.isLoading ? <div className="flex min-h-40 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading Guardian profiles…</div> : null}
    {guardians.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Guardian profiles could not be loaded.</div> : null}
    {!guardians.isLoading && !guardians.isError
      ? <RecordTable caption="Guardian profiles" columns={columns} rows={(guardians.data?.items ?? []) as GuardianRow[]} rowKey={row => row.userId} empty="No Guardian matches." tableClassName="min-w-[60rem]" />
      : null}
    <TutorListPager page={page} totalPages={guardians.data?.totalPages ?? 1} onPage={setPage} label="Guardian profile pages" />
  </div>;
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return <div className="flex items-baseline justify-between gap-3 border-b border-[#eef4f9] py-2 last:border-b-0">
    <span className="shrink-0 text-xs text-j-ink-muted">{label}</span>
    <span className={`min-w-0 break-words text-right text-sm ${value ? "font-medium text-j-ink" : "italic text-j-ink-faint"}`}>{value || "Not added"}</span>
  </div>;
}

/** One Guardian: what they gave, their NID images, verification, and their change requests. */
export function AdminGuardianProfileDetailContent({ userId }: { userId: number }) {
  const profileQuery = trpc.admin.getGuardianProfile.useQuery({ guardianUserId: userId }, { retry: false });
  const [verifying, setVerifying] = useState(false);
  const profile = profileQuery.data;

  return <div className="mx-auto w-full max-w-5xl space-y-5 pb-10">
    <Link href="/admin/guardians" className="inline-flex items-center gap-1.5 text-sm font-bold text-j-accent hover:underline"><ArrowLeft size={15} /> Back to Guardian Profiles</Link>
    {profileQuery.isLoading ? <div className="flex min-h-40 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading profile…</div> : null}
    {profileQuery.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{profileQuery.error.message}</div> : null}
    {profile ? <>
      <section className="rounded-xl border border-j-border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-j-ink">{profile.name || "Unnamed Guardian"}</h1>
            <p className="text-sm tabular-nums text-j-ink-soft">Guardian ID {profile.guardianId}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <GuardianVerificationBadge status={profile.verificationStatus} rejectionReason={profile.verificationRejectionReason} />
            <button type="button" onClick={() => setVerifying(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-j-border bg-white px-3 text-sm font-bold text-j-ink-soft hover:bg-j-surface-sunken"><ShieldCheck size={15} /> Verify Guardian</button>
          </div>
        </div>
        <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
          <div>
            <DetailRow label="Mobile" value={profile.phone} />
            <DetailRow label="Additional mobile" value={profile.additionalPhone} />
            <DetailRow label="Email" value={profile.email} />
            <DetailRow label="Profession" value={profile.profession} />
            <DetailRow label="Religion" value={profile.religion} />
            <DetailRow label="Nationality" value={profile.nationality} />
          </div>
          <div>
            <DetailRow label="Address details" value={profile.addressDetails} />
            <DetailRow label="Social profile links" value={profile.socialLinks} />
            <DetailRow label="Emergency contact" value={[profile.emergencyContactName, profile.emergencyContactPhone].filter(Boolean).join(" · ")} />
            <DetailRow label="Emergency relation" value={profile.emergencyContactRelation} />
            <DetailRow label="How did you hear" value={profile.heardAboutUs ? formatRequestSource(profile.heardAboutUs) : ""} />
            <DetailRow label="Joined" value={formatDate(profile.accountCreatedAt)} />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(["front", "back"] as const).map(side => {
            const url = profile.nidDocuments[side];
            return <div key={side} className="rounded-xl border border-j-border bg-j-surface-sunken p-2">
              <p className="mb-1 text-xs font-bold text-j-ink-strong">NID card — {side}</p>
              {url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={`NID card ${side}`} className="h-32 w-full rounded-lg border border-j-border object-cover" /></a> : <div className="grid h-32 place-items-center rounded-lg border border-dashed border-j-field-border text-2xs text-j-ink-faint">No image</div>}
            </div>;
          })}
        </div>
      </section>
      <AccountChangeHistory userId={userId} />
    </> : null}
    {verifying ? <GuardianVerificationModal guardianUserId={userId} onClose={() => setVerifying(false)} /> : null}
  </div>;
}

export default function AdminGuardianProfileDetail() {
  const [, params] = useRoute("/admin/guardians/:userId");
  const userId = Number(params?.userId);
  return <AdminWorkspaceLayout title="Guardian Profiles">
    {Number.isInteger(userId) && userId > 0 ? <AdminGuardianProfileDetailContent userId={userId} /> : null}
  </AdminWorkspaceLayout>;
}

const guardianViews = [
  { key: "profiles", label: "Profiles" },
  { key: "requests", label: "Tuition requests" },
] as const;

/**
 * The Guardian Profiles tab: a Guardian list by default, and the older
 * request-by-request Guardian activity one tab over, so nothing it did is lost.
 */
export function AdminGuardians() {
  const view = new URLSearchParams(useSearch()).get("view") === "requests" ? "requests" : "profiles";
  return <AdminWorkspaceLayout title="Guardian Profiles">
    <div className="mx-auto w-full max-w-[100rem] space-y-4 pb-10">
      <nav aria-label="Guardian views" className="inline-flex rounded-lg border border-j-border bg-white p-0.5">
        {guardianViews.map(item => <Link key={item.key} href={item.key === "profiles" ? "/admin/guardians" : "/admin/guardians?view=requests"}
          aria-current={view === item.key ? "page" : undefined}
          className={`rounded-md px-3 py-1.5 text-xs font-bold ${view === item.key ? "bg-j-accent text-white" : "text-j-ink-soft hover:bg-j-surface-sunken"}`}>{item.label}</Link>)}
      </nav>
      {view === "requests" ? <GuardianActivityContent /> : <AdminGuardianProfilesContent />}
    </div>
  </AdminWorkspaceLayout>;
}
