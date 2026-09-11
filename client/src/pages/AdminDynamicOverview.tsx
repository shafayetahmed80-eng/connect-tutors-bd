import AdminDynamicSectionPage from "@/components/AdminDynamicSectionPage";
import { adminDynamicGuide } from "@shared/admin-dynamic-guide";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "wouter";

/**
 * The contents page for the Dynamic Section.
 *
 * Thirteen screens whose names say what they are called but not what they do,
 * and the answer was only ever in the code comments. Here they are in one
 * list, each with the same Bangla sentence its own screen now carries, so the
 * Owner can find the right one before opening any of them.
 */
export default function AdminDynamicOverview() {
  return <AdminDynamicSectionPage title="Section guide">
    <div className="grid gap-3 md:grid-cols-2">
      {adminDynamicGuide.map(entry => <section key={entry.path} className="flex flex-col rounded-xl border border-j-border bg-white p-4 shadow-sm">
        <Link
          href={entry.path}
          className="group inline-flex items-center gap-1.5 text-sm font-bold text-j-ink hover:text-j-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent/40"
        >
          {entry.label}
          <ArrowRight size={14} aria-hidden={true} className="text-j-accent transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </Link>
        <p className="mt-2 flex-1 text-sm leading-6 text-j-ink-soft">{entry.summary}</p>
        {entry.seeAt.length === 0 ? null : <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs font-bold text-j-ink-faint">
          <span className="uppercase tracking-wide">কোথায় দেখা যাবে</span>
          {entry.seeAt.map(destination => <a
            key={destination.path}
            href={destination.path}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-j-border px-2 py-1 text-j-accent hover:bg-j-accent-wash"
          >{destination.label} <ExternalLink size={11} aria-hidden={true} /></a>)}
        </p>}
      </section>)}
    </div>
  </AdminDynamicSectionPage>;
}
