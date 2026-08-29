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
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const homeEditorialImages = {
  homeLearning: "/manus-storage/connect-tutors-home-learning_1281da6b.jpg",
  onlineLearning: "/manus-storage/connect-tutors-home-online_545114df.jpg",
} as const;

const tuitionTypes = [
  { icon: BookOpen, title: "Bangla Medium", copy: "Find skilled tutors for the national curriculum, from primary school through college.", color: "blue" },
  { icon: Languages, title: "English Version", copy: "Get the right teacher to understand the national curriculum in English.", color: "aqua" },
  { icon: GraduationCap, title: "English Medium", copy: "Match with tutors for Cambridge, Edexcel, and IB subjects.", color: "violet" },
  { icon: Landmark, title: "Religious Education", copy: "Choose a tutor who understands your needs for madrasa and religious subjects.", color: "amber" },
  { icon: Sparkles, title: "Skill Development", copy: "Get focused support for IELTS, SAT, GRE, and other learning goals.", color: "coral" },
];

const steps = [
  { icon: BookOpen, number: "01", title: "Share your need", copy: "Tell us a few details about the subject, class, schedule, and area." },
  { icon: UserRoundCheck, number: "02", title: "Choose a profile", copy: "Review potential tutor profiles matched to your requirements." },
  { icon: MonitorSmartphone, number: "03", title: "Take a demo class", copy: "Try an introductory class to see whether the approach feels right." },
  { icon: BadgeCheck, number: "04", title: "Confirm your choice", copy: "Agree on the schedule, fee, and class format when you are ready." },
  { icon: Sparkles, number: "05", title: "Start learning", copy: "Move at your own pace and stay focused on your learning goals." },
];

const faqs = [
  ["How do I find a tutor on Connect Tutors BD?", "Share your needs through the Tutor Request form. Our team will then contact you about the next step."],
  ["Is it easy for students and guardians to use?", "Yes. Start with the essentials—subject, class, location, and preferences. You can add more details when needed."],
  ["Can I find both online and home tutors?", "Yes. You can choose home tuition or online tuition in the first step of the request form."],
  ["What is the purpose of a demo class?", "A demo class helps you understand the teaching style and the student’s comfort before making a considered decision."],
  ["How is the tutor fee decided?", "Subject, class, location, class duration, and experience are considered when agreeing on the fee."],
];

