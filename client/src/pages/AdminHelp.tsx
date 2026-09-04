import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ArrowRight, KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { Link } from "wouter";

export const adminHelpQuickLinks = [
  { label: "Go to Admin Login", href: "/admin/login" },
] as const;

export const adminHelpSafetyPoints = [
  "Use an Owner-issued invitation before expecting an account to receive Admin access.",
  "Set up an Authenticator app by scanning the QR code shown during your first Admin access.",
  "Store each recovery code privately and use it only when your Authenticator is unavailable.",
  "If both your Authenticator and recovery codes are unavailable, contact the Project Owner for a 2FA reset.",
] as const;

const setupSteps = [
  {
    number: "01",
    title: "Accept your invitation",
    description: "The Project Owner sends an invitation link for a specific account. Admin access is granted only after that invitation is accepted.",
  },
  {
    number: "02",
    title: "Sign in with your established account",
    description: "Use the email address and password for the invited Connect Tutors BD account. The Admin Login page does not create or promote accounts.",
  },
  {
    number: "03",
    title: "Enroll an authenticator app",
    description: "On your first Admin access, install Google Authenticator, Microsoft Authenticator, Authy, or another compatible app and scan the on-screen QR code.",
  },
  {
    number: "04",
    title: "Save recovery codes safely",
    description: "Recovery codes are one-time backup codes. Keep them in a private, secure location separate from your usual device.",
  },
  {
    number: "05",
    title: "Verify every Admin session",
    description: "After your password is accepted, enter the current time-based code from your authenticator app. This verification is required before Admin workspace actions.",
  },
  {
    number: "06",
    title: "Request a reset if access is lost",
    description: "If you cannot use your authenticator or a recovery code, contact the Project Owner. Only the Owner can reset Admin two-factor access.",
  },
] as const;

export default function AdminHelp() {
  return (
    <div className="site-page min-h-screen bg-j-page text-j-ink">
      <SiteHeader />
      <main>
        <section className="border-b border-[#d6e2eb] bg-white px-4 py-12 sm:px-6 lg:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2782c7]">Admin access help</p>
              <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-[-0.05em] text-j-ink sm:text-5xl">Secure sign-in and two-factor guidance.</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#647f95]">This public guide explains the normal Admin access journey. It never displays account secrets, recovery codes, invitation tokens, or private Admin activity.</p>
              <Link href="/admin/login" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-j-ink px-5 py-3.5 text-sm font-bold !text-white shadow-[0_8px_18px_rgba(23,59,96,0.2)] transition hover:bg-[#102f4c] active:scale-[0.97]">
                Go to Admin Login <ArrowRight size={17} />
              </Link>
            </div>
            <aside className="rounded-[1.5rem] bg-j-ink p-7 text-white shadow-[0_20px_55px_rgba(23,59,96,0.2)] sm:p-9">
              <div className="inline-flex rounded-xl bg-white/10 p-3 text-[#9edcff]"><ShieldCheck size={30} /></div>
              <h2 className="mt-6 text-2xl font-bold tracking-[-0.03em]">What Admin login needs</h2>
              <p className="mt-3 text-sm leading-7 text-[#c8dbea]">An invited Admin account signs in with three checks: the correct email address, the correct password, and a current authenticator code or one-time recovery code.</p>
              <div className="mt-6 border-t border-white/15 pt-5 text-sm font-semibold text-[#bde9ff]">Two-factor verification remains mandatory for protected Admin actions.</div>
            </aside>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2782c7]">Step by step</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-j-ink">How the Admin access journey works</h2>
              <p className="mt-3 text-sm leading-7 text-[#647f95]">Follow these steps in order. If you have not received an invitation, contact the Project Owner instead of attempting to register a separate Admin account.</p>
            </div>
            <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {setupSteps.map((step) => (
                <li key={step.number} className="rounded-xl border border-[#d6e2eb] bg-white p-6 shadow-[0_10px_28px_rgba(23,59,96,0.05)]">
                  <span className="text-xs font-bold tracking-[0.16em] text-[#2782c7]">{step.number}</span>
                  <h3 className="mt-3 text-lg font-bold text-j-ink">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#647f95]">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-4 pb-12 sm:px-6 lg:pb-16">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
            <article className="rounded-[1.5rem] border border-[#cfe0eb] bg-[#e9f6ff] p-7 sm:p-9">
              <div className="inline-flex rounded-xl bg-white p-3 text-j-accent"><Smartphone size={24} /></div>
              <h2 className="mt-5 text-2xl font-bold tracking-[-0.03em] text-j-ink">Authenticator app setup</h2>
              <p className="mt-3 text-sm leading-7 text-[#56738d]">Install an authenticator app before starting enrollment. When the protected setup screen provides a QR code, open your app, choose to add an account, and scan that code. Enter the short-lived code from the app to finish setup.</p>
            </article>
            <article className="rounded-[1.5rem] border border-[#d6e2eb] bg-white p-7 sm:p-9">
              <div className="inline-flex rounded-xl bg-[#f1f7fb] p-3 text-j-accent"><KeyRound size={24} /></div>
              <h2 className="mt-5 text-2xl font-bold tracking-[-0.03em] text-j-ink">Recovery-code guidance</h2>
              <p className="mt-3 text-sm leading-7 text-[#647f95]">Recovery codes are emergency, one-time alternatives to a current authenticator code. Do not share, email, or store them in a public note. If none are available when your authenticator is lost, ask the Project Owner to reset your Admin two-factor access.</p>
            </article>
          </div>
        </section>

        <section className="border-y border-[#d6e2eb] bg-white px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold tracking-[-0.03em] text-j-ink">Keep Admin access safe</h2>
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {adminHelpSafetyPoints.map((point) => <li key={point} className="rounded-xl border border-[#dce7ee] bg-[#f9fcff] px-4 py-4 text-sm leading-6 text-[#56738d]">{point}</li>)}
            </ul>
            <Link href={adminHelpQuickLinks[0].href} className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-j-accent underline-offset-4 transition hover:underline">{adminHelpQuickLinks[0].label} <ArrowRight size={16} /></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
