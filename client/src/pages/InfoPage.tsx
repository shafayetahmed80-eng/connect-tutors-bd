/**
 * Connect Tutors BD visual direction: Neighbourhood Learning Blue — lightweight, clear informational pages
 * that keep the brand's quiet confidence and always leave users with an obvious next action.
 */
import { Link, useLocation } from "wouter";
import { ArrowRight, BookOpen, CalendarDays, GraduationCap, MapPinned, Newspaper, UserRoundCheck } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

const pageContent: Record<string, { eyebrow: string; title: string; copy: string; icon: typeof BookOpen }> = {
  "/tuition": { eyebrow: "Tuition types", title: "Choose the right learning path for your needs.", copy: "Start your search for the right tutor by curriculum, subject, and class format.", icon: BookOpen },
  "/tutors": { eyebrow: "For tutors", title: "Bring your teaching skills to new connections.", copy: "Share your profile, preferred subjects, and schedule to build your path with Connect Tutors BD.", icon: GraduationCap },
  "/blogs": { eyebrow: "Learning notes", title: "Small, practical ideas for better learning.", copy: "Helpful habits, preparation tips, and routines for guardians, students, and tutors will be available here soon.", icon: Newspaper },
  "/events": { eyebrow: "Events", title: "Plans to bring learning communities together.", copy: "Workshop, information session, and education-focused event updates will be published here.", icon: CalendarDays },
  "/contact": { eyebrow: "Contact", title: "Start a conversation with your question.", copy: "Send us a message if you want to talk about tutor matching, profiles, or the platform.", icon: MapPinned },
  "/privacy-policy": { eyebrow: "Privacy", title: "Our responsibility toward your information.", copy: "We believe request information should be used only for relevant communication and matching.", icon: UserRoundCheck },
  "/terms-conditions": { eyebrow: "Terms", title: "Clear expectations, better experiences.", copy: "Detailed terms for using the platform will be added here before the service launches.", icon: BookOpen },
};

export function getInfoPageAction(location: string) {
  return location === "/tutors"
    ? { href: "/become-tutor", label: "Join as a tutor" }
    : { href: "/request-tutor", label: "Request a tutor" };
}

export default function InfoPage() {
  const [location] = useLocation();
  const content = pageContent[location] ?? pageContent["/tuition"];
  const Icon = content.icon;
  const action = getInfoPageAction(location);
  return <div className="site-page"><SiteHeader /><main className="info-page"><section className="shell info-hero"><div className="info-icon"><Icon /></div><p className="eyebrow">{content.eyebrow}</p><h1>{content.title}</h1><p>{content.copy}</p><Link href={action.href} className="button-primary">{action.label} <ArrowRight size={18} /></Link></section></main><SiteFooter /></div>;
}
