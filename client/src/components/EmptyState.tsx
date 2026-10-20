import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import React from "react";

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  variant?: "primary" | "secondary";
}

export interface EmptyStateProps {
  icon?: LucideIcon | React.ReactNode;
  kicker?: string;
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  hint?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

/**
 * Reusable, responsive, and semantic Empty State presentation with a soft floating icon,
 * breathing ambient halo, clear typography, and action triggers.
 */
export default function EmptyState({
  icon: Icon = Inbox,
  kicker,
  title,
  description,
  action,
  secondaryAction,
  hint,
  compact = false,
  className = "",
}: EmptyStateProps) {
  const renderAction = (act: EmptyStateAction, isPrimary = true) => {
    const isActuallyPrimary = act.variant ? act.variant === "primary" : isPrimary;
    const baseClasses = isActuallyPrimary
      ? "motion-interactive inline-flex min-h-10 items-center justify-center rounded-xl bg-j-accent px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-j-accent-hover hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent"
      : "motion-interactive inline-flex min-h-10 items-center justify-center rounded-xl border border-[#c9e2f2] bg-white px-4 py-2 text-sm font-bold text-j-accent shadow-xs transition hover:bg-[#f4f9fd] hover:border-j-accent active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-j-accent";

    if (act.href) {
      return (
        <a
          key={act.label}
          href={act.href}
          target={act.external ? "_blank" : undefined}
          rel={act.external ? "noreferrer" : undefined}
          data-ripple="true"
          className={baseClasses}
        >
          {act.label}
        </a>
      );
    }

    return (
      <button
        key={act.label}
        type="button"
        onClick={act.onClick}
        data-ripple="true"
        className={baseClasses}
      >
        {act.label}
      </button>
    );
  };

  return (
    <div
      role="status"
      className={`rounded-xl border border-dashed border-[#c9dce8] bg-[radial-gradient(ellipse_at_top,#effaff,white_68%)] text-center transition-all ${
        compact ? "px-4 py-7" : "px-6 py-12"
      } ${className}`}
    >
      <div className="relative mx-auto mb-3.5 flex items-center justify-center">
        {/* Soft glowing ambient halo pulse */}
        <div
          aria-hidden="true"
          className={`empty-halo-pulse absolute rounded-full bg-gradient-to-tr from-[#cfe8f7]/70 to-[#eaf5fc]/80 blur-md ${
            compact ? "size-14" : "size-20"
          }`}
        />
        {/* Floating icon orb */}
        <div
          data-testid="empty-state-icon-container"
          className={`empty-float relative grid place-items-center rounded-xl border border-[#cfe8f7]/80 bg-white shadow-[0_8px_20px_rgba(22,125,221,.10)] ${
            compact ? "size-11" : "size-14"
          }`}
        >
          {React.isValidElement(Icon) ? (
            Icon
          ) : typeof Icon === "function" ? (
            <Icon className={`text-j-accent ${compact ? "size-5" : "size-7"}`} aria-hidden="true" />
          ) : null}
        </div>
      </div>

      {kicker ? (
        <p className="mb-1 text-2xs font-extrabold uppercase tracking-[0.16em] text-[#4c9ed8]">
          {kicker}
        </p>
      ) : null}

      <h3 className={`font-extrabold text-j-ink ${compact ? "text-base" : "text-lg"}`}>
        {title}
      </h3>

      {description ? (
        <p
          className={`mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#5c7a8f] ${
            compact ? "max-w-sm text-xs" : ""
          }`}
        >
          {description}
        </p>
      ) : null}

      {action || secondaryAction ? (
        <div className="mx-auto mt-5 flex max-w-md flex-wrap items-center justify-center gap-3">
          {action ? renderAction(action, true) : null}
          {secondaryAction ? renderAction(secondaryAction, false) : null}
        </div>
      ) : null}

      {hint ? (
        <div className="mt-4 flex items-center justify-center text-xs font-semibold text-[#6b899d]">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
