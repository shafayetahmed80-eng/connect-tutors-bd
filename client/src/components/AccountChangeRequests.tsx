import { Eye, EyeOff, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  ACCOUNT_CHANGE_NAME_MAX,
  ACCOUNT_CHANGE_REASON_MAX,
  ACCOUNT_CHANGE_REASON_MIN,
  type AccountChangeType,
} from "@shared/account-change-requests";
import { SettingValue, type AccountSettingsItem } from "@/components/AccountSettings";

type OwnRequest = {
  id: number;
  type: AccountChangeType;
  status: "pending" | "approved" | "declined" | "withdrawn";
  requestedValue: string | null;
  declineReason: string | null;
};

/**
 * The account's change requests, and asking or taking one back. Every panel's
 * Settings page reads its name and mobile from here too, so what the page shows
 * and what a request is checked against are the same values.
 */
export function useAccountChanges() {
  const utils = trpc.useUtils();
  const query = trpc.account.changeRequests.useQuery();
  const refresh = () => { void utils.account.changeRequests.invalidate(); };
  const onError = (error: { message: string }) => { toast.error(error.message); };
  const request = trpc.account.requestChange.useMutation({ onSuccess: () => { refresh(); toast.success("Request sent."); }, onError });
  const withdraw = trpc.account.withdrawChange.useMutation({ onSuccess: () => { refresh(); toast.success("Request withdrawn."); }, onError });
  const requests = (query.data?.requests ?? []) as OwnRequest[];
  /** The newest request of this type - the one its card talks about. */
  const latest = (type: AccountChangeType) => requests.find(row => row.type === type) ?? null;
  return {
    data: query.data,
    isLoading: query.isLoading,
    offered: (type: AccountChangeType) => Boolean(query.data?.offered.includes(type)),
    latest,
    request,
    withdraw,
    busy: request.isPending || withdraw.isPending,
  };
}

export type AccountChanges = ReturnType<typeof useAccountChanges>;

/** The small state a setting's button and card carry: a request waiting, or the last one declined. */
export function requestStatus(changes: AccountChanges, type: AccountChangeType): AccountSettingsItem["status"] | undefined {
  const last = changes.latest(type);
  if (last?.status === "pending") return { label: "Pending", tone: "waiting" };
  if (last?.status === "declined") return { label: "Declined", tone: "bad" };
  return undefined;
}

/** A request waiting on this setting, and the way to take it back. */
function WaitingRequest({ changes, type, text }: { changes: AccountChanges; type: AccountChangeType; text: string }) {
  return <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
    <p className="text-sm font-semibold text-amber-900">{text}</p>
    <button type="button" disabled={changes.busy} onClick={() => changes.withdraw.mutate({ type })} className="text-xs font-bold text-amber-900 underline-offset-2 hover:underline disabled:opacity-50">Withdraw</button>
  </div>;
}

/** Why the last request was declined, in the Admin's words. */
function DeclinedNote({ reason }: { reason: string | null }) {
  return <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"><span className="font-bold">Declined: </span>{reason || "No reason given."}</p>;
}

const inputClass = "h-11 w-full rounded-xl border border-j-field-border bg-white px-3 text-sm outline-none ring-[#1677c8] focus:ring-2";

/** Asking for a new name or mobile number. */
export function ValueChangeRequest({ changes, type, label, current }: { changes: AccountChanges; type: "name" | "mobile"; label: string; current: string | null }) {
  const [value, setValue] = useState("");
  const last = changes.latest(type);
  const ready = value.trim().length >= 2;
  return <div className="space-y-4">
    <SettingValue label={`Current ${label.toLowerCase()}`} value={current ?? ""} />
    {last?.status === "pending"
      ? <WaitingRequest changes={changes} type={type} text={`Requested: ${last.requestedValue ?? ""}`} />
      : <>
          {last?.status === "declined" ? <DeclinedNote reason={last.declineReason} /> : null}
          <form className="grid max-w-xl gap-3" onSubmit={event => { event.preventDefault(); changes.request.mutate({ type, value: value.trim() }, { onSuccess: () => setValue("") }); }}>
            <label className="grid gap-1.5 text-sm font-bold text-j-ink-strong">New {label.toLowerCase()}
              <input value={value} onChange={event => setValue(event.target.value)} maxLength={type === "mobile" ? 16 : ACCOUNT_CHANGE_NAME_MAX} inputMode={type === "mobile" ? "tel" : "text"} autoComplete={type === "mobile" ? "tel" : "name"} className={inputClass} />
            </label>
            <Button type="submit" disabled={changes.busy || !ready} className="w-fit rounded-xl bg-[#1677c8] font-bold hover:bg-[#0e4f85]">
              <Send size={15} aria-hidden={true} /> {changes.request.isPending ? "Sending…" : "Send request"}
            </Button>
          </form>
        </>}
  </div>;
}

