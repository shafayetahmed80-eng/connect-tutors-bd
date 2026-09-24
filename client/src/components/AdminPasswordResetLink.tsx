// On a Tutor's or Guardian's Admin detail page: issue a one-time password reset
// link for someone who asked for help signing in, then copy it or send it
// straight to their WhatsApp. A new link cancels any earlier one.

import { ClipboardCopy, KeyRound, Loader2, MessageCircle } from "lucide-react";
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { normalizeSiteContactNumber, whatsappHref } from "@shared/site-content";

function formatExpiry(value: Date | string) {
  return new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function AdminPasswordResetLink({ userId, phone }: { userId: number; phone?: string | null }) {
  const create = trpc.admin.createPasswordResetLink.useMutation();
  const [copied, setCopied] = useState(false);
  const issued = create.data;
  const whatsappNumber = phone ? normalizeSiteContactNumber(phone) : "";
  const message = issued ? `Connect Tutors: use this link to set a new password. It works once, until ${formatExpiry(issued.expiresAt)}.\n${issued.link}` : "";

  return <section aria-labelledby={`password-reset-${userId}`} className="rounded-xl border border-j-border bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 id={`password-reset-${userId}`} className="font-bold tracking-[-0.02em] text-j-ink">Password reset</h3>
      <button type="button" disabled={create.isPending} onClick={() => { setCopied(false); create.mutate({ userId }); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-j-border bg-white px-3 text-sm font-bold text-j-ink-strong transition hover:border-j-accent hover:text-j-accent disabled:opacity-60">
        {create.isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <KeyRound size={15} aria-hidden="true" />}
        {issued ? "Create a new link" : "Create reset link"}
      </button>
    </div>
    {create.isError ? <p role="alert" className="mt-3 rounded-xl border border-j-err-border bg-j-err-wash p-3 text-sm font-semibold text-j-err">{create.error.message || "The reset link could not be created."}</p> : null}
    {issued ? <div className="mt-4 rounded-xl border border-j-ok-border bg-j-ok-wash p-4">
      <p className="break-all text-sm font-medium text-j-ink">{issued.link}</p>
      <p className="mt-1 text-xs text-j-ink-muted">Expires {formatExpiry(issued.expiresAt)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => { void navigator.clipboard?.writeText(issued.link).then(() => setCopied(true)).catch(() => undefined); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-j-border bg-white px-3 text-sm font-bold text-j-ink-strong">
          <ClipboardCopy size={15} aria-hidden="true" />{copied ? "Copied" : "Copy link"}
        </button>
        {whatsappNumber ? <a href={whatsappHref(whatsappNumber, message)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-j-border bg-white px-3 text-sm font-bold text-j-ink-strong">
          <MessageCircle size={15} aria-hidden="true" />Send on WhatsApp
        </a> : null}
      </div>
    </div> : null}
  </section>;
}