export default function Home() {
  const [mode, setMode] = useState<"home" | "online">("home");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="site-page">
      <SiteHeader />
      <main>
        <section className="hero-section">
          <div className="shell hero-shell">
            <div className="hero-copy">
              <p className="hero-kicker"><span className="pulse-dot" /> Tutor matching across Bangladesh</p>
              <h1>Build your <span>learning connection</span> with the right tutor.</h1>
              <p className="hero-description">At home or online, make the search for your next tutor easier by starting with the student’s needs.</p>
              <div className="hero-actions">
                <Link href="/request-tutor" className="button-primary">Request a tutor <ArrowRight size={18} /></Link>
                <Link href="/become-tutor" className="button-secondary">Join as a tutor</Link>
              </div>
              <div className="hero-assurance"><BadgeCheck size={18} /><span>Start with your needs. The decision stays yours.</span></div>
            </div>
            <div className="hero-visual">
              <div className="hero-sunburst" />
              <img src="/manus-storage/connect-tutors-hero_897f4c50.png" alt="A student celebrating learning success with family" />
              <div className="hero-float-card float-card-one"><Heart size={16} fill="currentColor" /><span>Matching<br /><strong>your way</strong></span></div>
              <div className="hero-float-card float-card-two"><CalendarDays size={17} /><span>Simple<br /><strong>next steps</strong></span></div>
            </div>
          </div>
        </section>

        <section className="proof-strip" aria-label="How Connect Tutors BD helps">
          <div className="shell proof-grid">
            <div className="proof-intro"><Heart size={17} fill="currentColor" /><span>One simple connection for <b>students, guardians, and tutors.</b></span></div>
            <div className="proof-item"><CalendarDays /><div><b>Save time</b><span>Start with a few details</span></div></div>
            <div className="proof-item"><UserRoundCheck /><div><b>Understand profiles</b><span>Know more before deciding</span></div></div>
            <div className="proof-item"><BriefcaseBusiness /><div><b>Stay on track</b><span>Put your learning style first</span></div></div>
          </div>
        </section>

        <section className="section tuition-section">
          <div className="shell">
            <div className="section-heading split-heading">
              <div><p className="eyebrow">Tuition types</p><h2>Your learning path,<br /><span>your choice.</span></h2></div>
              <p>Choose the curriculum or learning goal that matters to you. We can then make the search for the right tutor more specific.</p>
            </div>
            <div className="tuition-toggle" role="tablist" aria-label="Tuition format">
              <button type="button" role="tab" aria-selected={mode === "home"} className={mode === "home" ? "selected" : ""} onClick={() => setMode("home")}><School size={17} /> Home tuition</button>
              <button type="button" role="tab" aria-selected={mode === "online"} className={mode === "online" ? "selected" : ""} onClick={() => setMode("online")}><MonitorSmartphone size={17} /> Online tuition</button>
            </div>
            <div className="tuition-cards">
              {tuitionTypes.map((item) => {
                const Icon = item.icon;
                return <article className={`tuition-card ${item.color}`} key={item.title}><div className="tuition-icon"><Icon /></div><h3>{item.title}</h3><p>{item.copy}</p><Link href="/request-tutor" aria-label={`Request a ${item.title} tutor`}><ArrowRight size={19} /></Link></article>;
              })}
            </div>
            <div className="mode-note"><Check size={17} /> {mode === "home" ? "Mention your preferences and schedule for learning near home." : "Mention your preferred online schedule for learning from home."}</div>
          </div>
        </section>

        <section className="belief-banner">
          <div className="shell belief-inner"><span className="belief-mark">“</span><p>A good teacher does more than explain a subject—they help build the <em>confidence to learn.</em></p><span className="belief-line" /></div>
        </section>

        <section className="section journey-section">
          <div className="shell">
            <div className="section-heading centered-heading"><p className="eyebrow">How it works</p><h2>A simple path to <span>better learning.</span></h2><p>From sharing your need to taking the first class, we keep each step clear.</p></div>
            <div className="journey-path">
              <div className="journey-line" />
              {steps.map((step, index) => { const Icon = step.icon; return <article className="journey-step" key={step.number}><div className="step-number">{step.number}</div><div className="step-icon"><Icon /></div><h3>{step.title}</h3><p>{step.copy}</p>{index < steps.length - 1 && <ArrowRight className="step-arrow" size={20} />}</article>; })}
            </div>
            <div className="journey-cta"><Link href="/request-tutor" className="text-action">Share your need <ArrowRight size={18} /></Link></div>
          </div>
        </section>

        <section className="stories-section">
          <div className="shell stories-layout">
            <div className="stories-images"><img className="story-image story-one" src={homeEditorialImages.homeLearning} alt="A Bangladeshi tutor supporting a student in a home study session" /><img className="story-image story-two" src={homeEditorialImages.onlineLearning} alt="A Bangladeshi student learning with an online tutor" /><div className="image-badge"><Sparkles size={19} /><span>Keep learning,<br /><b>at your own pace.</b></span></div></div>
            <div className="stories-copy"><p className="eyebrow">Room to learn</p><h2>At home or across a screen—<span>the right attention matters.</span></h2><p>Every student’s routine, subject, comfort, and goal is different. Start a conversation with a clear request, then decide how you want to move forward.</p><ul><li><Check /> Share your needs briefly</li><li><Check /> Choose a tutor format and preference</li><li><Check /> Learn more and decide for yourself</li></ul><Link href="/request-tutor" className="button-primary">Get started <ArrowRight size={18} /></Link></div>
          </div>
        </section>

        <section className="section faq-section">
          <div className="shell faq-layout">
            <div className="faq-intro"><p className="eyebrow">Frequently asked</p><h2>Have a question?<br /><span>We are here to help.</span></h2><p>Before searching for a tutor, it helps to understand how the process works.</p><Link href="/contact" className="text-action">Ask another question <ArrowRight size={18} /></Link></div>
            <div className="faq-list">{faqs.map(([question, answer], index) => <article className={`faq-item ${openFaq === index ? "faq-open" : ""}`} key={question}><button type="button" onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}><span>{question}</span><ChevronDown size={20} /></button>{openFaq === index && <p>{answer}</p>}</article>)}</div>
          </div>
        </section>

        <section className="final-cta"><div className="shell final-cta-inner"><div><p className="eyebrow eyebrow-light">Your next step</p><h2>Make the right connection<br />for better learning.</h2></div><Link href="/request-tutor" className="button-light">Request a tutor <ArrowRight size={18} /></Link></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
