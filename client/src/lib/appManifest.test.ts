// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { appManifestKindFor, applyAppManifest } from "./appManifest";

function page() {
  const doc = document.implementation.createHTMLDocument("t");
  doc.head.innerHTML = `
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
    <meta name="apple-mobile-web-app-title" content="Connect Tutors" />`;
  return doc;
}
const tags = (doc: Document) => ({
  manifest: doc.querySelector('link[rel="manifest"]')?.getAttribute("href"),
  icon: doc.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href"),
  title: doc.querySelector('meta[name="apple-mobile-web-app-title"]')?.getAttribute("content"),
});

describe("appManifestKindFor", () => {
  it("gives the Admin app to every Admin page and the site to everything else", () => {
    for (const path of ["/admin", "/admin/login", "/admin/dynamic/limits", "/admin/applied-tutors/12"]) expect(appManifestKindFor(path), path).toBe("admin");
    for (const path of ["/", "/auth", "/tutor/dashboard", "/guardian/dashboard/profile", "/administrator", "/adminx/login", "/job-board"]) expect(appManifestKindFor(path), path).toBe("site");
  });
});

describe("applyAppManifest", () => {
  it("points the manifest, the Home Screen icon and the Home Screen name at the Admin app", () => {
    const doc = page();

    applyAppManifest(doc, "admin");

    expect(tags(doc)).toEqual({ manifest: "/admin.webmanifest", icon: "/admin-apple-touch-icon-180x180.png", title: "CT Admin" });
  });

  it("points them back at the site when the visitor leaves the Admin pages", () => {
    const doc = page();
    applyAppManifest(doc, "admin");

    applyAppManifest(doc, "site");

    expect(tags(doc)).toEqual({ manifest: "/manifest.webmanifest", icon: "/apple-touch-icon-180x180.png", title: "Connect Tutors" });
  });

  it("leaves alone a tag the page does not have", () => {
    const doc = document.implementation.createHTMLDocument("t");

    expect(() => applyAppManifest(doc, "admin")).not.toThrow();
    expect(doc.head.querySelectorAll("link, meta")).toHaveLength(0);
  });
});
