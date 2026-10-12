/**
 * A WhatsApp mark in the site's line-icon style: a speech bubble with a handset
 * inside it, drawn in `currentColor` like every other icon here, so the colour,
 * the hover and the disabled state come from the text around it.
 *
 * Lucide has no brand icons, and its plain speech bubble (the header's WhatsApp
 * button) does not say WhatsApp to someone who has not been told. The handset
 * does. Both shapes are Lucide's own, the handset scaled into the bubble.
 */
export function WhatsAppIcon({ size = 18, className }: { size?: number; className?: string }) {
  return <svg
    aria-hidden="true"
    focusable="false"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path strokeWidth={1.75} d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    <path
      transform="translate(7.2 7.2) scale(.4)"
      strokeWidth={3.6}
      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
    />
  </svg>;
}
