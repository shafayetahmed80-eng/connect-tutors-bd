import { trpc } from "@/lib/trpc";
import { MAX_POLICY_BODY_LENGTH, policyPages, type PolicyPageKey } from "@shared/policy-pages";
import { policyPlainText } from "@shared/policy-markdown";
import { Eye, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PolicyDocument from "./PolicyDocument";

/**
 * Owner-facing editor for the legal pages.
 *
 * A policy is a long document, so this is one big text box rather than the
 * one-line-per-slot grid the other content screens use. The preview sits beside
 * it because the Markdown subset is small enough to learn by watching: type
 * `## ` and a heading appears.
 *
 * The preview renders through the very same component the public page uses, so
 * what is shown here is what a visitor gets - including a link the parser
 * refused, which appears as plain words rather than silently vanishing.
 */
export default function PolicyDocumentEditor() {
  const [pageKey, setPageKey] = useState<PolicyPageKey>("terms-conditions");
  const [draft, setDraft] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const utils = trpc.useUtils();
  const documents = trpc.policyDocuments.list.useQuery();
  const save = trpc.policyDocuments.save.useMutation();
  const reset = trpc.policyDocuments.reset.useMutation();

  const meta = policyPages.find(page => page.key === pageKey)!;
  const stored = documents.data?.find(row => row.pageKey === pageKey)?.body;
  const shipped = !stored;
  const current = stored ?? meta.defaultBody;

  // Keyed on the stored text, so a refetch that changes nothing cannot wipe
  // what is being typed.
  useEffect(() => {
    setDraft(current);
    setConfirmReset(false);
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on contents
  }, [current, pageKey]);

  const dirty = draft !== current;
  const words = useMemo(() => policyPlainText(draft).split(/\s+/).filter(Boolean).length, [draft]);

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await utils.policyDocuments.list.invalidate();
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  return <div className="space-y-3">
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Legal pages">
      {policyPages.map(page => <button
        key={page.key}
        type="button"
        role="tab"
        aria-selected={page.key === pageKey}
        onClick={() => { setPageKey(page.key); setError(null); }}
        className={`h-8 rounded-md px-3 text-[13px] font-bold ${page.key === pageKey ? "bg-[#116fc4] text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
      >{page.label}</button>)}
    </div>

    <p className="text-[12px] leading-5 text-slate-600">
      This is the document a Guardian and a Tutor tick a box to accept, shown at <span className="font-bold text-slate-800">{meta.path}</span>. Write with <code className="rounded bg-slate-100 px-1">##</code> for a heading, <code className="rounded bg-slate-100 px-1">-</code> for a bullet, <code className="rounded bg-slate-100 px-1">**bold**</code>, and <code className="rounded bg-slate-100 px-1">[text](link)</code>. Anything else stays as written.
    </p>

    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <span className="text-xs font-bold text-slate-500">
        {shipped ? "As shipped" : "Edited by you"} · {words} word{words === 1 ? "" : "s"} · {draft.length}/{MAX_POLICY_BODY_LENGTH}
      </span>
      <span className="flex-1" />
      {!shipped ? <button
        type="button"
        disabled={busy}
        onClick={() => { if (!confirmReset) { setConfirmReset(true); return; } void run(() => reset.mutateAsync({ pageKey }), "The document could not be reset."); }}
        className={`flex h-8 items-center gap-1 rounded-md border px-3 text-[13px] font-bold disabled:opacity-40 ${confirmReset ? "border-red-300 bg-red-50 text-red-700" : "border-slate-300 bg-white text-slate-700"}`}
        title="Go back to the document the site ships with"
      ><RotateCcw size={13} /> {confirmReset ? "Confirm reset" : "Reset"}</button> : null}
      <button
        type="button"
        disabled={busy || !dirty || draft.length > MAX_POLICY_BODY_LENGTH}
        onClick={() => void run(() => save.mutateAsync({ pageKey, body: draft }), "The document could not be saved.")}
        className="h-8 rounded-md bg-[#116fc4] px-3 text-[13px] font-bold text-white disabled:opacity-40"
      >{busy ? "Saving…" : dirty ? "Save document" : saved ? "Saved" : "No changes"}</button>
    </div>

    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

    {documents.isLoading
      ? <div className="flex min-h-32 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-600"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading the documents…</div>
      : <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <label htmlFor="policy-body" className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{meta.label}</label>
          <textarea
            id="policy-body"
            value={draft}
            maxLength={MAX_POLICY_BODY_LENGTH}
            onChange={event => setDraft(event.target.value)}
            spellCheck={false}
            className="mt-1.5 min-h-[28rem] w-full resize-y rounded-md border border-slate-200 bg-white p-3 font-mono text-[12px] leading-6 text-slate-800 outline-none focus:border-[#116fc4] focus:ring-2 focus:ring-sky-100"
          />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400"><Eye size={12} /> Preview</p>
          <div className="mt-1.5 max-h-[28rem] overflow-y-auto rounded-md border border-slate-100 bg-[#fbfdff] p-4">
            {draft.trim()
              ? <PolicyDocument body={draft} />
              : <p className="text-sm text-slate-500">Nothing to show — the page would be empty.</p>}
          </div>
        </section>
      </div>}
  </div>;
}
