import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import type { GuardianApplicantVisibility } from "@shared/admin-control";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const visibilityOptions: Array<{ value: GuardianApplicantVisibility; label: string }> = [
  { value: "all", label: "All applicants" },
  { value: "shortlisted", label: "Shortlisted only" },
];

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
