import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "wouter";

/**
 * The "Back to ..." link at the head of a detail page.
 *
 * It was written out in seven places, each 20px tall - the height of its 14px
 * line - which is too thin for a finger. A phone gets a 40px target here; from
 * `sm` up the link keeps its line height, where a mouse finds it as before.
 */
export default function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-bold text-j-accent hover:underline max-sm:min-h-10"><ArrowLeft size={15} /> {children}</Link>;
}
