/**
 * The live site, for anything that is printed or shared outside the app — a
 * Facebook poster, a QR code. It is a constant on purpose: a poster made on a
 * laptop at localhost or on a staging copy must still send people to the real
 * site. The server's own copy is `PUBLIC_SITE_URL` (server/_core/env.ts).
 */
export const PUBLIC_SITE_ORIGIN = "https://connecttutorsbd.com";

/** The same address the way a person reads and types it. */
export const PUBLIC_SITE_HOST = "connecttutorsbd.com";
