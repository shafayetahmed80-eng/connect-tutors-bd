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
const ink = (percent: number) => `color-mix(in srgb, var(--j-ink) ${percent}%, transparent)`;

/**
 * The soft shadow a dialog carries. One dial keeps it in proportion: the offset
 * and reach follow the blur, so the shipped 48 gives back exactly
 * `0 24px 48px -24px`. The Modals preview draws with the same one.
 */
export function modalShadow(limits: SiteLimitValues): string {
  const blur = limits["modal.shadowBlur"];
  return `0 ${blur / 2}px ${blur}px -${blur / 2}px ${ink(limits["modal.shadowOpacity"])}`;
}

/** The least a `fit` panel stands, so a one-line list does not shrink to a strip. */
export const FIT_PANEL_MIN_HEIGHT_PX = 420;

/** The height a panel stands on a window this tall: 86% of it, but never past the Owner's number. */
export function modalPanelHeight(limits: SiteLimitValues, windowHeight: number): number {
  return Math.min(windowHeight * 0.86, limits["modal.height.panel"]);
}

export function buildSiteDimensionCss(limits: SiteLimitValues): string {
  const radius = `${limits["modal.radius"]}px`;
  const motion = `${limits["modal.motionMs"]}ms`;
  const card = limits["jobCard.textSize"];
  const details = limits["jobDetails.textSize"];
  // The dialog a job card opens, told apart from every other dialog by the kind it tags itself with.
  const job = `[data-modal-kind="job-details"]`;

  return [
    "[data-modal-backdrop] {",
    `  background-color: ${ink(limits["modal.backdropOpacity"])};`,
    `  animation-duration: ${motion};`,
    "}",
    "[data-modal-size] {",
    `  animation-duration: ${motion};`,
    `  box-shadow: ${modalShadow(limits)};`,
    // A sheet sits on the bottom edge of a phone, so only its top corners round.
    `  border-top-left-radius: ${radius};`,
    `  border-top-right-radius: ${radius};`,
    "}",
    "@media (min-width: 640px) {",
    `  [data-modal-size] { border-radius: ${radius}; max-height: min(92vh, ${limits["modal.height.panel"]}px); }`,
    // A dialog is as tall as what it says. A panel stands one height whatever it
    // holds, so a short form and a long one line up when they are opened in turn.
    `  [data-modal-size="dialog"] { max-width: ${limits["modal.width.dialog"]}px; }`,
    `  [data-modal-size="panel"] { max-width: ${limits["modal.width.panel"]}px; height: min(86vh, ${limits["modal.height.panel"]}px); }`,
    // The few panels that are only a short read follow their content instead, between a floor and the panel height.
    `  [data-modal-size="panel"][data-modal-fit] { height: auto; min-height: min(${FIT_PANEL_MIN_HEIGHT_PX}px, 86vh); max-height: min(86vh, ${limits["modal.height.panel"]}px); }`,
    "}",
    // Single-line controls only. A text box grows with what is typed and keeps
    // its own class, so it is not matched here.
    `.modal-field-profile { height: ${limits["modal.fieldHeight.profile"]}px; }`,
    // A phone is tapped, not clicked, so it has its own height; the one above
    // takes over again from where the dialog stops being a sheet.
    `@media (max-width: 639px) { .modal-field-profile { height: ${limits["modal.fieldHeight.profilePhone"]}px; } }`,
    // Pickers that grow a line per row of chosen chips can take only a floor.
    `:root { --profile-field-height: ${limits["modal.fieldHeight.profile"]}px; --profile-field-height-phone: ${limits["modal.fieldHeight.profilePhone"]}px; }`,
    `.modal-field-journey { height: ${limits["modal.fieldHeight.journey"]}px; }`,
    // The letters inside a box, kept apart from the box's own height above -
    // one is type, the other is layout. Covers text areas too, which the
    // height rule above deliberately does not.
    `.input-text-profile { font-size: ${limits["inputText.profile"]}px; }`,
    `.input-text-journey { font-size: ${limits["inputText.journey"]}px; }`,
    // A box's own corner rounding, kept apart from its text size above - one
    // is shape, the other is type. Harmless on the value-icon spans that also
    // carry this class, since they draw no border or fill of their own.
    `.input-text-profile { border-radius: ${limits["inputRadius.profile"]}px; }`,
    `.input-text-journey { border-radius: ${limits["inputRadius.journey"]}px; }`,
    // A value-matching icon inside a box (a location pin, a category glyph)
    // is sized in `em`, so it tracks that same font-size - large in a big
    // field, small in a dense one - instead of sitting fixed while the text
    // around it moves. Lucide sets width/height as attributes, which a CSS
    // property always outranks regardless of where the marker class lands:
    // on the icon's own <svg>, or on a box it shares with the field.
    `.input-text-profile svg, svg.input-text-profile { width: 1em; height: 1em; }`,
    `.input-text-journey svg, svg.input-text-journey { width: 1em; height: 1em; }`,
    // The dashboard shell's own shapes, apart from a dialog (Modals above)
    // and an input box (Input Field Text above): the sidebar's highlighted
    // row, the two differently-shaped profile tab bars, and every section
    // or group card.
    `.nav-item { border-radius: ${limits["nav.itemRadius"]}px; }`,
    `.nav-tab-outer { border-radius: ${limits["nav.tabRadius"]}px; }`,
    `.nav-pill-tab { border-radius: ${limits["nav.pillTabRadius"]}px; }`,
    `.nav-section-card { border-radius: ${limits["nav.sectionRadius"]}px; }`,
    // The shared Button component's "ordinary" case only - `data-size` names
    // it, so an icon-only button or one explicitly given sm/lg keeps the size
    // it was given on purpose. Two attribute selectors outrank the single
    // Tailwind class (text-sm) still sitting in the component's shared base
    // string, which is what lets this win without editing that string.
    `[data-slot="button"][data-size="default"] { font-size: ${limits["button.textSize"]}px; height: ${limits["button.height"]}px; padding-left: ${limits["button.paddingX"]}px; padding-right: ${limits["button.paddingX"]}px; }`,
    // The Guardian journey's own primary/ghost buttons - a separate
    // vocabulary from the shared Button above, not built on it.
    `.journey-button { font-size: ${limits["journeyButton.textSize"]}px; height: ${limits["journeyButton.height"]}px; padding-left: ${limits["journeyButton.paddingX"]}px; padding-right: ${limits["journeyButton.paddingX"]}px; }`,
    // The lettering on a job card. One number, the ordinary text; the title and
    // the New badge keep their distance from it - 2px above, 1px below - so the
    // card reads the same at any size. The foot holds buttons and links passed
    // in by each panel, so it is set as a whole rather than piece by piece.
    // Icons are sized in `em`, so they follow the text instead of staying put.
    `.job-card-title { font-size: ${card + 2}px; }`,
    `.job-card-text, .job-card-footer, .job-card-footer * { font-size: ${card}px; }`,
    `.job-card-small { font-size: ${card - 1}px; }`,
    `.job-card svg { width: 1.08em; height: 1.08em; }`,
    // The dialog a card opens, with its own number: the rows, the line under the
    // title and the notes at that size, the title 5px above, the buttons 1px
    // above. The two spans-and-paragraphs rules come before the buttons' so that
    // a span inside a button takes the button's size, not the row's.
    `${job} [data-modal-title] { font-size: ${details + 5}px; }`,
    `${job} [data-modal-meta], ${job} [data-modal-body] :is(p, span, a, strong, dt, dd, li, td, th), ${job} [data-modal-footer] :is(p, span) { font-size: ${details}px; }`,
    `${job} [data-modal-footer] :is(button, a), ${job} [data-modal-footer] :is(button, a) * { font-size: ${details + 1}px; }`,
    `${job} :is([data-modal-body], [data-modal-footer]) svg { width: 1.1em; height: 1.1em; }`,
  ].join("\n");
}

export function SiteDimensionStyle() {
  const resolved = trpc.siteLimits.resolved.useQuery();
  // The shipped numbers until the stored ones arrive, so nothing reflows from
  // an unstyled first paint.
  return <style>{buildSiteDimensionCss(resolved.data ?? defaultSiteLimits())}</style>;
}
