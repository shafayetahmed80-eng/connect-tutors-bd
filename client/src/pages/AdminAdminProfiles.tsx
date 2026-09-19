import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import RecordTable, { type RecordColumn } from "@/components/RecordTable";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";

type AdminRow = {
  id: number;
  name: string | null;
  email: string | null;
  loginId: string | null;
  phone: string | null;
  designation: string | null;
  createdAt: string | Date;
  pendingRequests: number;
};

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

/** Every Admin account, for the Project Owner; each name opens that Admin's profile and request history. */
export function AdminAdminProfilesContent() {
  const admins = trpc.admin.listAdmins.useQuery();
  const ownerId = trpc.admin.getWorkspaceAccess.useQuery().data?.userId;
  const columns: RecordColumn<AdminRow>[] = [
    {
      key: "admin", label: "Admin", place: "head",
      cell: row => <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={row.id === ownerId ? "/admin/profile" : `/admin/profile/${row.id}`} className="font-bold text-j-ink hover:text-j-accent hover:underline">{row.name?.trim() || row.email || "Admin account"}</Link>
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-2xs font-bold text-violet-800">{row.id === ownerId ? "Project Owner" : "Administrator"}</span>
        </div>
        {row.designation ? <p className="text-xs text-j-ink-soft">{row.designation}</p> : null}
      </div>,
    },
    { key: "loginId", label: "User ID", cell: row => <span className="tabular-nums">{row.loginId ?? "Not provisioned"}</span> },
    { key: "mobile", label: "Mobile", cell: row => <span className="whitespace-nowrap tabular-nums">{row.phone ?? "—"}</span> },
    { key: "email", label: "Email", cell: row => <span className="break-all">{row.email ?? "—"}</span> },
    {
      key: "requests", label: "Change requests",
      cell: row => Number(row.pendingRequests) > 0
        ? <span className="whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-bold text-amber-800">{Number(row.pendingRequests)} waiting</span>
        : <span className="text-j-ink-faint">—</span>,
    },
    { key: "joined", label: "Joined", cell: row => <span className="whitespace-nowrap tabular-nums">{formatDate(row.createdAt)}</span> },
  ];

  return <div className="mx-auto w-full max-w-[100rem] space-y-4 pb-10">
    {admins.isLoading ? <div className="flex min-h-40 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading Admin profiles…</div> : null}
    {admins.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{admins.error.message}</div> : null}
    {admins.data ? <RecordTable caption="Admin profiles" columns={columns} rows={admins.data as AdminRow[]} rowKey={row => row.id} empty="No Admin accounts." tableClassName="min-w-[52rem]" /> : null}
  </div>;
}

export default function AdminAdminProfiles() {
  return <AdminWorkspaceLayout title="Admin Profiles"><AdminAdminProfilesContent /></AdminWorkspaceLayout>;
}
