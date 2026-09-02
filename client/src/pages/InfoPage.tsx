/**
 * Connect Tutors BD visual direction: Neighbourhood Learning Blue — lightweight, clear informational pages
 * that keep the brand's quiet confidence and always leave users with an obvious next action.
 */
import { Link, useLocation } from "wouter";
import { ArrowRight, BookOpen, CalendarDays, GraduationCap, MapPinned, Newspaper, UserRoundCheck } from "lucide-react";
import { findInfoPageCopy, infoPageCopy } from "@shared/public-content";
import { SiteContentProvider, useSiteContentResolver } from "@/lib/siteContent";
import { findPolicyPageByPath, type PolicyPageKey } from "@shared/policy-pages";
import { trpc } from "@/lib/trpc";
import PolicyDocument from "@/components/PolicyDocument";
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
  // Only two of the seven info pages carry a document beneath the hero.
  const policy = findPolicyPageByPath(location);
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
        {policy ? <section className="shell pb-16"><PolicyBody pageKey={policy.key} fallback={policy.defaultBody} /></section> : null}
      </main>
      <SiteFooter />
  </div>;
}

/**
 * The Owner's body for a legal page, falling back to the one the code ships.
 *
 * The fallback is not a loading state: a visitor who arrives while the query is
 * in flight, or when it fails, still reads a complete policy rather than an
 * empty page. Content is cosmetic everywhere else on the site; here it is the
 * document someone agreed to, so it must always render something.
 */
function PolicyBody({ pageKey, fallback }: { pageKey: PolicyPageKey; fallback: string }) {
  const documents = trpc.policyDocuments.list.useQuery();
  const stored = documents.data?.find(row => row.pageKey === pageKey)?.body;
  return <article className="mx-auto max-w-3xl rounded-[2rem] border border-[#dcecf5] bg-white p-7 shadow-[0_18px_55px_rgba(28,101,148,0.08)] sm:p-10">
    <PolicyDocument body={stored?.trim() ? stored : fallback} />
  </article>;
}
