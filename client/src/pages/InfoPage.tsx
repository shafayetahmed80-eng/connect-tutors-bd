/**
 * Connect Tutors BD visual direction: Neighbourhood Learning Blue — lightweight, clear informational pages
 * that keep the brand's quiet confidence and always leave users with an obvious next action.
 */
import { Link, useLocation } from "wouter";
import { ArrowRight, BookOpen, CalendarDays, GraduationCap, MapPinned, Newspaper, UserRoundCheck } from "lucide-react";
import { findInfoPageCopy, infoPageCopy } from "@shared/public-content";
import { SiteContentProvider, useSiteContentResolver } from "@/lib/siteContent";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

/**
 * The copy lives in `@shared/public-content` so the Admin panel's slot defaults
 * and what renders here cannot drift. Only the icon stays behind, because a
 * component reference cannot cross into shared code.
 */
const pageIcons: Record<string, typeof BookOpen> = {
  "/tuition": BookOpen,
  "/tutors": GraduationCap,
  "/blogs": Newspaper,
  "/events": CalendarDays,
  "/contact": MapPinned,
  "/privacy-policy": UserRoundCheck,
  "/terms-conditions": BookOpen,
};

export function getInfoPageAction(location: string) {
  return location === "/tutors"
    ? { href: "/become-tutor", label: "Join as a tutor", slotId: "info.action.joinTutor" }
    : { href: "/request-tutor", label: "Request a tutor", slotId: "info.action.requestTutor" };
}

export default function InfoPage() {
  // The resolver reads context, so it has to run under the provider rather
  // than in the component that renders it.
  return <SiteContentProvider page="info-pages"><InfoPageContent /></SiteContentProvider>;
}

function InfoPageContent() {
  const [location] = useLocation();
  const content = findInfoPageCopy(location) ?? infoPageCopy[0];
  const Icon = pageIcons[location] ?? BookOpen;
  const action = getInfoPageAction(location);
  const t = useSiteContentResolver();
  return <div className="site-page">
      <SiteHeader />
      <main className="info-page">
        <section className="shell info-hero">
          <div className="info-icon"><Icon /></div>
          <p className="eyebrow">{t(`info.${content.key}.eyebrow`, content.eyebrow)}</p>
          <h1>{t(`info.${content.key}.title`, content.title)}</h1>
          <p>{t(`info.${content.key}.copy`, content.copy)}</p>
          <Link href={action.href} className="button-primary">
            {t(action.slotId, action.label)} <ArrowRight size={18} />
          </Link>
        </section>
      </main>
      <SiteFooter />
  </div>;
}
