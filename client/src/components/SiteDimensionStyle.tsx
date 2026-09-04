import { trpc } from "@/lib/trpc";
import { defaultSiteLimits, type SiteLimitValues } from "@shared/site-limits";

/**
 * Turns the Owner's dialog settings into CSS, once for the whole app.
 *
 * Everything here is a rule rather than an inline style, for two reasons. A
 * dialog is a full-width sheet on a phone whatever the desktop width says, so
 * the widths have to sit inside a media query and a style attribute cannot
 * carry one. And the shell should not have to read settings to draw itself:
 * it tags what it is - `data-modal-backdrop`, `data-modal-size` - and this
 * decides what that looks like.
 *
 * The matching Tailwind classes are deliberately absent from the shell, so
 * nothing here is fighting a utility for the same property.
 */
export function buildSiteDimensionCss(limits: SiteLimitValues): string {
  const radius = `${limits["modal.radius"]}px`;
  const motion = `${limits["modal.motionMs"]}ms`;
  // One dial keeps the shadow in proportion: the offset and reach follow the
  // blur, so the shipped 48 gives back exactly `0 24px 48px -24px`.
  const blur = limits["modal.shadowBlur"];
  const ink = (percent: number) => `color-mix(in srgb, var(--j-ink) ${percent}%, transparent)`;

  return [
    "[data-modal-backdrop] {",
    `  background-color: ${ink(limits["modal.backdropOpacity"])};`,
    `  animation-duration: ${motion};`,
    "}",
    "[data-modal-size] {",
    `  animation-duration: ${motion};`,
    `  box-shadow: 0 ${blur / 2}px ${blur}px -${blur / 2}px ${ink(limits["modal.shadowOpacity"])};`,
    // A sheet sits on the bottom edge of a phone, so only its top corners round.
    `  border-top-left-radius: ${radius};`,
    `  border-top-right-radius: ${radius};`,
    "}",
    "@media (min-width: 640px) {",
    `  [data-modal-size] { border-radius: ${radius}; max-height: min(92vh, ${limits["modal.maxHeight"]}px); }`,
    `  [data-modal-size="sm"] { max-width: ${limits["modal.width.sm"]}px; }`,
    `  [data-modal-size="md"] { max-width: ${limits["modal.width.md"]}px; }`,
    `  [data-modal-size="lg"] { max-width: ${limits["modal.width.lg"]}px; }`,
    "}",
    // Single-line controls only. A text box grows with what is typed and keeps
    // its own class, so it is not matched here.
    `.modal-field-profile { height: ${limits["modal.fieldHeight.profile"]}px; }`,
    `.modal-field-journey { height: ${limits["modal.fieldHeight.journey"]}px; }`,
    // The letters inside a box, kept apart from the box's own height above -
    // one is type, the other is layout. Covers text areas too, which the
    // height rule above deliberately does not.
    `.input-text-profile { font-size: ${limits["inputText.profile"]}px; }`,
    `.input-text-journey { font-size: ${limits["inputText.journey"]}px; }`,
    // A value-matching icon inside a box (a location pin, a category glyph)
    // is sized in `em`, so it tracks that same font-size - large in a big
    // field, small in a dense one - instead of sitting fixed while the text
    // around it moves. Lucide sets width/height as attributes, which a CSS
    // property always outranks regardless of where the marker class lands:
    // on the icon's own <svg>, or on a box it shares with the field.
    `.input-text-profile svg, svg.input-text-profile { width: 1em; height: 1em; }`,
    `.input-text-journey svg, svg.input-text-journey { width: 1em; height: 1em; }`,
    // The shared Button component's "ordinary" case only - `data-size` names
    // it, so an icon-only button or one explicitly given sm/lg keeps the size
    // it was given on purpose. Two attribute selectors outrank the single
    // Tailwind class (text-sm) still sitting in the component's shared base
    // string, which is what lets this win without editing that string.
    `[data-slot="button"][data-size="default"] { font-size: ${limits["button.textSize"]}px; height: ${limits["button.height"]}px; padding-left: ${limits["button.paddingX"]}px; padding-right: ${limits["button.paddingX"]}px; }`,
    // The Guardian journey's own primary/ghost buttons - a separate
    // vocabulary from the shared Button above, not built on it.
    `.journey-button { font-size: ${limits["journeyButton.textSize"]}px; height: ${limits["journeyButton.height"]}px; padding-left: ${limits["journeyButton.paddingX"]}px; padding-right: ${limits["journeyButton.paddingX"]}px; }`,
  ].join("\n");
}

export function SiteDimensionStyle() {
  const resolved = trpc.siteLimits.resolved.useQuery();
  // The shipped numbers until the stored ones arrive, so nothing reflows from
  // an unstyled first paint.
  return <style>{buildSiteDimensionCss(resolved.data ?? defaultSiteLimits())}</style>;
}
