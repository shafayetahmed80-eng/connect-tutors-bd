import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Menu, Phone, UserRound, X } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";

const navItems = [
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

export function getPublicAccountNavigation(user: { role?: string } | null | undefined) {
  return user ? { href: "/account", label: "Account" } : { href: "/login", label: "Sign in" };
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

function AccountMenu({
  user,
  loading,
  logout,
  mobile = false,
  publicMarketing = false,
}: {
  user: { role?: string } | null | undefined;
  loading: boolean;
  logout: () => Promise<void>;
  mobile?: boolean;
  publicMarketing?: boolean;
}) {
  if (loading) {
    return <span className={mobile ? "mobile-account-status" : "account-status"}>Checking account…</span>;
  }

  if (publicMarketing) {
    const navigation = getPublicAccountNavigation(user);
    return <Link href={navigation.href} className={mobile ? "mobile-menu-link" : "header-sign-in"}><UserRound size={mobile ? 16 : 14} />{navigation.label}</Link>;
  }

  if (!user) {
    return (
      <Link href="/login" className={mobile ? "mobile-menu-link" : "header-sign-in"}>
        <UserRound size={mobile ? 16 : 14} />
        Sign In
      </Link>
    );
  }

  return (
    <>
      <Link href="/account" className={mobile ? "mobile-menu-link" : "header-account-link"}>
        <UserRound size={mobile ? 16 : 14} />
        {user.role === "tutor" ? "Tutor account" : user.role === "admin" ? "Admin account" : "Guardian account"}
      </Link>
      <button type="button" className={mobile ? "mobile-menu-link mobile-menu-button" : "account-status account-button"} onClick={() => void logout()}>
        Log out
      </button>
    </>
  );
}

export default function SiteHeader({
  variant = "default",
  journeyAudience = "guardian",
}: {
  variant?: "default" | "journey";
  journeyAudience?: JourneyAudience;
}) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const isJourneyHeader = variant === "journey";
  const isPublicMarketingRoute = !isJourneyHeader && !location.startsWith("/admin") && !location.startsWith("/tutor/dashboard") && location !== "/account";
  const journeyNavigation = getJourneyNavigation(journeyAudience);

  useEffect(() => setOpen(false), [location]);

  return (
    <header className={`site-header${isJourneyHeader ? " journey-site-header" : ""}`}>
      <div className={isJourneyHeader ? "journey-contact-bar" : "microbar"}>
        <div className="shell microbar-inner">
          <div className="contact-actions">
            <a href="tel:+8801516131411" className="phone-link">
              <Phone size={14} />
              <span>+880 1516 131411</span>
            </a>
            <a
              href="https://wa.me/8801516131411"
              className="whatsapp-link"
              target="_blank"
              rel="noreferrer"
              aria-label="Message Connect Tutors BD on WhatsApp"
              title="Message us on WhatsApp"
            >
              <FaWhatsapp size={16} aria-hidden="true" />
            </a>
          </div>
          {isJourneyHeader ? (
            <Link href="/contact" className="journey-help-link">Need help? Contact us</Link>
          ) : (
            <div className="microbar-account">
              <AccountMenu user={user} loading={loading} logout={logout} publicMarketing={isPublicMarketingRoute} />
            </div>
          )}
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
              {user?.role === "admin" && !isPublicMarketingRoute ? <Link href="/admin/matching" className="mobile-menu-link"><LayoutDashboard size={16} /> Admin Dashboard</Link> : null}
              <Link href="/become-tutor" className="mobile-menu-link mobile-tutor-link">Become a Tutor</Link>
              <AccountMenu user={user} loading={loading} logout={logout} mobile publicMarketing={isPublicMarketingRoute} />
            </>
          )}
        </nav>
      )}
    </header>
  );
}
