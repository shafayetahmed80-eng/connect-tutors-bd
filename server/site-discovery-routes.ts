import type { Express, Request } from "express";
import { buildRobotsTxt, buildSitemapXml, isCanonicalHost } from "@shared/site-discovery";
import { ENV } from "./_core/env";
import { pingDatabase } from "./db";

/** A monitor asking every few seconds should not become a database load of its own. */
const HEALTH_CACHE_MS = 10_000;

type SiteDiscoveryDependencies = {
  pingDatabase: () => Promise<boolean>;
  publicSiteUrl: () => string;
  now: () => number;
};

function requestHost(request: Request) {
  const forwarded = request.headers["x-forwarded-host"];
  const raw = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0] ?? request.headers.host;
  return raw?.trim();
}

/**
 * `/healthz` for an uptime monitor, and `/robots.txt` and `/sitemap.xml` for
 * search engines. All three must be registered before the single-page app's
 * catch-all, which would otherwise answer each of them with index.html.
 */
export function registerSiteDiscoveryRoutes(app: Express, overrides: Partial<SiteDiscoveryDependencies> = {}) {
  const dependencies: SiteDiscoveryDependencies = {
    pingDatabase,
    publicSiteUrl: () => ENV.publicSiteUrl,
    now: Date.now,
    ...overrides,
  };
  let lastHealth: { ok: boolean; at: number } | null = null;

  app.get("/healthz", async (_request, response) => {
    response.set("Cache-Control", "no-store");
    const now = dependencies.now();
    if (!lastHealth || now - lastHealth.at >= HEALTH_CACHE_MS) {
      lastHealth = { ok: await dependencies.pingDatabase().catch(() => false), at: now };
    }
    response.status(lastHealth.ok ? 200 : 503).json({ status: lastHealth.ok ? "ok" : "unavailable" });
  });

  app.get("/robots.txt", (request, response) => {
    const publicSiteUrl = dependencies.publicSiteUrl();
    response.type("text/plain").send(buildRobotsTxt(publicSiteUrl, isCanonicalHost(requestHost(request), publicSiteUrl)));
  });

  app.get("/sitemap.xml", (request, response) => {
    const publicSiteUrl = dependencies.publicSiteUrl();
    if (!isCanonicalHost(requestHost(request), publicSiteUrl)) {
      response.status(404).type("text/plain").send("Not found");
      return;
    }
    response.type("application/xml").send(buildSitemapXml(publicSiteUrl));
  });
}
