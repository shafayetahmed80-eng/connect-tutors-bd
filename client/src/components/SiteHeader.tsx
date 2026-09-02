import { useSiteContact } from "@/lib/siteContent";
import React from "react";
import { Link, useLocation } from "wouter";
import { Menu, Phone, UserRound, X } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";

export const navItems = [
  { label: "Job Board", href: "/job-board" },
  { label: "Blog", href: "/blogs" },
];

export const mobilePublicQuickLinks = [
  { label: "Home", href: "/" },
  ...navItems,
] as const;

export const brandWordmark = {
  primary: "Connect",
  secondary: "Tutors BD",
  homeLabel: "Connect Tutors BD home",
} as const;

export type JourneyAudience = "guardian" | "tutor";

export function getJourneyNavigation(audience: JourneyAudience) {
  return [
    { label: "Home", href: "/" },
    { label: "Get help", href: "/contact" },
    { label: audience === "guardian" ? "Guardian sign in" : "Tutor sign in", href: "/login" },
  ] as const;
}

/**
 * The single sign-in entry in the navigation bar.
 *
 * The label never changes. Someone already signed in is taken straight to their
 * own workspace instead, so the header never has to say "Account" and never
 * announces which role is signed in.
 */
export const PUBLIC_ACCOUNT_LABEL = "Sign In";

export function getPublicAccountNavigation(user: { role?: string } | null | undefined) {
  if (!user) return { href: "/login", label: PUBLIC_ACCOUNT_LABEL };
  if (user.role === "tutor") return { href: "/tutor/dashboard/jobs", label: PUBLIC_ACCOUNT_LABEL };
  if (user.role === "admin") return { href: "/admin/matching", label: PUBLIC_ACCOUNT_LABEL };
  if (user.role === "guardian" || user.role === "user") return { href: "/guardian/dashboard/posted-jobs", label: PUBLIC_ACCOUNT_LABEL };
  return { href: "/account", label: PUBLIC_ACCOUNT_LABEL };
}

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand-logo" aria-label={brandWordmark.homeLabel}>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" role="img" focusable="false">
          <path d="M10 30.5 20 9.5l10 21" />
          <path d="M13.5 23h13" />
          <circle cx="10" cy="30.5" r="3.25" />
          <circle cx="20" cy="9.5" r="3.25" />
          <circle cx="30" cy="30.5" r="3.25" />
        </svg>
      </span>
      {!compact && (
        <span className="brand-wordmark">
          <strong>{brandWordmark.primary}</strong>
          <em>{brandWordmark.secondary}</em>
        </span>
      )}
    </Link>
  );
}

export default function SiteHeader({
  variant = "default",
  journeyAudience = "guardian",
}: {
  variant?: "default" | "journey";
  journeyAudience?: JourneyAudience;
}) {
  const contact = useSiteContact();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const isJourneyHeader = variant === "journey";
  const journeyNavigation = getJourneyNavigation(journeyAudience);
  // Same label whether or not someone is signed in; only where it goes changes.
  const accountNavigation = getPublicAccountNavigation(user);

  useEffect(() => setOpen(false), [location]);

  return (
    <header className={`site-header${isJourneyHeader ? " journey-site-header" : ""}`}>
      <div className={isJourneyHeader ? "journey-contact-bar" : "microbar"}>
        <div className="shell microbar-inner">
          <div className="contact-actions">
            <a href={contact.tel} className="phone-link">
              <Phone size={14} />
              <span>+880 1516 131411</span>
            </a>
            <a
              href={contact.whatsapp()}
              className="whatsapp-link"
              target="_blank"
              rel="noreferrer"
              aria-label="Message Connect Tutors BD on WhatsApp"
              title="Message us on WhatsApp"
            >
              <FaWhatsapp size={16} aria-hidden="true" />
            </a>
          </div>
          {/* The account entry used to sit here. It lives in the navigation bar
              now, so this strip carries contact details and nothing else. */}
          {isJourneyHeader ? <Link href="/contact" className="journey-help-link">Need help? Contact us</Link> : null}
        </div>
      </div>

      <div className="shell header-inner">
        <BrandLogo />

        <nav className={`desktop-nav reference-nav${isJourneyHeader ? " journey-desktop-nav" : ""}`} aria-label={isJourneyHeader ? "Journey navigation" : "Main navigation"}>
          {isJourneyHeader ? (
            journeyNavigation.map((item) => (
              <Link key={item.href} href={item.href} className={location === item.href ? "nav-active" : ""}>
                {item.label}
              </Link>
            ))
          ) : (
            <>
              <Link href={accountNavigation.href} className="nav-sign-in">
                <UserRound size={14} aria-hidden="true" />
                {accountNavigation.label}
              </Link>
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className={location === item.href ? "nav-active" : ""}>
                  {item.label}
                </Link>
              ))}
              <Link href="/become-tutor" className="become-tutor-link">
                Become a Tutor
              </Link>
            </>
          )}
        </nav>

        <button
          type="button"
          className="mobile-toggle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">
          {isJourneyHeader ? (
            journeyNavigation.map((item) => (
              <Link key={item.href} href={item.href} className="mobile-menu-link">
                {item.label}
              </Link>
            ))
          ) : (
            <>
              {mobilePublicQuickLinks.map((item) => (
                <Link key={item.href} href={item.href} className="mobile-menu-link">
                  {item.label}
                </Link>
              ))}
              <Link href="/become-tutor" className="mobile-menu-link mobile-tutor-link">Become a Tutor</Link>
              <Link href={accountNavigation.href} className="mobile-menu-link"><UserRound size={16} aria-hidden="true" /> {accountNavigation.label}</Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
