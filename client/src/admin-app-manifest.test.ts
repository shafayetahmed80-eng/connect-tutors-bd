// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { applyAppManifest } from "./lib/appManifest";

const publicDir = resolve(__dirname, "../public");
const manifest = JSON.parse(readFileSync(resolve(publicDir, "admin.webmanifest"), "utf8")) as {
  name: string;
  short_name: string;
  id: string;
  start_url: string;
  scope: string;
  display: string;
  icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
};

describe("the Admin app's manifest", () => {
  it("is an app of its own, apart from the site's, that opens in the Admin panel", () => {
    expect(manifest.id).toBe("/admin");
    expect(manifest.scope).toBe("/admin/");
    expect(manifest.start_url.startsWith(manifest.scope)).toBe(true);
    expect(manifest.start_url).toBe("/admin/login");
    expect(manifest.display).toBe("standalone");
    expect(manifest.name).not.toBe("Connect Tutors");
  });

  it("names icons that exist, at the sizes they claim, including one for a maskable tile", () => {
    for (const icon of manifest.icons) {
      const file = resolve(publicDir, icon.src.replace(/^\//, ""));
      expect(existsSync(file), icon.src).toBe(true);
      const png = readFileSync(file);
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.src).toBe(icon.sizes);
    }
    expect(manifest.icons.some(icon => icon.purpose === "maskable")).toBe(true);
    expect(manifest.icons.some(icon => icon.sizes === "192x192")).toBe(true);
    expect(manifest.icons.some(icon => icon.sizes === "512x512" && !icon.purpose)).toBe(true);
  });

  it("has a Home Screen icon for iPhone that exists too", () => {
    expect(existsSync(resolve(publicDir, "admin-apple-touch-icon-180x180.png"))).toBe(true);
  });
});

describe("the choice index.html makes before the app starts", () => {
  const html = readFileSync(resolve(__dirname, "../index.html"), "utf8");
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];

  function pageAt(pathname: string) {
    const doc = document.implementation.createHTMLDocument("t");
    doc.head.innerHTML = `
      <link rel="manifest" href="/manifest.webmanifest" />
      <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
      <meta name="apple-mobile-web-app-title" content="Connect Tutors" />`;
    // The script reads the page's own `location` and `document`; hand it these.
    new Function("location", "document", script!)({ pathname }, doc);
    return doc;
  }
  const snapshot = (doc: Document) => doc.head.innerHTML;

  it("has an inline script, ahead of the module that starts the app", () => {
    expect(script).toBeTruthy();
    expect(html.indexOf("<script>")).toBeLessThan(html.indexOf('<script type="module"'));
  });

  it("sets exactly what the app sets once it is running, on an Admin page", () => {
    const fromScript = pageAt("/admin/login");
    const fromApp = document.implementation.createHTMLDocument("t");
    fromApp.head.innerHTML = fromScript.head.innerHTML.replace("/admin.webmanifest", "/manifest.webmanifest").replace("/admin-apple-touch-icon-180x180.png", "/apple-touch-icon-180x180.png").replace("CT Admin", "Connect Tutors");
    applyAppManifest(fromApp, "admin");

    expect(snapshot(fromScript)).toBe(snapshot(fromApp));
    expect(fromScript.querySelector('link[rel="manifest"]')?.getAttribute("href")).toBe("/admin.webmanifest");
  });

  it("changes nothing on any other page", () => {
    for (const path of ["/", "/auth", "/tutor/dashboard", "/administrator"]) {
      const doc = pageAt(path);
      expect(doc.querySelector('link[rel="manifest"]')?.getAttribute("href"), path).toBe("/manifest.webmanifest");
      expect(doc.querySelector('meta[name="apple-mobile-web-app-title"]')?.getAttribute("content"), path).toBe("Connect Tutors");
    }
  });
});
