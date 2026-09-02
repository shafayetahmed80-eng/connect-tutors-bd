/**
 * Connect Tutors BD visual direction: Neighbourhood Learning Blue — a bright, human, guided path
 * from a confident hero promise to understandable matching steps, using Connected Sky as the main signal.
 */
import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight, BadgeCheck, BookOpen, BriefcaseBusiness, CalendarDays, Check,
  ChevronDown, GraduationCap, Heart, Landmark, Languages, MonitorSmartphone,
  School, Sparkles, UserRoundCheck,
} from "lucide-react";
import { homeCopy } from "@shared/public-content";
import { SiteContentProvider, useSiteContentResolver } from "@/lib/siteContent";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const homeEditorialImages = {
  homeLearning: "/manus-storage/connect-tutors-home-learning_1281da6b.jpg",
  onlineLearning: "/manus-storage/connect-tutors-home-online_545114df.jpg",
} as const;

/**
 * Only the parts a component reference cannot cross into shared code. The copy
 * itself lives in `@shared/public-content`, so the Admin panel's slot defaults
 * and what renders here are the same strings.
 */
const tuitionIcons: Record<string, { icon: typeof BookOpen; color: string }> = {
  "bangla-medium": { icon: BookOpen, color: "blue" },
  "english-version": { icon: Languages, color: "aqua" },
  "english-medium": { icon: GraduationCap, color: "violet" },
  religious: { icon: Landmark, color: "amber" },
  skills: { icon: Sparkles, color: "coral" },
};

const stepIcons: Record<string, typeof BookOpen> = {
  share: BookOpen,
  choose: UserRoundCheck,
  demo: MonitorSmartphone,
  confirm: BadgeCheck,
  start: Sparkles,
};

const proofIcons: Record<string, typeof BookOpen> = {
  "save-time": CalendarDays,
  understand: UserRoundCheck,
  "on-track": BriefcaseBusiness,
};

export default function Home() {
  // The resolver reads context, so it has to run under the provider rather
  // than in the component that renders it.
  return <SiteContentProvider page="home"><HomeContent /></SiteContentProvider>;
}

