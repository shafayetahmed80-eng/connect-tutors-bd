import ChargeSummaryBlock, { onDate } from "@/components/ChargeSummaryBlock";
import PaymentForm from "@/components/PaymentForm";
import PaymentStatusPill from "@/components/PaymentStatusPill";
import RecordTable, { type RecordColumn } from "@/components/RecordTable";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/modal";
import { statusTone } from "@/components/TuitionPaymentsModal";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { formatSubjects } from "@shared/job-card";
import { jobIdForRequest } from "@shared/job-id";
import {
  chargeKindLabels,
  paymentAccountMethods,
  paymentAccountSlotId,
  tutorReportableMethods,
  tuitionPaymentMethodLabels,
  tuitionPaymentStatusLabels,
} from "@shared/platform-charge";
import { formatSalaryAmount } from "@shared/salary-amount";
import { LoadingCradle } from "@/components/BrandMark";
import { useState } from "react";
import { toast } from "sonner";

type TutorTuition = inferRouterOutputs<AppRouter>["tutorPayments"]["mine"]["items"][number];

/**
 * What a Tutor owes on each tuition they hold, and a way to tell us they have
 * paid. Where to send the money is the Owner's to set, beside the rates.
 */
export default function TutorPaymentsPanel() {
  const overview = trpc.tutorPayments.mine.useQuery();
  const accounts = trpc.siteContent.list.useQuery({ page: "admin-control" });
  const [reportingId, setReportingId] = useState<number | null>(null);

  const items = overview.data?.items ?? [];
  const credit = overview.data?.credit ?? 0;
  type Item = TutorTuition;

  const accountLines = paymentAccountMethods
    .map(method => ({ method, text: accounts.data?.find(row => row.slotId === paymentAccountSlotId(method))?.text?.trim() ?? "" }))
    .filter(line => line.text);

  /** What is asked next: what is left of the first instalment, else the balance, and by when. */
  const nextPayment = (item: Item) => {
    const charge = item.charge;
    if (!charge || charge.balance === 0) return null;
    // A cancelled tuition was settled at a figure of its own, due whenever it is settled.
    if (item.cancelled) return { amount: charge.balance, by: null };
    const inFirstWindow = Date.now() <= new Date(charge.windowEndsAt).getTime();
    if (inFirstWindow && charge.paid < charge.first) return { amount: charge.first - charge.paid, by: charge.windowEndsAt };
    return { amount: charge.balance, by: charge.secondDueAt };
  };

  const columns: RecordColumn<Item>[] = [
    { key: "jobId", label: "Job ID", place: "head", cell: item => <span className="font-mono text-2xs text-j-ink-muted">{jobIdForRequest(item.id)}</span> },
    {
      key: "status", label: "Payment Status", place: "head",
      cell: item => <span className="inline-flex flex-wrap items-center gap-1.5">
        {item.cancelled ? <span className="rounded-full border border-j-border bg-j-surface-sunken px-2.5 py-1 text-2xs font-bold text-j-ink-soft">Cancelled</span> : null}
        {item.charge ? <PaymentStatusPill status={item.charge.status} /> : <span className="italic text-j-ink-faint">No charge</span>}
      </span>,
    },
    { key: "class", label: "Class", cell: item => <span className="font-bold text-j-ink">{item.classCourse}</span> },
    { key: "subjects", label: "Subjects", wide: true, cellClassName: "max-w-[16rem]", cell: item => <span className="text-j-ink-strong">{formatSubjects(item.subjects)}</span> },
    { key: "kind", label: "Charged as", cellClassName: "whitespace-nowrap", cell: item => <span className="text-j-ink-strong">{chargeKindLabels[item.kind]}</span> },
    { key: "salary", label: "Salary", cellClassName: "whitespace-nowrap", cell: item => <span className="tabular-nums text-j-ink-strong">{item.salary ? formatSalaryAmount(item.salary) : "Not set"}</span> },
    { key: "charge", label: "Charge", cellClassName: "whitespace-nowrap", cell: item => <span className="tabular-nums text-j-ink-strong">{item.charge ? formatSalaryAmount(item.charge.owed) : "—"}</span> },
    { key: "paid", label: "Paid", cellClassName: "whitespace-nowrap", cell: item => <span className="tabular-nums text-j-ink-strong">{item.charge ? formatSalaryAmount(item.charge.paid) : "—"}</span> },
    {
      key: "balance", label: "Balance", cellClassName: "whitespace-nowrap",
      cell: item => item.charge
        ? <span className={`tabular-nums font-bold ${item.charge.balance > 0 ? "text-red-800" : "text-emerald-800"}`}>{formatSalaryAmount(item.charge.balance)}</span>
        : "—",
    },
    {
      key: "next", label: "Next payment", wide: true, cellClassName: "whitespace-nowrap",
      cell: item => {
        const next = nextPayment(item);
        return <span className="text-j-ink-strong">
          {next ? (next.by ? `${formatSalaryAmount(next.amount)} by ${onDate(next.by)}` : `${formatSalaryAmount(next.amount)} due`) : "—"}
          {item.refund ? <span className="ml-2 text-2xs font-bold text-emerald-800">Refund {formatSalaryAmount(item.refund.amount)} · {item.refund.disposition === "credited" ? "credited" : "being returned"}</span> : null}
          {item.waiting > 0 ? <span className="ml-2 text-2xs font-bold text-amber-800">{formatSalaryAmount(item.waiting)} waiting</span> : null}
        </span>;
      },
    },
    {
      key: "open", label: "Payments", place: "action", headingHidden: true, cellClassName: "text-right",
      cell: item => <button
        type="button"
        onClick={() => setReportingId(item.id)}
        className="h-9 rounded-xl border border-j-border px-3.5 text-sm font-bold text-j-accent hover:bg-sky-50"
      >Payments</button>,
    },
  ];

  return <section className="space-y-4">
    {accountLines.length > 0 ? <section aria-label="Where to pay" className="rounded-xl border border-j-border bg-white p-4 shadow-sm">
      <h2 className="text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Send payments to</h2>
      <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {accountLines.map(line => <div key={line.method}>
          <dt className="text-2xs font-bold uppercase tracking-wide text-j-ink-muted">{tuitionPaymentMethodLabels[line.method]}</dt>
          <dd className="mt-0.5 text-sm font-semibold text-j-ink">{line.text}</dd>
        </div>)}
      </dl>
    </section> : null}

    {credit > 0 ? <section aria-label="Credit" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <h2 className="text-2xs font-bold uppercase tracking-wide text-emerald-800">Credit available</h2>
      <p className="mt-1 text-lg font-bold tabular-nums text-emerald-900">{formatSalaryAmount(credit)}</p>
    </section> : null}

    {overview.isLoading ? <p className="rounded-xl border border-j-border bg-white px-4 py-8 text-center text-sm font-semibold text-j-ink-muted"><LoadingCradle className="mr-2" />Loading your payments…</p> : null}
    {overview.isError ? <p role="alert" className="rounded-xl border border-j-err-border bg-j-err-wash px-4 py-8 text-center text-sm font-semibold text-j-err">Your payments could not be loaded just now. Please try again.</p> : null}

    {!overview.isLoading && !overview.isError ? <RecordTable
      caption="Your confirmed tuitions and what is owed on each"
      columns={columns}
      rows={items}
      rowKey={item => item.id}
      empty="No confirmed tuition yet."
      tableClassName="min-w-[72rem]"
    /> : null}

    {reportingId !== null ? <TutorPaymentModal item={items.find(item => item.id === reportingId) ?? null} requestId={reportingId} onClose={() => setReportingId(null)} /> : null}
  </section>;
}

