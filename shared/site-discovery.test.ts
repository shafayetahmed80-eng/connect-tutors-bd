import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildRobotsTxt, buildSitemapXml, isCanonicalHost, robotsDisallowedPaths, sitemapPaths } from "./site-discovery";

const SITE = "https://connecttutorsbd.com";

describe("which pages a search engine is pointed at", () => {
  it("lists only pages the app really serves", () => {
    const app = readFileSync(fileURLToPath(new URL("../client/src/App.tsx", import.meta.url)), "utf8");
    for (const path of sitemapPaths) expect(app, `${path} is not a route in App.tsx`).toContain(`path="${path}"`);
  });

  it("never lists a page it also asks engines to stay out of", () => {
    for (const listed of sitemapPaths) {
      const blocked = robotsDisallowedPaths.some(rule => listed.startsWith(rule));
      expect(blocked, `${listed} is listed and blocked`).toBe(false);
    }
  });

  it("keeps every private panel, sign-in and reset page out", () => {
    // A robots.txt rule is a prefix, so "/login" also keeps out "/login-verify".
    const blocks = (path: string) => robotsDisallowedPaths.some(rule => path.startsWith(rule));
    for (const path of ["/admin/dashboard", "/guardian/dashboard/hire", "/tutor/dashboard", "/tutor/login", "/auth", "/login", "/login-verify", "/account", "/forgot-password", "/reset-password/abc", "/verify/CL-1/xyz", "/api/trpc", "/manus-storage/a.png"]) {
      expect(blocks(path), path).toBe(true);
    }
  });
});

describe("robots.txt", () => {
  it("lists the private paths and points at the sitemap on the published address", () => {
    const text = buildRobotsTxt(SITE, true);
    expect(text.startsWith("User-agent: *\n")).toBe(true);
    for (const path of robotsDisallowedPaths) expect(text).toContain(`Disallow: ${path}\n`);
    expect(text).toContain(`Sitemap: ${SITE}/sitemap.xml`);
    expect(text).not.toContain("Disallow: /\n");
  });

  it("closes everything off anywhere but the published address", () => {
    expect(buildRobotsTxt(SITE, false)).toBe("User-agent: *\nDisallow: /\n");
  });
});

describe("sitemap.xml", () => {
  it("gives every listed page its full address", () => {
    const xml = buildSitemapXml(SITE);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    for (const path of sitemapPaths) expect(xml).toContain(`<loc>${SITE}${path}</loc>`);
    expect(xml).not.toContain("/admin");
    expect(xml).not.toContain("/blogs");
  });

  it("escapes anything that would break the XML", () => {
    expect(buildSitemapXml("https://example.com/?a=1&b=2")).toContain("a=1&amp;b=2");
  });
});

describe("the published address", () => {
  it("is the configured domain, with or without www and a port", () => {
    expect(isCanonicalHost("connecttutorsbd.com", SITE)).toBe(true);
    expect(isCanonicalHost("www.connecttutorsbd.com", SITE)).toBe(true);
    expect(isCanonicalHost("CONNECTTUTORSBD.COM:443", SITE)).toBe(true);
  });

  it("is not staging, a laptop, a look-alike, or nothing at all", () => {
    expect(isCanonicalHost("staging.connecttutorsbd.com", SITE)).toBe(false);
    expect(isCanonicalHost("localhost:3000", SITE)).toBe(false);
    expect(isCanonicalHost("connecttutorsbd.com.evil.example", SITE)).toBe(false);
    expect(isCanonicalHost(undefined, SITE)).toBe(false);
    expect(isCanonicalHost("connecttutorsbd.com", "not a url")).toBe(false);
  });
});
