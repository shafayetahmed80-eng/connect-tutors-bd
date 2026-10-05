import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ pingDatabase: vi.fn() }));

import { sitemapPaths } from "@shared/site-discovery";
import { registerSiteDiscoveryRoutes } from "./site-discovery-routes";

const SITE = "https://connecttutorsbd.com";
const ping = vi.fn();
let clock = 1_000_000;

function app() {
  const server = express();
  registerSiteDiscoveryRoutes(server, { pingDatabase: ping, publicSiteUrl: () => SITE, now: () => clock });
  // What the single-page app does for every address nobody else answered.
  server.use("*", (_request, response) => response.type("html").send("<html>index</html>"));
  return server;
}

beforeEach(() => {
  vi.clearAllMocks();
  clock += 60_000;
  ping.mockResolvedValue(true);
});

describe("/healthz", () => {
  it("says ok while the database answers, and is never cached by the caller", async () => {
    const response = await request(app()).get("/healthz").expect(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("answers 503 when the database does not, without saying why", async () => {
    ping.mockResolvedValue(false);
    const response = await request(app()).get("/healthz").expect(503);
    expect(response.body).toEqual({ status: "unavailable" });
  });

  it("treats a database that throws as unavailable", async () => {
    ping.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:3306"));
    const response = await request(app()).get("/healthz").expect(503);
    expect(JSON.stringify(response.body)).not.toContain("10.0.0.5");
  });

  it("asks the database once for a burst of checks, and again after ten seconds", async () => {
    const server = app();
    await request(server).get("/healthz");
    await request(server).get("/healthz");
    await request(server).head("/healthz");
    expect(ping).toHaveBeenCalledTimes(1);

    clock += 11_000;
    await request(server).get("/healthz");
    expect(ping).toHaveBeenCalledTimes(2);
  });
});

describe("/robots.txt", () => {
  it("is plain text, not the app's index page, and points at the sitemap", async () => {
    const response = await request(app()).get("/robots.txt").set("Host", "connecttutorsbd.com").expect(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.text).toContain("Disallow: /admin");
    expect(response.text).toContain(`Sitemap: ${SITE}/sitemap.xml`);
    expect(response.text).not.toContain("<html>");
  });

  it("answers for the bare and the www address alike, behind a proxy too", async () => {
    await request(app()).get("/robots.txt").set("Host", "www.connecttutorsbd.com").expect(200).expect(res => expect(res.text).toContain("Sitemap:"));
    await request(app()).get("/robots.txt").set("Host", "10.0.0.2:3000").set("X-Forwarded-Host", "connecttutorsbd.com").expect(200).expect(res => expect(res.text).toContain("Sitemap:"));
  });

  it("closes the whole site off on staging and on a laptop", async () => {
    for (const host of ["staging.connecttutorsbd.com", "localhost:3000"]) {
      const response = await request(app()).get("/robots.txt").set("Host", host).expect(200);
      expect(response.text).toBe("User-agent: *\nDisallow: /\n");
    }
  });
});

describe("/sitemap.xml", () => {
  it("lists the public pages as XML on the published address", async () => {
    const response = await request(app()).get("/sitemap.xml").set("Host", "connecttutorsbd.com").expect(200);
    expect(response.headers["content-type"]).toContain("application/xml");
    for (const path of sitemapPaths) expect(response.text).toContain(`<loc>${SITE}${path}</loc>`);
  });

  it("does not exist anywhere but the published address", async () => {
    await request(app()).get("/sitemap.xml").set("Host", "staging.connecttutorsbd.com").expect(404);
    await request(app()).get("/sitemap.xml").set("Host", "localhost:3000").expect(404);
  });
});
