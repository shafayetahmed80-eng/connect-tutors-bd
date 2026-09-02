/**
 * Connect Tutors BD visual direction: Neighbourhood Learning Blue — an editorial, supportive footer
 * that turns service details into clear next steps rather than a dense utility panel.
 */
import { useSiteContact } from "@/lib/siteContent";
import { Link } from "wouter";
import { CircleHelp, ClipboardList, MessageCircle } from "lucide-react";
import { BrandLogo } from "./SiteHeader";

export const footerQuickLinks = [
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms-conditions" },
  { label: "Admin Login", href: "/admin/login" },
  { label: "Admin Help", href: "/admin/help" },
] as const;

export const footerSupportChannels = [
  {
    type: "request",
    title: "Request a Tutor",
    action: "Start a guided tutor request",
    detail: "Share your learning needs in a few clear steps.",
    href: "/request-tutor",
  },
  {
    type: "whatsapp",
    title: "Message us on WhatsApp",
    action: "",
    detail: "Use WhatsApp for a direct enquiry.",
    href: "",
  },
  {
    type: "help",
    title: "Need general help?",
    action: "Open our contact page",
    detail: "Find the right public support path for your question.",
    href: "/contact",
  },
] as const;

function FooterSupportIcon({ type }: { type: (typeof footerSupportChannels)[number]["type"] }) {
  if (type === "request") return <ClipboardList />;
  if (type === "whatsapp") return <MessageCircle />;
  return <CircleHelp />;
}

export default function SiteFooter() {
  const contact = useSiteContact();
  // The WhatsApp row carries no number of its own: it is filled from the one
  // Admin-editable value so a change reaches every link on the site at once.
  const channels = footerSupportChannels.map(channel =>
    channel.type === "whatsapp" ? { ...channel, action: contact.display, href: contact.whatsapp() } : channel);
  return (
    <footer className="site-footer">
      <div className="shell footer-main">
        <div className="footer-intro">
          <p className="eyebrow eyebrow-light">Contact</p>
          <h2>Let’s find the right learning partner.</h2>
          <p>Tell us what you need, and our team will guide you through the next step.</p>
          <BrandLogo />
        </div>
        {channels.map((channel) => (
          <div className="footer-contact-card" key={channel.type}>
            <FooterSupportIcon type={channel.type} />
            <div>
              <strong>{channel.title}</strong>
              {channel.href.startsWith("http") ? (
                <a href={channel.href} target="_blank" rel="noreferrer">{channel.action}</a>
              ) : (
                <Link href={channel.href}>{channel.action}</Link>
              )}
              <span>{channel.detail}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="shell footer-bottom">
        <p>© {new Date().getFullYear()} Connect Tutors BD. All rights reserved.</p>
        <div className="footer-links">
          {footerQuickLinks.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
        </div>
      </div>
    </footer>
  );
}
