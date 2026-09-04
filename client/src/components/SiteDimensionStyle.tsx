import { trpc } from "@/lib/trpc";
import { defaultSiteLimits, type SiteLimitValues } from "@shared/site-limits";

/**
 * Turns the Owner's dialog sizes into CSS, once for the whole app.
 *
 * Inline styles cannot carry a media query, and a dialog is a full-width sheet
 * on a phone whatever the desktop width is set to - so the widths have to live
 * in a real stylesheet rather than on the element. This renders that sheet from
 * the stored numbers, and the shell only tags itself with `data-modal-size`.
 *
 * Field heights apply to single-line controls. A textarea grows with what is
 * typed and carries its own class, so it is deliberately not matched here.
 */
export function buildSiteDimensionCss(limits: SiteLimitValues): string {
  return [
    "@media (min-width: 640px) {",
    `  [data-modal-size="sm"] { max-width: ${limits["modal.width.sm"]}px; }`,
    `  [data-modal-size="md"] { max-width: ${limits["modal.width.md"]}px; }`,
    `  [data-modal-size="lg"] { max-width: ${limits["modal.width.lg"]}px; }`,
    `  [data-modal-size] { max-height: min(92vh, ${limits["modal.maxHeight"]}px); }`,
    "}",
    `.modal-field-profile { height: ${limits["modal.fieldHeight.profile"]}px; }`,
    `.modal-field-journey { height: ${limits["modal.fieldHeight.journey"]}px; }`,
  ].join("\n");
}

export function SiteDimensionStyle() {
  const resolved = trpc.siteLimits.resolved.useQuery();
  // The shipped numbers until the stored ones arrive, so nothing reflows from
  // an unstyled first paint.
  return <style>{buildSiteDimensionCss(resolved.data ?? defaultSiteLimits())}</style>;
}
