import SiteLimitEditor from "@/components/SiteLimitEditor";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import type { GuardianApplicantVisibility } from "@shared/admin-control";
import { communityLinkSlotId, communityPanels, DEFAULT_COMMUNITY_LINK, isCommunityLink, type CommunityPanel } from "@shared/community";
import { paymentAccountMethods, paymentAccountSlotId, tuitionPaymentMethodLabels, type PaymentAccountMethod } from "@shared/platform-charge";
import { MAX_SITE_CONTENT_TEXT_LENGTH } from "@shared/site-content";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const visibilityOptions: Array<{ value: GuardianApplicantVisibility; label: string }> = [
  { value: "all", label: "All applicants" },
  { value: "shortlisted", label: "Shortlisted only" },
];

const communityLabels: Record<CommunityPanel, string> = {
  tutor: "Tutor panel",
  guardian: "Guardian panel",
};

/**
 * Where each panel's "Join our Community" row goes.
 *
 * The two panels are set apart on purpose: the Tutors' group and the
 * Guardians' need not be the same one. An empty box means the shipped address,
 * which is what Reset restores.
 */
function CommunityLinks() {
  const utils = trpc.useUtils();
  const stored = trpc.siteContent.list.useQuery({ page: "admin-control" });
  const [drafts, setDrafts] = useState<Partial<Record<CommunityPanel, string>>>({});
  const save = trpc.siteContent.save.useMutation({
    onSuccess: () => { void utils.siteContent.list.invalidate({ page: "admin-control" }); toast.success("Saved."); },
    onError: error => { toast.error(error.message); },
  });

  const savedLink = (panel: CommunityPanel) =>
    stored.data?.find(row => row.slotId === communityLinkSlotId(panel))?.text?.trim() || DEFAULT_COMMUNITY_LINK;

  // The boxes start on what is stored, and pick up a save made elsewhere.
  useEffect(() => { if (stored.data) setDrafts({}); }, [stored.data]);

  return <section className="mt-3 rounded-xl border border-j-border bg-white p-3 shadow-sm">
    <h2 className="text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Join our Community</h2>
    <div className="mt-2 space-y-2">
      {communityPanels.map(panel => {
        const saved = savedLink(panel);
        const typed = drafts[panel] ?? saved;
        const valid = isCommunityLink(typed);
        const dirty = typed.trim() !== saved;
        const busy = save.isPending && save.variables?.slotId === communityLinkSlotId(panel);
        return <div key={panel} className="flex flex-wrap items-center gap-2">
          <label htmlFor={`community-${panel}`} className="w-28 shrink-0 text-sm font-bold text-j-ink">{communityLabels[panel]}</label>
          <input
            id={`community-${panel}`}
            value={typed}
            spellCheck={false}
            inputMode="url"
            aria-invalid={!valid}
            onChange={event => setDrafts(current => ({ ...current, [panel]: event.target.value }))}
            className={`h-10 min-w-0 flex-1 rounded-xl border bg-j-surface-sunken px-3 text-sm outline-none focus:ring-2 focus:ring-sky-100 ${valid ? "border-j-border focus:border-j-accent" : "border-[#d84a4a]"}`}
          />
          <button
            type="button"
            disabled={!dirty || !valid || busy}
            onClick={() => save.mutate({ slotId: communityLinkSlotId(panel), text: typed.trim() === DEFAULT_COMMUNITY_LINK ? null : typed.trim() })}
            className="h-10 rounded-xl bg-j-accent px-4 text-sm font-bold text-white disabled:opacity-40"
          >{busy ? "Saving…" : "Save"}</button>
          <button
            type="button"
            disabled={saved === DEFAULT_COMMUNITY_LINK || busy}
            onClick={() => save.mutate({ slotId: communityLinkSlotId(panel), text: null })}
            className="h-10 rounded-xl border border-j-border px-3 text-sm font-bold text-j-ink-soft disabled:opacity-40"
          >Reset</button>
        </div>;
      })}
    </div>
  </section>;
}

/**
 * Where a Tutor sends a platform charge, one line per method: the number or
 * account, and whose it is. A method left empty is not offered to Tutors.
 */