function HomeContent() {
  const [mode, setMode] = useState<"home" | "online">("home");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const t = useSiteContentResolver();
  const { hero, proof, tuition, belief, journey, stories, faq, finalCta } = homeCopy;

  return (
    <div className="site-page">
      <SiteHeader />
      <main>
        <section className="hero-section">
          <div className="shell hero-shell">
            <div className="hero-copy">
              <p className="hero-kicker"><span className="pulse-dot" /> {t("home.hero.kicker", hero.kicker)}</p>
              {/* Split so the middle stays the accent colour while all three
                  parts remain plain, editable text. */}
              <h1>{t("home.hero.title.lead", hero.title.lead)}<span>{t("home.hero.title.accent", hero.title.accent)}</span>{t("home.hero.title.tail", hero.title.tail)}</h1>
              <p className="hero-description">{t("home.hero.description", hero.description)}</p>
              <div className="hero-actions">
                <Link href="/request-tutor" className="button-primary">{t("home.hero.primaryAction", hero.primaryAction)} <ArrowRight size={18} /></Link>
                <Link href="/become-tutor" className="button-secondary">{t("home.hero.secondaryAction", hero.secondaryAction)}</Link>
              </div>
              <div className="hero-assurance"><BadgeCheck size={18} />{t("home.hero.assurance", hero.assurance)}</div>
            </div>
            <div className="hero-visual">
              <div className="hero-sunburst" />
              <img src="/manus-storage/connect-tutors-hero_897f4c50.png" alt="A student celebrating learning success with family" />
              <div className="hero-float-card float-card-one"><Heart size={16} fill="currentColor" /><span>{t("home.hero.floatOne.lead", hero.floatOne.lead)}<br /><strong>{t("home.hero.floatOne.strong", hero.floatOne.strong)}</strong></span></div>
              <div className="hero-float-card float-card-two"><CalendarDays size={17} /><span>{t("home.hero.floatTwo.lead", hero.floatTwo.lead)}<br /><strong>{t("home.hero.floatTwo.strong", hero.floatTwo.strong)}</strong></span></div>
            </div>
          </div>
        </section>

        <section className="proof-strip" aria-label="How Connect Tutors BD helps">
          <div className="shell proof-grid">
            <div className="proof-intro"><Heart size={17} fill="currentColor" /><span>{t("home.proof.introLead", proof.introLead)}<b>{t("home.proof.introStrong", proof.introStrong)}</b></span></div>
            {proof.items.map(item => {
              const Icon = proofIcons[item.id] ?? CalendarDays;
              return <div className="proof-item" key={item.id}><Icon /><div><b>{t(`home.proof.${item.id}.title`, item.title)}</b>{t(`home.proof.${item.id}.copy`, item.copy)}</div></div>;
            })}
          </div>
        </section>

        <section className="section tuition-section">
          <div className="shell">
            <div className="section-heading split-heading">
              <div>
                <p className="eyebrow">{t("home.tuition.eyebrow", tuition.eyebrow)}</p>
                <h2>{t("home.tuition.title.lead", tuition.title.lead)}<br /><span>{t("home.tuition.title.accent", tuition.title.accent)}</span></h2>
              </div>
              <p>{t("home.tuition.description", tuition.description)}</p>
            </div>
            <div className="tuition-toggle" role="tablist" aria-label="Tuition format">
              <button type="button" role="tab" aria-selected={mode === "home"} className={mode === "home" ? "selected" : ""} onClick={() => setMode("home")}><School size={17} /> {t("home.tuition.homeToggle", tuition.homeToggle)}</button>
              <button type="button" role="tab" aria-selected={mode === "online"} className={mode === "online" ? "selected" : ""} onClick={() => setMode("online")}><MonitorSmartphone size={17} /> {t("home.tuition.onlineToggle", tuition.onlineToggle)}</button>
            </div>
            <div className="tuition-cards">
              {tuition.cards.map(card => {
                const meta = tuitionIcons[card.id] ?? { icon: BookOpen, color: "blue" };
                const Icon = meta.icon;
                return <article className={`tuition-card ${meta.color}`} key={card.id}><div className="tuition-icon"><Icon /></div><h3>{t(`home.tuition.${card.id}.title`, card.title)}</h3><p>{t(`home.tuition.${card.id}.copy`, card.copy)}</p><Link href="/request-tutor" aria-label={`Request a ${card.title} tutor`}><ArrowRight size={19} /></Link></article>;
              })}
            </div>
            <div className="mode-note"><Check size={17} /> {mode === "home"
              ? t("home.tuition.homeNote", tuition.homeNote)
              : t("home.tuition.onlineNote", tuition.onlineNote)}</div>
          </div>
        </section>

        <section className="belief-banner">
          <div className="shell belief-inner"><span className="belief-mark">“</span><p>{t("home.belief.lead", belief.lead)}<em>{t("home.belief.accent", belief.accent)}</em></p><span className="belief-line" /></div>
        </section>

        <section className="section journey-section">
          <div className="shell">
            <div className="section-heading centered-heading">
              <p className="eyebrow">{t("home.journey.eyebrow", journey.eyebrow)}</p>
              <h2>{t("home.journey.title.lead", journey.title.lead)}<span>{t("home.journey.title.accent", journey.title.accent)}</span></h2>
              <p>{t("home.journey.description", journey.description)}</p>
            </div>
            <div className="journey-path">
              <div className="journey-line" />
              {journey.steps.map((step, index) => {
                const Icon = stepIcons[step.id] ?? BookOpen;
                return <article className="journey-step" key={step.id}><div className="step-number">{step.number}</div><div className="step-icon"><Icon /></div><h3>{t(`home.journey.${step.id}.title`, step.title)}</h3><p>{t(`home.journey.${step.id}.copy`, step.copy)}</p>{index < journey.steps.length - 1 && <ArrowRight className="step-arrow" size={20} />}</article>;
              })}
            </div>
            <div className="journey-cta"><Link href="/request-tutor" className="text-action">{t("home.journey.action", journey.action)} <ArrowRight size={18} /></Link></div>
          </div>
        </section>

        <section className="stories-section">
          <div className="shell stories-layout">
            <div className="stories-images">
              <img className="story-image story-one" src={homeEditorialImages.homeLearning} alt="A Bangladeshi tutor supporting a student in a home study session" />
              <img className="story-image story-two" src={homeEditorialImages.onlineLearning} alt="A Bangladeshi student learning with an online tutor" />
              <div className="image-badge"><Sparkles size={19} /><span>{t("home.stories.badgeLead", stories.badgeLead)}<br /><b>{t("home.stories.badgeStrong", stories.badgeStrong)}</b></span></div>
            </div>
            <div className="stories-copy">
              <p className="eyebrow">{t("home.stories.eyebrow", stories.eyebrow)}</p>
              <h2>{t("home.stories.title.lead", stories.title.lead)}<span>{t("home.stories.title.accent", stories.title.accent)}</span></h2>
              <p>{t("home.stories.description", stories.description)}</p>
              <ul>{stories.bullets.map(bullet => <li key={bullet.id}><Check /> {t(`home.stories.${bullet.id}`, bullet.text)}</li>)}</ul>
              <Link href="/request-tutor" className="button-primary">{t("home.stories.action", stories.action)} <ArrowRight size={18} /></Link>
            </div>
          </div>
        </section>

        <section className="section faq-section">
          <div className="shell faq-layout">
            <div className="faq-intro">
              <p className="eyebrow">{t("home.faq.eyebrow", faq.eyebrow)}</p>
              <h2>{t("home.faq.title.lead", faq.title.lead)}<br /><span>{t("home.faq.title.accent", faq.title.accent)}</span></h2>
              <p>{t("home.faq.description", faq.description)}</p>
              <Link href="/contact" className="text-action">{t("home.faq.action", faq.action)} <ArrowRight size={18} /></Link>
            </div>
            <div className="faq-list">{faq.items.map((item, index) => <article className={`faq-item ${openFaq === index ? "faq-open" : ""}`} key={item.id}>
              <button type="button" onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}>
                <span>{t(`home.faq.${item.id}.question`, item.question)}</span><ChevronDown size={20} />
              </button>
              {openFaq === index && <p>{t(`home.faq.${item.id}.answer`, item.answer)}</p>}
            </article>)}</div>
          </div>
        </section>

        <section className="final-cta"><div className="shell final-cta-inner">
          <div>
            <p className="eyebrow eyebrow-light">{t("home.cta.eyebrow", finalCta.eyebrow)}</p>
            <h2>{t("home.cta.titleLead", finalCta.titleLead)}<br />{t("home.cta.titleTail", finalCta.titleTail)}</h2>
          </div>
          <Link href="/request-tutor" className="button-light">{t("home.cta.action", finalCta.action)} <ArrowRight size={18} /></Link>
        </div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
