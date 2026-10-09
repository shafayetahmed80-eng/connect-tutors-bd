import { describe, expect, it } from "vitest";
import { sitemapPaths } from "./site-discovery";
import { canonicalUrl, defaultSeoPage, findSeoPage, organizationJsonLd, seoPages, seoTitleFor } from "./seo";

const SITE = "https://connecttutorsbd.com";
const BANGLA = /[ঀ-৿]/;

describe("what each public page says to a search engine", () => {
  it("covers exactly the pages the sitemap lists, so none is told apart from the rest by accident", () => {
    expect(seoPages.map(page => page.path).sort()).toEqual([...sitemapPaths].sort());
  });

  it("gives every page its own title and its own description", () => {
    expect(new Set(seoPages.map(page => page.title)).size).toBe(seoPages.length);
    expect(new Set(seoPages.map(page => page.description)).size).toBe(seoPages.length);
    for (const page of seoPages) expect(page.title).not.toBe(defaultSeoPage.title);
  });

  it("says each thing in English and in Bangla, so both kinds of search meet the page", () => {
    for (const page of seoPages) {
      expect(page.title, page.path).toMatch(BANGLA);
      expect(page.title, page.path).toMatch(/[A-Za-z]/);
      expect(page.description, page.path).toMatch(BANGLA);
      expect(page.description, page.path).toMatch(/[A-Za-z]/);
    }
  });

  it("keeps each line short enough that a search result does not cut it off", () => {
    for (const page of seoPages) {
      expect(Array.from(page.title).length, `${page.path} title`).toBeLessThanOrEqual(65);
      expect(Array.from(page.description).length, `${page.path} description`).toBeLessThanOrEqual(165);
    }
  });

  it("names the site in every title", () => {
    for (const page of seoPages) expect(page.title, page.path).toContain("Connect Tutors");
  });
});

describe("finding a page's title", () => {
  it("is the page's own, or the site's for a panel or a page that is not listed", () => {
    expect(seoTitleFor("/contact")).toBe(findSeoPage("/contact")?.title);
    expect(seoTitleFor("/admin/matching")).toBe(defaultSeoPage.title);
    expect(seoTitleFor("/tutor/dashboard")).toBe(defaultSeoPage.title);
  });
});

describe("a page's one address", () => {
  it("has no trailing slash and no query, except the home page, which is the bare site with its slash", () => {
    expect(canonicalUrl(SITE, "/")).toBe("https://connecttutorsbd.com/");
    expect(canonicalUrl(SITE, "/contact")).toBe("https://connecttutorsbd.com/contact");
    expect(canonicalUrl(SITE, "/contact/")).toBe("https://connecttutorsbd.com/contact");
  });
});

describe("telling a search engine what the site is", () => {
  it("names the organisation and the website, both pointing at the published address", () => {
    const [organization, website] = organizationJsonLd(SITE);
    expect(organization).toMatchObject({ "@type": "Organization", name: "Connect Tutors", url: "https://connecttutorsbd.com/", logo: "https://connecttutorsbd.com/pwa-512x512.png", areaServed: { name: "Bangladesh" } });
    expect(website).toMatchObject({ "@type": "WebSite", name: "Connect Tutors", url: "https://connecttutorsbd.com/", inLanguage: ["en", "bn"] });
  });
});
