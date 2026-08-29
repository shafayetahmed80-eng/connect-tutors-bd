import { ArrowRight, Compass, Home } from "lucide-react";
import { Link } from "wouter";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export const notFoundRecoveryAction = { href: "/", label: "Return home" } as const;

export default function NotFound() {
  return <div className="site-page not-found-page"><SiteHeader /><main className="not-found-main"><section className="not-found-shell"><div className="not-found-orbit" aria-hidden="true"><span /><span /><span /></div><p className="eyebrow">404 · Page unavailable</p><h1>This learning path<br/><span>doesn’t lead anywhere.</span></h1><p>The page may have moved, or the link may be outdated. You can return home or continue your tutor search from the directory.</p><div className="not-found-actions"><Link href={notFoundRecoveryAction.href} className="button-primary"><Home size={17} /> {notFoundRecoveryAction.label}</Link><Link href="/tutors" className="button-secondary"><Compass size={17} /> Browse tutors <ArrowRight size={15} /></Link></div></section></main><SiteFooter /></div>;
}
