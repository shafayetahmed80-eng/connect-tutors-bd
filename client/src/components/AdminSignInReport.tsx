// The Owner's sign-in report, at the top of Admin security: public sign-in and
// registration counts per Bangladesh day, and who the rate limiters are
// holding back right now, with a way to let them in again.

import { LockOpen } from "lucide-react";
import { LoadingCradle } from "@/components/BrandMark";
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";

type Counts = { newGuardians: number; newTutors: number; signIns: number; failed: number; wrongCard: number; blocked: number; codesSent: number; codesVerified: number; wrongCodes: number };

const columns: Array<{ key: keyof Counts; label: string; tone: string }> = [
  { key: "newGuardians", label: "New Guardians", tone: "text-j-ink" },
  { key: "newTutors", label: "New Tutors", tone: "text-j-ink" },
  { key: "signIns", label: "Sign-ins", tone: "text-j-ok" },
  { key: "failed", label: "Failed", tone: "text-j-err" },
  { key: "wrongCard", label: "Wrong card", tone: "text-j-warn" },
  { key: "blocked", label: "Blocked", tone: "text-j-err" },
  { key: "codesSent", label: "Codes sent", tone: "text-j-ink" },
  { key: "codesVerified", label: "Codes verified", tone: "text-j-ok" },
  { key: "wrongCodes", label: "Wrong codes", tone: "text-j-warn" },
];

/** BulkSMSBD balance beside the heading: the one number that stops every verification SMS when it runs out. */
function SmsBalance() {
  const balance = trpc.admin.getSmsBalance.useQuery(undefined, { refetchInterval: 5 * 60_000 });
  const data = balance.data;
  const text = balance.isLoading ? "…"
    : balance.isError || !data ? "unavailable"
    : !data.configured ? "not set up"
    : data.balance === null ? data.problem
    : `${data.balance.toLocaleString("en-US", { maximumFractionDigits: 2 })} Taka`;
  const tone = data?.configured && data.balance !== null ? (data.balance < 100 ? "text-j-err" : "text-j-ink-strong") : "text-j-ink-muted";
  return <p className="text-sm text-j-ink-soft">SMS balance: <span className={`font-bold tabular-nums ${tone}`}>{text}</span></p>;
}

const blockKindLabel = { account: "Account", connection: "Connection", registration: "Registration" } as const;

