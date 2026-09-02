import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  findSiteContentAnchor,
  findSiteContentSlot,
  normalizeSiteContactNumber,
  telHref,
  whatsappHref,
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
  // Providers nest: the site-wide one wraps the whole app, and a page adds its
  // own inside it. Merging rather than replacing keeps the header and footer's
  // site slots working on a page that has a provider of its own.
  const parent = useContext(SiteContentContext);

  const value = useMemo<SiteContentValue>(() => {
    const overrides = new Map(parent.overrides);
    for (const row of query.data ?? []) {
      overrides.set(row.slotId, { text: row.text ?? null, textSize: row.textSize ?? null, spacing: row.spacing ?? null });
    }
    return { overrides };
  }, [query.data, parent]);

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

const blockToneClasses: Record<string, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
};

/**
 * Renders the Admin's notice blocks for one anchor.
 *
 * Renders nothing at all when there are no blocks, so an untouched page is
 * unchanged. Body text is placed as plain text, never as HTML, so an Admin
 * cannot inject markup or script into a page every visitor sees.
 */
export function SiteBlocks({ anchorId, className }: { anchorId: string; className?: string }) {
  const anchor = findSiteContentAnchor(anchorId);
  const query = trpc.siteContent.listBlocks.useQuery(
    { page: anchor?.page ?? "tutor-profile" },
    { retry: false, staleTime: 60_000, enabled: Boolean(anchor) },
  );
  // An anchor the registry no longer declares renders nothing, so retiring one
  // in code cannot leave orphaned blocks on the page.
  const blocks = anchor ? (query.data ?? []).filter(block => block.anchorId === anchorId) : [];
  if (blocks.length === 0) return null;

  return <div className={cn("space-y-2", className)}>
    {blocks.map(block => <section key={block.id} className={cn("rounded-2xl border p-3 text-sm leading-6", blockToneClasses[block.tone] ?? blockToneClasses.info)}>
      {block.heading ? <p className="font-bold">{block.heading}</p> : null}
      {block.body ? <p className={block.heading ? "mt-1 whitespace-pre-line" : "whitespace-pre-line"}>{block.body}</p> : null}
    </section>)}
  </div>;
}

/**
 * The support number and the links built from it.
 *
 * Every caller goes through this rather than writing a wa.me or tel: URL, so
 * changing the number in the Admin panel reaches all of them. The stored value
 * is normalized before use, so a number entered with spaces or a leading 0
 * still produces a working link.
 */
export function useSiteContact() {
  const raw = useSiteContentText("site.contact.whatsapp");
  const number = normalizeSiteContactNumber(raw);
  return {
    number,
    display: `+${number}`,
    tel: telHref(number),
    whatsapp: (message?: string) => whatsappHref(number, message),
  };
}
