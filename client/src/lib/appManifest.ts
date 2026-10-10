/**
 * Which app a page offers to install. The Admin panel has an app of its own - its own
 * name, icon and starting page (public/admin.webmanifest) - so that the Admin's
 * Home Screen icon opens the panel and not the public site. Every other page carries
 * the site's. index.html makes the choice before the browser reads the page's manifest;
 * this keeps it right as the visitor moves between the two without reloading.
 */
export type AppManifestKind = "site" | "admin";

const apps = {
  site: { manifest: "/manifest.webmanifest", touchIcon: "/apple-touch-icon-180x180.png", title: "Connect Tutors" },
  admin: { manifest: "/admin.webmanifest", touchIcon: "/admin-apple-touch-icon-180x180.png", title: "CT Admin" },
} as const;

export function appManifestKindFor(pathname: string): AppManifestKind {
  return pathname === "/admin" || pathname.startsWith("/admin/") ? "admin" : "site";
}

/** Points the page's manifest link, Home Screen icon and Home Screen name at one of the two apps; a tag the page does not carry is left alone. */
export function applyAppManifest(doc: Document, kind: AppManifestKind) {
  const app = apps[kind];
  doc.querySelector('link[rel="manifest"]')?.setAttribute("href", app.manifest);
  doc.querySelector('link[rel="apple-touch-icon"]')?.setAttribute("href", app.touchIcon);
  doc.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute("content", app.title);
}
