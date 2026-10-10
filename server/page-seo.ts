import type { Express } from "express";
import fs from "fs";
import { canonicalUrl, organizationJsonLd, seoPages, SEO_SITE_NAME, type SeoPage } from "@shared/seo";
import { ENV } from "./_core/env";
import { escapeHtml } from "./job-link-preview";

/** JSON inside a `<script>` must not be able to close it. */
function jsonForScript(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/** The tags that tell a search engine, and a chat app drawing a link card, what this page is. */
export function buildPageSeoTags(page: SeoPage, publicSiteUrl: string): string {
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const url = escapeHtml(canonicalUrl(publicSiteUrl, page.path));
  const image = escapeHtml(`${publicSiteUrl}/pwa-512x512.png`);
  const tags = [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SEO_SITE_NAME}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="512" />`,
    `<meta property="og:image:height" content="512" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:locale:alternate" content="bn_BD" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
  ];
  if (page.path === "/") tags.push(`<script type="application/ld+json">${jsonForScript(organizationJsonLd(publicSiteUrl))}</script>`);
  return tags.join("\n    ");
}

/** The page's own title and description, in place of the site's one-size-fits-all pair, plus the tags above. */
export function injectPageSeo(html: string, page: SeoPage, publicSiteUrl: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, () => `<meta name="description" content="${escapeHtml(page.description)}" />`)
    .replace("</head>", () => `    ${buildPageSeoTags(page, publicSiteUrl)}\n  </head>`);
}

type PageSeoDependencies = {
  readIndexHtml: () => string;
  publicSiteUrl: () => string;
};

/**
 * Every public page answers with the app's HTML and its own title, description,
 * canonical address and share-card tags already in it, so a search engine or a
 * chat app that does not run the page's scripts still learns what the page is.
 * Anyone else gets the same page they always did.
 *
 * A Job Board link that names a tuition (`?job=`) is the link preview's, which is
 * registered first and answers it; if that one passes, this serves the general
 * Job Board tags. Registered before the single-page app's catch-all.
 */
export function registerPageSeo(app: Express, indexPath: string, overrides: Partial<PageSeoDependencies> = {}) {
  const dependencies: PageSeoDependencies = {
    readIndexHtml: () => fs.readFileSync(indexPath, "utf-8"),
    publicSiteUrl: () => ENV.publicSiteUrl,
    ...overrides,
  };

  for (const page of seoPages) {
    app.get(page.path, (_request, response, next) => {
      try {
        const html = injectPageSeo(dependencies.readIndexHtml(), page, dependencies.publicSiteUrl());
        // The page itself changes with every deploy, so it is revalidated, not kept.
        response.status(200).set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" }).send(html);
      } catch {
        // The tags are a nicety; the page must still open.
        next();
      }
    });
  }
}
