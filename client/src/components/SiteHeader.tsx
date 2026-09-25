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
  secondary: "Tutors",
  homeLabel: "Connect Tutors home",
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

/**
 * The Connect Tutors mark: a Newton's cradle. Four balls hang at rest and the
 * saffron one is lifted - the one that sets the rest moving. Drawn on a
 * 48-unit grid, cropped to the rows it uses; `.brand-mark` colours it. The
 * bar is drawn last so every string hangs from under it.
 */
export function BrandMark({ onAnimationEnd }: { onAnimationEnd?: React.AnimationEventHandler<SVGSVGElement> }) {
  return (
    <svg className="brand-mark" viewBox="0 8 48 32" aria-hidden="true" focusable="false" onAnimationEnd={onAnimationEnd}>
      <g className="brand-mark-free">
        <path d="M5.6 11V35" fill="none" stroke="currentColor" strokeWidth={1.3} />
        <circle cx={5.6} cy={35} r={3.6} fill="currentColor" />
      </g>
      <path d="M12.8 11V35M20 11V35M27.2 11V35" fill="none" stroke="currentColor" strokeWidth={1.3} />
      <circle cx={12.8} cy={35} r={3.6} fill="currentColor" />
      <circle cx={20} cy={35} r={3.6} fill="currentColor" />
      <circle cx={27.2} cy={35} r={3.6} fill="currentColor" />
      <g className="brand-mark-lifted" transform="rotate(-22 34.4 11)">
        <path d="M34.4 11V35" fill="none" stroke="currentColor" strokeWidth={1.3} />
        <circle cx={34.4} cy={35} r={3.6} fill="currentColor" />
      </g>
      <path d="M3 11H37" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

/** Mark + wordmark. Pointing at it (or tabbing to it) swings the cradle once. */
export function BrandLogo({ compact = false }: { compact?: boolean }) {
  const [swinging, setSwinging] = useState(false);
  const swing = () => setSwinging(true);
  return (
    <Link
      href="/"
      className="brand-logo"
      aria-label={brandWordmark.homeLabel}
      data-swinging={swinging ? "" : undefined}
      onPointerEnter={swing}
      onFocus={swing}
    >
      <BrandMark onAnimationEnd={() => setSwinging(false)} />
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
              aria-label="Message Connect Tutors on WhatsApp"
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
