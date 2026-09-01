import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  findSiteContentSlot,
  resolveSiteContentSpacingClass,
  resolveSiteContentTextClass,
  type SiteContentPageId,
  type SiteContentSpacing,
  type SiteContentTextSize,
} from "@shared/site-content";
import { createContext, useContext, useMemo, type ReactNode } from "react";

type ResolvedOverride = { text: string | null; textSize: string | null; spacing: string | null };
type SiteContentValue = { overrides: Map<string, ResolvedOverride> };

const SiteContentContext = createContext<SiteContentValue>({ overrides: new Map() });

/**
 * Loads one page's admin overrides and shares them with every slot below.
 *
 * Failures are deliberately silent: content overrides are cosmetic, so a page
 * that cannot reach the API renders the copy shipped in code rather than an
 * error. Nothing here can remove a section - a slot with no override, or an
 * override the registry no longer knows, falls back to the code default.
 */
export function SiteContentProvider({ page, children }: { page: SiteContentPageId; children: ReactNode }) {
  const query = trpc.siteContent.list.useQuery({ page }, { retry: false, staleTime: 60_000 });

  const value = useMemo<SiteContentValue>(() => {
    const overrides = new Map<string, ResolvedOverride>();
    for (const row of query.data ?? []) {
      overrides.set(row.slotId, { text: row.text ?? null, textSize: row.textSize ?? null, spacing: row.spacing ?? null });
    }
    return { overrides };
  }, [query.data]);

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

function useOverride(slotId: string) {
  return useContext(SiteContentContext).overrides.get(slotId);
}

/** The published text for a slot: the admin override, else the code default. */
export function useSiteContentText(slotId: string, fallback?: string) {
  const override = useOverride(slotId);
  const slot = findSiteContentSlot(slotId);
  return override?.text?.trim() || slot?.defaultText || fallback || "";
}

/** The size class for a slot, walked from its default by the admin's step. */
export function useSiteContentTextClass(slotId: string, fallback: string) {
  const override = useOverride(slotId);
  const slot = findSiteContentSlot(slotId);
  if (!slot) return fallback;
  return resolveSiteContentTextClass(slot, override?.textSize as SiteContentTextSize | null);
}

export function useSiteContentSpacingClass(slotId: string) {
  const override = useOverride(slotId);
  return resolveSiteContentSpacingClass(override?.spacing as SiteContentSpacing | null);
}

/**
 * Renders one editable text slot as a component rather than a hook, so it can
 * be used inside a `.map()` where a hook call would break the rules of hooks.
 *
 * `className` carries the styling the call site already applied (colour,
 * weight); the resolved size class is merged on top so an admin's size step
 * wins over the default without losing the rest of the design.
 */
export function SiteText({ slotId, fallback, className }: { slotId: string; fallback?: string; className?: string }) {
  const text = useSiteContentText(slotId, fallback);
  const sizeClass = useSiteContentTextClass(slotId, "");
  return <span className={cn(className, sizeClass)}>{text}</span>;
}