/** `2026-09-24` → `Thu, 24 Sep`, read as a calendar date rather than a moment. */
function formatDay(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function formatWait(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? "Clears in 1 min" : `Clears in ${minutes} min`;
}

export function AdminSignInReport() {
  const [windowDays, setWindowDays] = useState<7 | 30>(7);
  const utils = trpc.useUtils();
  const report = trpc.admin.getSignInReport.useQuery({ windowDays });
  const blocks = trpc.admin.listSignInBlocks.useQuery(undefined, { refetchInterval: 30_000 });
  const clearBlock = trpc.admin.clearSignInBlock.useMutation({
    onSuccess: () => void utils.admin.listSignInBlocks.invalidate(),
  });

  return <section aria-labelledby="sign-in-report-title" className="rounded-xl border border-j-border bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 id="sign-in-report-title" className="text-lg font-bold text-j-ink">Sign-in report</h2>
        <SmsBalance />
      </div>
      <div className="inline-flex w-max rounded-full bg-j-surface-muted p-1" role="group" aria-label="Report period">
        {([7, 30] as const).map(days => <button key={days} type="button" aria-pressed={windowDays === days} onClick={() => setWindowDays(days)} className={`min-h-9 rounded-full px-4 text-sm font-bold transition ${windowDays === days ? "bg-white text-j-accent shadow-sm" : "text-j-ink-muted"}`}>{days} days</button>)}
      </div>
    </div>

    {report.isLoading ? <p className="mt-5 flex items-center text-sm text-j-ink-soft"><LoadingCradle className="mr-2" /> Loading the sign-in report…</p>
      : report.isError || !report.data ? <p role="alert" className="mt-5 rounded-xl border border-j-err-border bg-j-err-wash p-3 text-sm font-semibold text-j-err">The sign-in report could not be loaded.</p>
      : <>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-9">
          {columns.map(column => <div key={column.key} className="rounded-xl border border-j-border bg-j-surface-sunken p-3">
            <dt className="text-xs font-semibold text-j-ink-soft">{column.label}</dt>
            <dd className={`mt-1 text-2xl font-extrabold tabular-nums ${column.tone}`}>{report.data.totals[column.key]}</dd>
          </div>)}
        </dl>

        <div className="mt-5 hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <caption className="sr-only">Sign-in and registration counts per day</caption>
            <thead><tr className="border-b border-j-border text-left text-xs font-bold uppercase tracking-wide text-j-ink-muted"><th scope="col" className="py-2 pr-3">Day</th>{columns.map(column => <th key={column.key} scope="col" className="px-3 py-2 text-right">{column.label}</th>)}</tr></thead>
            <tbody>{report.data.days.map(day => <tr key={day.date} className="border-b border-j-border last:border-0">
              <th scope="row" className="py-2 pr-3 text-left font-semibold text-j-ink-strong">{formatDay(day.date)}</th>
              {columns.map(column => <td key={column.key} className={`px-3 py-2 text-right tabular-nums ${day[column.key] ? `font-bold ${column.tone}` : "text-j-ink-faint"}`}>{day[column.key]}</td>)}
            </tr>)}</tbody>
          </table>
        </div>

        <ul className="mt-5 space-y-3 md:hidden" aria-label="Sign-in and registration counts per day">
          {report.data.days.map(day => <li key={day.date} className="rounded-xl border border-j-border p-3">
            <p className="text-sm font-bold text-j-ink-strong">{formatDay(day.date)}</p>
            <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1.5 text-xs">
              {columns.map(column => <div key={column.key}><dt className="text-j-ink-muted">{column.label}</dt><dd className={`font-bold tabular-nums ${day[column.key] ? column.tone : "text-j-ink-faint"}`}>{day[column.key]}</dd></div>)}
            </dl>
          </li>)}
        </ul>
      </>}

    <h3 className="mt-7 text-base font-bold text-j-ink">Blocked right now</h3>
    {blocks.isLoading ? <p className="mt-3 flex items-center text-sm text-j-ink-soft"><LoadingCradle className="mr-2" /> Loading…</p>
      : blocks.isError ? <p role="alert" className="mt-3 rounded-xl border border-j-err-border bg-j-err-wash p-3 text-sm font-semibold text-j-err">The blocked list could not be loaded.</p>
      : !blocks.data?.length ? <p className="mt-3 rounded-xl bg-j-surface-sunken p-3 text-sm text-j-ink-soft">No one is blocked right now.</p>
      : <ul className="mt-3 space-y-2">
        {blocks.data.map(block => <li key={block.id} className="flex flex-col gap-3 rounded-xl border border-j-border p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-j-err-wash px-2 py-0.5 text-xs font-bold text-j-err">{blockKindLabel[block.kind]}</span>
              {block.identifierMasked ? <span className="font-semibold text-j-ink-strong">{block.identifierMasked}</span> : null}
              {block.role ? <span className="text-j-ink-muted">{block.role === "tutor" ? "Tutor" : "Guardian"}</span> : null}
            </p>
            <p className="mt-1 text-xs text-j-ink-muted">IP {block.ip} · {formatWait(block.retryAfterSeconds)}</p>
          </div>
          <button type="button" disabled={clearBlock.isPending} onClick={() => clearBlock.mutate({ id: block.id })} className="inline-flex min-h-10 w-fit items-center gap-2 rounded-lg border border-j-border bg-white px-3 text-sm font-bold text-j-ink-strong transition hover:border-j-accent hover:text-j-accent disabled:opacity-60"><LockOpen size={15} aria-hidden="true" />Unlock</button>
        </li>)}
      </ul>}
  </section>;
}
