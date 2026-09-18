import { ChevronDown, KeyRound, PencilLine, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";

type SettingTone = "good" | "waiting" | "bad" | "neutral";

export type AccountSettingsItem = {
  /** The part of the page it opens, and its "?item=" value. */
  key: string;
  label: string;
  /** The label on a laptop's one-line row when the full one is long. */
  shortLabel?: string;
  icon: LucideIcon;
  /** The icon's own soft colour on a phone's card. */
  iconTone?: "sky" | "violet" | "rose" | "indigo" | "teal" | "red";
  /** What is there now. */
  value: string;
  /** A short state - "Verified", "Pending review". */
  status?: { label: string; tone: SettingTone };
  /**
   * A phone shows this card's content without waiting for a tap - for a
   * setting whose whole point is its state and one action, like verification.
   */
  alwaysOpen?: boolean;
  /** The destructive one: last, red, folded shut. */
  danger?: boolean;
  content: ReactNode;
};

const statusDot: Record<SettingTone, string> = {
  good: "bg-emerald-500",
  waiting: "bg-amber-500",
  bad: "bg-red-500",
  neutral: "bg-slate-400",
};

const statusChip: Record<SettingTone, string> = {
  good: "bg-emerald-50 text-emerald-800",
  waiting: "bg-amber-50 text-amber-800",
  bad: "bg-red-50 text-red-800",
  neutral: "bg-j-surface-muted text-j-ink-soft",
};

const iconTones: Record<NonNullable<AccountSettingsItem["iconTone"]>, string> = {
  sky: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
  rose: "bg-rose-50 text-rose-500",
  indigo: "bg-indigo-50 text-indigo-600",
  teal: "bg-teal-50 text-teal-600",
  red: "bg-red-50 text-red-600",
};

/**
 * The Settings page every panel shares, in two shapes.
 *
 * On a laptop: one line of small buttons, one per setting, and the chosen
 * one's panel below them. On a phone: a card per setting - icon, name, current
 * value and a pencil that opens the card in place - with verification open
 * from the start and account deletion folded shut at the end.
 *
 * The choice lives in the address ("?item=password"), so the avatar menu and a
 * notification can open a setting directly, in either shape.
 */
export function AccountSettings({ items, basePath }: { items: AccountSettingsItem[]; basePath: string }) {
  const [, setLocation] = useLocation();
  const requested = new URLSearchParams(useSearch()).get("item");
  const active = items.find(item => item.key === requested) ?? items[0];
  const choose = (key: string) => setLocation(`${basePath}?item=${key}`);
  // One shape at a time, so a form is never in the page twice.
  const phone = useIsMobile();

  if (!phone) return (
    <div className="space-y-5">
      <nav aria-label="Account settings" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(item => {
          const selected = item.key === active.key;
          const Icon = item.icon;
          return <button
            key={item.key}
            type="button"
            aria-current={selected ? "page" : undefined}
            aria-label={item.status ? `${item.label}: ${item.status.label}` : item.label}
            onClick={() => choose(item.key)}
            className={`group flex min-w-0 items-center justify-center gap-2 rounded-xl border bg-white px-3 py-2 transition-[border-color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677e8] focus-visible:ring-offset-2 motion-reduce:transition-none ${
              selected
                ? item.danger ? "border-red-300 bg-red-50/60" : "border-[#7fb5ea] bg-[#f3f9ff]"
                : item.danger ? "border-red-100 hover:border-red-200" : "border-[#dce9f1] hover:border-[#a9cdf0]"
            }`}
          >
            <span className={`relative grid size-7 shrink-0 place-items-center rounded-lg ${item.danger ? iconTones.red : iconTones[item.iconTone ?? "sky"]}`}>
              <Icon aria-hidden={true} className="size-4" />
              {item.status ? <span aria-hidden={true} className={`absolute -right-0.5 -top-0.5 size-2 rounded-full ring-2 ring-white ${statusDot[item.status.tone]}`} /> : null}
            </span>
            <span className={`min-w-0 truncate text-xs ${
              selected ? `font-bold ${item.danger ? "text-red-700" : "text-[#1267c8]"}` : `font-semibold ${item.danger ? "text-red-700" : "text-j-ink-soft group-hover:text-[#173d60]"}`
            }`}>
              <span className="lg:hidden">{item.shortLabel ?? item.label}</span>
              <span className="hidden lg:inline">{item.label}</span>
            </span>
          </button>;
        })}
      </nav>

      <section aria-labelledby="account-setting-heading" className={`rounded-2xl border bg-white p-6 shadow-sm ${active.danger ? "border-red-200" : "border-j-border"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="account-setting-heading" className={`text-lg font-bold tracking-[-0.02em] ${active.danger ? "text-red-700" : "text-j-ink"}`}>{active.label}</h2>
          {active.status ? <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-2xs font-bold ${statusChip[active.status.tone]}`}>{active.status.label}</span> : null}
        </div>
        <div className="mt-4">{active.content}</div>
      </section>
    </div>
  );

  return (
    <ul aria-label="Account settings" className="space-y-3">
      {items.map(item => {
        const open = item.alwaysOpen || item.key === requested;
        const Icon = item.icon;
        const toggle = () => (item.key === requested ? setLocation(basePath) : choose(item.key));
        return <li key={item.key} className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(36,86,129,.08)] ring-1 ring-[#e6eef4]">
          <div className="flex items-center gap-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-full ${item.danger ? iconTones.red : iconTones[item.iconTone ?? "sky"]}`}>
              <Icon aria-hidden={true} className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              {item.danger
                ? <p className="text-sm font-semibold text-j-ink-soft">{item.label}</p>
                : <>
                    <p className="text-xs text-j-ink-muted">{item.label}</p>
                    <p className={`mt-0.5 truncate text-[15px] font-medium ${item.value ? "text-j-ink" : "text-j-err"}`}>{item.value || "Not set"}</p>
                  </>}
              {item.status && !item.danger ? <span className={`mt-1 inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-2xs font-bold ${statusChip[item.status.tone]}`}>{item.status.label}</span> : null}
            </div>
            {item.alwaysOpen ? null : <button
              type="button"
              aria-expanded={open}
              aria-label={`${open ? "Close" : "Change"} ${item.label}`}
              onClick={toggle}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f1f5f9] text-j-ink-soft transition-colors hover:bg-[#e6edf4] hover:text-j-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677e8]"
            >
              {item.danger
                ? <ChevronDown aria-hidden={true} className={`size-[18px] transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
                : <PencilLine aria-hidden={true} className="size-[17px]" />}
            </button>}
          </div>
          {open ? <div className="mt-4 border-t border-[#eef3f7] pt-4">{item.content}</div> : null}
        </li>;
      })}
    </ul>
  );
}

/** A setting's current value, as a labelled line. */
export function SettingValue({ label, value }: { label: string; value: string }) {
  return <p className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-baseline sm:gap-3">
    <span className="text-xs text-j-ink-muted sm:w-40 sm:shrink-0">{label}</span>
    <span className={`font-semibold ${value ? "text-j-ink" : "text-j-err"}`}>{value || "Not set"}</span>
  </p>;
}

const passwordInput = "rounded-xl border border-j-field-border px-3 py-2.5 text-sm font-normal outline-none ring-[#1677c8] focus:ring-2";

/** Changing one's own password: the current one, then the new one twice. */
export function ChangePasswordForm() {
  const empty = { currentPassword: "", newPassword: "", confirmNewPassword: "" };
  const [form, setForm] = useState(empty);
  const mutation = trpc.account.changePassword.useMutation({
    onSuccess: () => { setForm(empty); toast.success("Password changed. Use your new password next time you sign in."); },
    onError: error => toast.error(error.message),
  });
  const set = (patch: Partial<typeof empty>) => setForm(current => ({ ...current, ...patch }));
  const mismatch = form.confirmNewPassword.length > 0 && form.newPassword !== form.confirmNewPassword;

  return <form className="grid max-w-xl gap-4" onSubmit={event => { event.preventDefault(); mutation.mutate(form); }}>
    <label className="grid gap-1.5 text-sm font-bold text-j-ink-strong">Current password
      <input required type="password" autoComplete="current-password" value={form.currentPassword} onChange={event => set({ currentPassword: event.target.value })} className={passwordInput} />
    </label>
    <label className="grid gap-1.5 text-sm font-bold text-j-ink-strong">New password
      <input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={form.newPassword} onChange={event => set({ newPassword: event.target.value })} className={passwordInput} />
    </label>
    <label className="grid gap-1.5 text-sm font-bold text-j-ink-strong">Confirm new password
      <input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={form.confirmNewPassword} onChange={event => set({ confirmNewPassword: event.target.value })} className={`${passwordInput} ${mismatch ? "border-red-300" : ""}`} />
      {mismatch ? <span className="text-xs font-semibold text-red-700">New passwords do not match.</span> : null}
    </label>
    <Button type="submit" disabled={mutation.isPending || mismatch} className="w-fit rounded-xl bg-[#1677c8] font-bold hover:bg-[#0e4f85]">
      <KeyRound size={15} aria-hidden={true} /> {mutation.isPending ? "Changing…" : "Change password"}
    </Button>
  </form>;
}
