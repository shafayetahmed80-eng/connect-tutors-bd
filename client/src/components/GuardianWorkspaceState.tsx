import React from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type GuardianWorkspaceStateKind = "loading" | "empty" | "error" | "planned";

const content: Record<GuardianWorkspaceStateKind, { title: string; message?: string }> = {
  loading: { title: "Loading your private workspace", message: "Your Guardian information is being retrieved securely." },
  empty: { title: "Nothing here yet" },
  error: { title: "We could not load this section", message: "Your private workspace is temporarily unavailable. Please try again." },
  planned: { title: "Coming soon" },
};

export function GuardianWorkspaceState({ kind, title, message, onRetry }: { kind: GuardianWorkspaceStateKind; title?: string; message?: string; onRetry?: () => void }) {
  const copy = content[kind];
  const Icon = kind === "loading" ? Loader2 : kind === "error" ? AlertCircle : kind === "planned" ? CheckCircle2 : CheckCircle2;
  return (
    <section role={kind === "loading" ? "status" : undefined} aria-busy={kind === "loading" || undefined} className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <Icon aria-hidden="true" className={`mx-auto mb-4 size-8 text-[#1677c8] ${kind === "loading" ? "animate-spin" : ""}`} />
      <h2 className="text-xl font-black text-slate-950">{title || copy.title}</h2>
      {message || copy.message ? <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">{message || copy.message}</p> : null}
      {kind === "error" && onRetry ? <Button type="button" variant="outline" onClick={onRetry} className="mt-5 border-[#9dcde7] text-[#0e4f85]">Try again</Button> : null}
    </section>
  );
}

export function GuardianWorkspaceSkeleton({ label = "Loading Guardian workspace" }: { label?: string }) {
  return <section role="status" aria-busy="true" aria-label={label} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"><div className="h-6 w-48 animate-pulse rounded-lg bg-slate-200" /><div className="h-4 w-full animate-pulse rounded-lg bg-slate-100" /><div className="h-4 w-2/3 animate-pulse rounded-lg bg-slate-100" /></section>;
}
