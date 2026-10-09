import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ listPublishedTutorJobs: vi.fn() }));

import { seoPages } from "../shared/seo";
import { escapeHtml } from "./job-link-preview";
import { buildPageSeoTags, injectPageSeo, registerPageSeo } from "./page-seo";

const SITE = "https://connecttutorsbd.com";

const INDEX = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content="Connect Tutors — a simple tutor matching platform." />
    <title>Connect Tutors | Build your learning connection</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

const contact = seoPages.find(page => page.path === "/contact")!;
const home = seoPages.find(page => page.path === "/")!;

function app(overrides: Parameters<typeof registerPageSeo>[2] = {}) {
  const server = express();
  registerPageSeo(server, "unused", { readIndexHtml: () => INDEX, publicSiteUrl: () => SITE, ...overrides });
  server.use("*", (_request, response) => response.status(200).send("the app as it always was"));
  return server;
}

describe("a public page's tags", () => {
  it("carries its canonical address, share card and both languages' locale", () => {
    const tags = buildPageSeoTags(contact, SITE);
    expect(tags).toContain('<link rel="canonical" href="https://connecttutorsbd.com/contact" />');
    expect(tags).toContain(`<meta property="og:title" content="${contact.title}" />`);
    expect(tags).toContain('<meta property="og:url" content="https://connecttutorsbd.com/contact" />');
    expect(tags).toContain('<meta property="og:image" content="https://connecttutorsbd.com/pwa-512x512.png" />');
    expect(tags).toContain('<meta property="og:locale:alternate" content="bn_BD" />');
    expect(tags).toContain('<meta name="twitter:card" content="summary" />');
  });

  it("says what the site is, but only on the home page", () => {
    expect(buildPageSeoTags(home, SITE)).toContain('<script type="application/ld+json">');
    expect(buildPageSeoTags(home, SITE)).toContain('"@type":"Organization"');
    expect(buildPageSeoTags(contact, SITE)).not.toContain("ld+json");
  });

  it("cannot be talked out of its own script tag by what is written in it", () => {
    const tags = buildPageSeoTags({ ...home, title: "a</script><script>alert(1)</script>", description: "x" }, SITE);
    expect(tags).not.toContain("<script>alert(1)");
    expect(tags).toContain("&lt;/script&gt;");
    const ld = tags.split('<script type="application/ld+json">')[1]!.split("</script>")[0]!;
    expect(() => JSON.parse(ld)).not.toThrow();
    expect(ld).not.toContain("</");
  });
});

describe("putting a page's tags into the app's HTML", () => {
  it("replaces the site-wide title and description and adds the tags before the head closes", () => {
    const html = injectPageSeo(INDEX, contact, SITE);
    expect(html).toContain(`<title>${contact.title}</title>`);
    expect(html).toContain(`<meta name="description" content="${contact.description}" />`);
    expect(html).not.toContain("Build your learning connection");
    expect(html.indexOf('rel="canonical"')).toBeLessThan(html.indexOf("</head>"));
    expect(html).toContain('<div id="root"></div>');
  });
});

describe("answering a public page", () => {
  it.each(seoPages.map(page => [page.path, page] as const))("%s answers with its own title and canonical address", async (path, page) => {
    const response = await request(app()).get(path);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.headers["cache-control"]).toBe("no-cache");
    expect(response.text).toContain(`<title>${escapeHtml(page.title)}</title>`);
    expect(response.text).toContain(`rel="canonical" href="${path === "/" ? `${SITE}/` : `${SITE}${path}`}"`);
  });

  it("serves the Job Board's general tags when no tuition is named, and the same address when asked with a query", async () => {
    const response = await request(app()).get("/job-board?utm_source=facebook");

    expect(response.text).toContain(`rel="canonical" href="${SITE}/job-board"`);
  });

  it("leaves a panel, a sign-in or any other path to the app, untouched", async () => {
    for (const path of ["/admin/matching", "/tutor/dashboard", "/login", "/something-else"]) {
      const response = await request(app()).get(path);
      expect(response.text, path).toBe("the app as it always was");
    }
  });

  it("falls through to the app, and the page still opens, if the HTML cannot be read", async () => {
    const response = await request(app({ readIndexHtml: () => { throw new Error("no file"); } })).get("/contact");

    expect(response.status).toBe(200);
    expect(response.text).toBe("the app as it always was");
  });
});
