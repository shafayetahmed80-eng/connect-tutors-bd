/**
 * Connect Tutors visual direction: Neighbourhood Learning Blue — lightweight, clear informational pages
 * that keep the brand's quiet confidence and always leave users with an obvious next action.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  ListTree,
  MapPinned,
  Newspaper,
  Printer,
  UserRoundCheck,
} from "lucide-react";
import { findInfoPageCopy, infoPageCopy } from "@shared/public-content";
import { SiteContentProvider, useSiteContentResolver } from "@/lib/siteContent";
import { findPolicyPageByPath, type PolicyPageKey } from "@shared/policy-pages";
import { extractPolicyToc, parsePolicyMarkdown } from "@shared/policy-markdown";
import { trpc } from "@/lib/trpc";
import PolicyDocument from "@/components/PolicyDocument";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { useScrollReveal } from "@/lib/scrollReveal";

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
  // The heading block settles in a piece at a time, and a legal document rises as it is reached.
  const mainRef = useRef<HTMLElement>(null);
  useScrollReveal(mainRef, location);
  return (
    <div className="site-page">
      <SiteHeader />
      {/* Keyed by page, so moving from one info page to another starts the entrance again. */}
      <main className="info-page" ref={mainRef} key={location}>
        <section className="shell info-hero print:hidden" data-reveal-group>
          <div className="info-icon"><Icon /></div>
          <p className="eyebrow">{t(`info.${content.key}.eyebrow`, content.eyebrow)}</p>
          <h1>{t(`info.${content.key}.title`, content.title)}</h1>
          <p>{t(`info.${content.key}.copy`, content.copy)}</p>
          <Link href={action.href} className="button-primary">
            {t(action.slotId, action.label)} <ArrowRight size={18} />
          </Link>
        </section>
        {policy ? (
          <section className="shell pb-16 print:pb-0" data-reveal>
            <PolicyBody pageKey={policy.key} fallback={policy.defaultBody} />
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
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
  const rawBody = stored?.trim() ? stored : fallback;
  const blocks = parsePolicyMarkdown(rawBody);
  const tocItems = extractPolicyToc(blocks);
  const [activeId, setActiveId] = useState<string>("");
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || tocItems.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -65% 0px", threshold: 0 }
    );

    tocItems.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [tocItems]);

  const scrollToSection = (id: string) => {
    if (typeof window === "undefined") return;
    window.history.replaceState(null, "", `#${id}`);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
      setMobileTocOpen(false);
    }
  };

  const scrollToTop = () => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrint = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
      {/* Desktop Sticky Table of Contents Sidebar */}
      {tocItems.length > 0 ? (
        <aside
          aria-label="Table of contents"
          className="hidden w-72 shrink-0 print:hidden lg:block xl:w-80"
        >
          <div className="sticky top-24 rounded-2xl border border-j-border bg-white/95 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-j-ink">
                <ListTree className="size-4 text-j-accent" aria-hidden="true" />
                <span>সূচিপত্র / Contents</span>
              </div>
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-2xs font-bold text-j-accent">
                {tocItems.length}
              </span>
            </div>

            <nav aria-label="Section links" className="mt-3.5 max-h-[calc(100vh-14rem)] space-y-1 overflow-y-auto pr-1 text-xs">
              {tocItems.map(item => {
                const isActive = activeId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={`group flex w-full text-left transition rounded-lg px-2.5 py-1.5 leading-snug ${
                      item.level === 3 ? "pl-5 text-slate-500 font-medium" : "font-semibold text-slate-700"
                    } ${
                      isActive
                        ? "bg-sky-50 text-j-accent font-bold ring-1 ring-j-accent/20"
                        : "hover:bg-slate-50 hover:text-j-ink"
                    }`}
                  >
                    <span className="truncate">{item.text}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-2xs font-semibold text-slate-500">
              <button
                type="button"
                onClick={scrollToTop}
                className="inline-flex items-center gap-1 transition hover:text-j-accent"
              >
                <ArrowUp className="size-3" aria-hidden="true" />
                <span>শীর্ষে যান</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1 transition hover:text-j-accent"
              >
                <Printer className="size-3" aria-hidden="true" />
                <span>প্রিন্ট করুন</span>
              </button>
            </div>
          </div>
        </aside>
      ) : null}

      {/* Main Policy Content Area */}
      <article className="min-w-0 flex-1 rounded-[2rem] border border-j-border bg-white p-6 shadow-[0_18px_55px_rgba(28,101,148,0.08)] sm:p-10 print:border-none print:p-0 print:shadow-none">
        {/* Document Header Metadata Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              কার্যকর সংস্করণ (Official Policy)
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              type="button"
              onClick={handlePrint}
              title="Print document"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-600 shadow-2xs transition hover:bg-slate-50 hover:text-j-ink"
            >
              <Printer className="size-3.5" aria-hidden="true" />
              <span>প্রিন্ট</span>
            </button>
          </div>
        </div>

        {/* Mobile Collapsible TOC Drawer/Card */}
        {tocItems.length > 0 ? (
          <div className="mb-6 block rounded-xl border border-sky-100 bg-sky-50/50 p-3.5 print:hidden lg:hidden">
            <button
              type="button"
              onClick={() => setMobileTocOpen(!mobileTocOpen)}
              className="flex w-full items-center justify-between text-left text-xs font-bold text-j-ink"
            >
              <div className="flex items-center gap-2">
                <ListTree className="size-4 text-j-accent" aria-hidden="true" />
                <span>দ্রুত সূচিপত্র ({tocItems.length} টি সেকশন)</span>
              </div>
              {mobileTocOpen ? (
                <ChevronUp className="size-4 text-slate-500" />
              ) : (
                <ChevronDown className="size-4 text-slate-500" />
              )}
            </button>

            {mobileTocOpen ? (
              <nav aria-label="Mobile section links" className="mt-3 max-h-60 space-y-1 overflow-y-auto border-t border-sky-100 pt-2 text-xs">
                {tocItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={`block w-full truncate py-1 text-left ${
                      item.level === 3 ? "pl-4 text-slate-500" : "font-semibold text-slate-700"
                    } hover:text-j-accent`}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
            ) : null}
          </div>
        ) : null}

        <PolicyDocument body={rawBody} onHeadingClick={setActiveId} />
      </article>
    </div>
  );
}
