import { BadgeCheck, CircleAlert, History, ShieldCheck } from "lucide-react";
import React, { type FormEvent, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { LoadingCradle } from "@/components/BrandMark";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { fieldLabel, filledField, primaryButton } from "@/components/journeyField";
import { useSiteContact } from "@/lib/siteContent";
import { trpc } from "@/lib/trpc";
import { confirmationLetterVerifyPath, formatLetterVerificationCode } from "@shared/confirmation-letter";

/**
 * The public page a Confirmation Letter's QR code opens: is this letter real,
 * and is it the current one? Anyone can type a Letter ID and the printed code
 * here too. The details on record appear only with the right code, so they
 * can be held against the paper.
 */
export default function VerifyLetter() {
  const [, params] = useRoute<{ letterNumber: string; code: string }>("/verify/:letterNumber/:code");
  const letterNumber = params ? decodeURIComponent(params.letterNumber) : "";
  const code = params?.code ?? "";
  return <div className="site-page">
    <SiteHeader />
    <main className="info-page">
      <section className="shell info-hero">
        <div className="info-icon"><ShieldCheck /></div>
        <p className="eyebrow">Confirmation Letter</p>
        <h1>Check a letter</h1>
        {params ? <VerifyResult letterNumber={letterNumber} code={code} /> : null}
        <VerifyForm key={`${letterNumber}/${code}`} letterNumber={letterNumber} code={code} />
      </section>
    </main>
    <SiteFooter />
  </div>;
}

function VerifyForm({ letterNumber, code }: { letterNumber: string; code: string }) {
  const [, navigate] = useLocation();
  const [letterId, setLetterId] = useState(letterNumber);
  const [letterCode, setLetterCode] = useState(code ? formatLetterVerificationCode(code) : "");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (letterId.trim() && letterCode.trim()) navigate(confirmationLetterVerifyPath(letterId, letterCode));
  };
  return <form onSubmit={submit} className="mt-8 grid gap-4 text-left sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:items-end">
    <label className={fieldLabel} htmlFor="verify-letter-id">Letter ID
      <input id="verify-letter-id" required value={letterId} onChange={event => setLetterId(event.target.value)} placeholder="CTB-2026-000019-V1" autoComplete="off" spellCheck={false} className={`${filledField} mt-2 uppercase`} />
    </label>
    <label className={fieldLabel} htmlFor="verify-letter-code">Code
      <input id="verify-letter-code" required value={letterCode} onChange={event => setLetterCode(event.target.value)} placeholder="ABCDE-FGHJK" autoComplete="off" spellCheck={false} className={`${filledField} mt-2 uppercase`} />
    </label>
    <button type="submit" className={`${primaryButton} h-12 justify-center px-6`}>Check letter</button>
  </form>;
}

function VerifyResult({ letterNumber, code }: { letterNumber: string; code: string }) {
  const contact = useSiteContact();
  const verifyQuery = trpc.confirmationLetters.verify.useQuery({ letterNumber, code }, { retry: false });
  const result = verifyQuery.data;

  if (verifyQuery.isLoading) {
    return <div role="status" className="mt-8 flex items-center justify-center text-sm font-semibold text-j-ink-soft"><LoadingCradle className="mr-2" /> Checking the letter…</div>;
  }
  if (verifyQuery.error || !result) {
    return <p role="alert" className="mt-8 rounded-2xl border border-j-border bg-white p-5 text-left text-sm font-semibold text-j-ink-soft">
      Letters cannot be checked right now. Try again in a minute.
    </p>;
  }
  if (result.status === "unknown") {
    return <div role="alert" className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-left sm:p-6">
      <p className="flex items-center gap-2 text-base font-bold text-rose-800"><CircleAlert className="size-5" aria-hidden="true" /> We could not confirm this letter</p>
      <p className="mt-2 text-sm leading-6 text-rose-900">Check the Letter ID and the code. If they match the letter, call us on {contact.display}.</p>
    </div>;
  }
  if (result.status === "replaced") {
    return <div role="status" className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left sm:p-6">
      <p className="flex items-center gap-2 text-base font-bold text-amber-900"><History className="size-5" aria-hidden="true" /> This letter has been replaced</p>
      <p className="mt-2 text-sm leading-6 text-amber-950">
        {result.letterNumber}, issued {result.issued}, is no longer current.
        {result.replacedBy ? <> The current letter is <strong>{result.replacedBy}</strong>.</> : null}
      </p>
    </div>;
  }
  const rows: Array<readonly [string, string]> = [
    ["Letter ID", result.letterNumber],
    ["Issued", result.issued],
    ["Version", result.version],
    ...result.tutorRows.map(([label, value]) => [label === "Name" ? "Tutor" : label, value] as const),
    ...result.tuitionRows,
    ["Agreed monthly fee", result.fee],
  ];
  return <div role="status" className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-left sm:p-6">
    <p className="flex items-center gap-2 text-base font-bold text-emerald-800"><BadgeCheck className="size-5" aria-hidden="true" /> Genuine letter</p>
    <p className="mt-2 text-sm leading-6 text-emerald-950">Connect Tutors issued this letter on {result.issued}, and it is the current version.</p>
    <dl className="mt-5 divide-y divide-emerald-100 rounded-xl border border-emerald-100 bg-white">
      {rows.map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] gap-3 px-4 py-2.5 text-sm">
        <dt className="text-j-ink-soft">{label}</dt>
        <dd className="m-0 break-words font-semibold text-j-ink">{value}</dd>
      </div>)}
    </dl>
  </div>;
}