/** The Guardian's "verify me": sent once both NID sides are on the profile. */
export function VerificationRequest({ changes, verified, nidReady }: { changes: AccountChanges; verified: boolean; nidReady: boolean }) {
  const last = changes.latest("verification");
  if (verified) return null;
  if (last?.status === "pending") return <WaitingRequest changes={changes} type="verification" text="Verification requested" />;
  return <div className="space-y-3">
    {last?.status === "declined" ? <DeclinedNote reason={last.declineReason} /> : null}
    <button
      type="button"
      disabled={changes.busy || !nidReady}
      onClick={() => changes.request.mutate({ type: "verification" })}
      className="h-12 w-full rounded-xl bg-gradient-to-r from-[#5aa0d8] to-[#0f6fc2] text-base font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
    >{changes.request.isPending ? "Sending…" : "Request to Verify"}</button>
  </div>;
}

/** Asking to close the account: a reason, and DELETE typed out. */
export function CloseAccountRequest({ changes, liveTuitionMessage }: { changes: AccountChanges; liveTuitionMessage?: string | null }) {
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const last = changes.latest("close_account");
  if (last?.status === "pending") return <WaitingRequest changes={changes} type="close_account" text="Account delete requested" />;
  const ready = reason.trim().length >= ACCOUNT_CHANGE_REASON_MIN && password.length > 0;
  return <div className="space-y-3">
    {last?.status === "declined" ? <DeclinedNote reason={last.declineReason} /> : null}
    {liveTuitionMessage ? <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">{liveTuitionMessage}</p> : null}
    <form className="grid max-w-xl gap-3" onSubmit={event => { event.preventDefault(); changes.request.mutate({ type: "close_account", reason: reason.trim(), password }, { onSettled: () => setPassword("") }); }}>
      <label className="grid gap-1.5 text-sm font-bold text-j-ink-strong">
        <span>Reason<span aria-hidden={true} className="text-[#d84a4a]"> *</span></span>
        <textarea value={reason} onChange={event => setReason(event.target.value)} rows={3} maxLength={ACCOUNT_CHANGE_REASON_MAX} disabled={Boolean(liveTuitionMessage)} className="w-full rounded-xl border border-j-field-border bg-white p-3 text-sm font-normal outline-none ring-[#1677c8] focus:ring-2 disabled:bg-j-surface-muted" />
      </label>
      <label className="grid gap-1.5 text-sm font-bold text-j-ink-strong">
        <span>Enter Your Password<span aria-hidden={true} className="text-[#d84a4a]"> *</span></span>
        <span className="relative">
          <input type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" maxLength={128} disabled={Boolean(liveTuitionMessage)} className={`${inputClass} pr-11 disabled:bg-j-surface-muted`} />
          <button type="button" onClick={() => setShowPassword(shown => !shown)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-j-ink-soft hover:text-j-ink">
            {showPassword ? <EyeOff size={16} aria-hidden={true} /> : <Eye size={16} aria-hidden={true} />}
          </button>
        </span>
      </label>
      <Button type="submit" disabled={changes.busy || !ready || Boolean(liveTuitionMessage)} className="w-fit rounded-xl bg-red-600 font-bold text-white hover:bg-red-700">
        <Trash2 size={15} aria-hidden={true} /> {changes.request.isPending ? "Sending…" : "Send delete request"}
      </Button>
    </form>
  </div>;
}

/** The Project Owner's own name or mobile, changed directly. */
export function OwnerContactForm({ field, name, phone }: { field: "name" | "mobile"; name: string | null; phone: string | null }) {
  const utils = trpc.useUtils();
  const [value, setValue] = useState(field === "name" ? name ?? "" : phone ?? "");
  const save = trpc.account.updateOwnerContact.useMutation({
    onSuccess: () => {
      void utils.account.changeRequests.invalidate();
      void utils.adminProfile.me.invalidate();
      void utils.admin.getWorkspaceAccess.invalidate();
      toast.success("Saved.");
    },
    onError: error => toast.error(error.message),
  });
  const label = field === "name" ? "Name" : "Mobile Number";
  return <form className="grid max-w-xl gap-3" onSubmit={event => {
    event.preventDefault();
    save.mutate(field === "name" ? { name: value.trim(), phone } : { name: name ?? "", phone: value.trim() });
  }}>
    <label className="grid gap-1.5 text-sm font-bold text-j-ink-strong">{label}
      <input value={value} onChange={event => setValue(event.target.value)} maxLength={field === "name" ? ACCOUNT_CHANGE_NAME_MAX : 16} inputMode={field === "mobile" ? "tel" : "text"} className={inputClass} />
    </label>
    <Button type="submit" disabled={save.isPending || (field === "name" && value.trim().length < 2)} className="w-fit rounded-xl bg-[#1677c8] font-bold hover:bg-[#0e4f85]">
      {save.isPending ? "Saving…" : "Save"}
    </Button>
  </form>;
}