function PaymentAccounts() {
  const utils = trpc.useUtils();
  const stored = trpc.siteContent.list.useQuery({ page: "admin-control" });
  const [drafts, setDrafts] = useState<Partial<Record<PaymentAccountMethod, string>>>({});
  const save = trpc.siteContent.save.useMutation({
    onSuccess: () => { void utils.siteContent.list.invalidate({ page: "admin-control" }); toast.success("Saved."); },
    onError: error => { toast.error(error.message); },
  });

  const savedLine = (method: PaymentAccountMethod) =>
    stored.data?.find(row => row.slotId === paymentAccountSlotId(method))?.text?.trim() ?? "";

  useEffect(() => { if (stored.data) setDrafts({}); }, [stored.data]);

  return <section className="mt-3 rounded-xl border border-j-border bg-white p-3 shadow-sm">
    <h2 className="text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Where Tutors pay</h2>
    <div className="mt-2 space-y-2">
      {paymentAccountMethods.map(method => {
        const saved = savedLine(method);
        const typed = drafts[method] ?? saved;
        const dirty = typed.trim() !== saved;
        const busy = save.isPending && save.variables?.slotId === paymentAccountSlotId(method);
        const label = tuitionPaymentMethodLabels[method];
        return <div key={method} className="flex flex-wrap items-center gap-2">
          <label htmlFor={`account-${method}`} className="w-28 shrink-0 text-sm font-bold text-j-ink">{label}</label>
          <input
            id={`account-${method}`}
            value={typed}
            maxLength={MAX_SITE_CONTENT_TEXT_LENGTH}
            spellCheck={false}
            onChange={event => setDrafts(current => ({ ...current, [method]: event.target.value }))}
            className="h-10 min-w-0 flex-1 rounded-xl border border-j-border bg-j-surface-sunken px-3 text-sm outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100"
          />
          <button
            type="button"
            disabled={!dirty || busy}
            onClick={() => save.mutate({ slotId: paymentAccountSlotId(method), text: typed.trim() || null })}
            className="h-10 rounded-xl bg-j-accent px-4 text-sm font-bold text-white disabled:opacity-40"
          >{busy ? "Saving…" : "Save"}</button>
          <button
            type="button"
            disabled={!saved || busy}
            onClick={() => save.mutate({ slotId: paymentAccountSlotId(method), text: null })}
            className="h-10 rounded-xl border border-j-border px-3 text-sm font-bold text-j-ink-soft disabled:opacity-40"
          >Reset</button>
        </div>;
      })}
    </div>
  </section>;
}

/**
 * The Owner's switches. One so far: which applicants a Guardian meets.
 *
 * A choice saves as soon as it is picked, except turning to "Shortlisted only"
 * while Guardians have appointment requests for Tutors nobody shortlisted -
 * those are cancelled by the move, so the count is shown and confirmed first.
 */
export default function AdminControlEditor() {
  const utils = trpc.useUtils();
  const control = trpc.adminControl.get.useQuery();
  const [confirming, setConfirming] = useState(false);
  const setVisibility = trpc.adminControl.setGuardianApplicantVisibility.useMutation({
    onSuccess: result => {
      setConfirming(false);
      void utils.adminControl.get.invalidate();
      toast.success(result.cancelledAppointmentRequests
        ? `Saved. ${result.cancelledAppointmentRequests} appointment ${result.cancelledAppointmentRequests === 1 ? "request was" : "requests were"} cancelled.`
        : "Saved.");
    },
    onError: error => { toast.error(error.message); },
  });

  if (control.isLoading) {
    return <div className="flex min-h-32 items-center justify-center rounded-xl border border-j-border bg-white text-sm text-j-ink-soft"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading Admin Control…</div>;
  }
  if (control.isError || !control.data) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Admin Control could not be loaded.</div>;
  }

  const current = control.data.guardianApplicantVisibility;
  const outsideShortlist = control.data.appointmentRequestsOutsideShortlist;
  const choose = (value: GuardianApplicantVisibility) => {
    if (value === current || setVisibility.isPending) return;
    if (value === "shortlisted" && outsideShortlist > 0) {
      setConfirming(true);
      return;
    }
    setVisibility.mutate({ visibility: value });
  };

  return <>
    <section className="rounded-xl border border-j-border bg-white p-3 shadow-sm">
      <h2 id="guardian-applicants-heading" className="text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Guardian applicants</h2>
      <div role="radiogroup" aria-labelledby="guardian-applicants-heading" className="mt-2 inline-flex flex-wrap gap-1 rounded-xl border border-j-border bg-j-surface-sunken p-1">
        {visibilityOptions.map(option => {
          const selected = option.value === current;
          return <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={setVisibility.isPending}
            onClick={() => choose(option.value)}
            className={`h-9 rounded-lg px-3.5 text-sm font-bold disabled:opacity-60 ${selected ? "bg-white text-j-accent shadow-sm" : "text-j-ink-soft hover:text-j-ink-strong"}`}
          >{option.label}</button>;
        })}
      </div>
    </section>

    <CommunityLinks />

    <PaymentAccounts />

    <section className="mt-3">
      <h2 className="mb-2 text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Platform charge</h2>
      <SiteLimitEditor groups={["Platform charge"]} />
    </section>

    {confirming ? <Modal size="sm" onClose={() => setConfirming(false)} busy={setVisibility.isPending}>
      <ModalHeader title="Show Guardians shortlisted Tutors only?" />
      <ModalBody>
        <p className="text-sm leading-6 text-j-ink-soft">
          {outsideShortlist === 1
            ? "1 waiting appointment request is for a Tutor who is not shortlisted. It will be cancelled."
            : `${outsideShortlist} waiting appointment requests are for Tutors who are not shortlisted. They will be cancelled.`}
        </p>
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={() => setConfirming(false)} className="h-10 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Back</button>
        <button
          type="button"
          disabled={setVisibility.isPending}
          onClick={() => setVisibility.mutate({ visibility: "shortlisted" })}
          className="h-10 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
        >{setVisibility.isPending ? "Saving…" : "Cancel requests and save"}</button>
      </ModalFooter>
    </Modal> : null}
  </>;
}