function TutorPaymentModal({ item, requestId, onClose }: { item: TutorTuition | null; requestId: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [clearSignal, setClearSignal] = useState(0);
  const report = trpc.tutorPayments.report.useMutation({
    onSuccess: () => {
      void utils.tutorPayments.mine.invalidate();
      setClearSignal(signal => signal + 1);
      toast.success("Payment reported. An Admin will verify it.");
    },
    onError: error => toast.error(error.message),
  });

  const charge = item?.charge ?? null;
  return <Modal size="lg" onClose={onClose} busy={report.isPending}>
    <ModalHeader title={`Payments · Job ID ${jobIdForRequest(requestId)}`} />
    <ModalBody>
      <div className="space-y-5">
        {charge ? <ChargeSummaryBlock charge={charge} settled={Boolean(item?.cancelled)} /> : null}

        <section aria-label="Your payments">
          <h3 className="text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Your payments</h3>
          {!item || item.payments.length === 0
            ? <p className="mt-2 text-sm text-j-ink-muted">No payments yet.</p>
            : <ul className="mt-2 divide-y divide-[#eef4f9] rounded-xl border border-j-border">
              {item.payments.map(payment => <li key={payment.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2.5 text-sm">
                <span className="w-24 shrink-0 tabular-nums text-j-ink-strong">{onDate(payment.paidAt)}</span>
                <span className="w-24 shrink-0 font-bold tabular-nums text-j-ink">{formatSalaryAmount(payment.amount)}</span>
                <span className="min-w-0 flex-1 text-j-ink-soft">{tuitionPaymentMethodLabels[payment.method]}{payment.reference ? ` · ${payment.reference}` : ""}</span>
                <span className={`rounded-full border px-2.5 py-1 text-2xs font-bold ${statusTone[payment.status]}`}>{tuitionPaymentStatusLabels[payment.status]}</span>
              </li>)}
            </ul>}
        </section>

        {charge && charge.balance > 0 ? <PaymentForm
          label="Report a payment"
          methods={tutorReportableMethods}
          submitLabel="Report payment"
          pendingLabel="Reporting…"
          pending={report.isPending}
          clearSignal={clearSignal}
          onSubmit={values => report.mutate({ requestId, ...values })}
        /> : null}
      </div>
    </ModalBody>
  </Modal>;
}
