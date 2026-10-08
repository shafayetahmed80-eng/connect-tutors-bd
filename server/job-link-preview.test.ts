import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ listPublishedTutorJobs: vi.fn() }));

import { buildJobPreviewDescription, buildJobPreviewTags, escapeHtml, injectJobPreview, registerJobLinkPreview, type PreviewJob } from "./job-link-preview";

const SITE = "https://connecttutorsbd.com";

const job: PreviewJob = {
  jobId: "6945",
  title: "Need English Medium Tutor for Class 8 Student - 3 Days / Week",
  tuitionType: "home",
  locationLabel: "Mirpur 10, Dhaka",
  budgetAmount: 8000,
};

const INDEX = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content="Connect Tutors — a simple tutor matching platform." />
    <title>Connect Tutors | Build your learning connection</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

describe("buildJobPreviewDescription", () => {
  it("reads place, salary and Job ID on one line", () => {
    expect(buildJobPreviewDescription(job)).toBe("Mirpur 10, Dhaka · 8,000 Taka · Job ID 6945");
  });

  it("leaves out what the Guardian did not give", () => {
    expect(buildJobPreviewDescription({ ...job, budgetAmount: null, locationLabel: null })).toBe("Job ID 6945");
  });

  it("says online for an online tuition", () => {
    expect(buildJobPreviewDescription({ ...job, tuitionType: "online", locationLabel: null })).toContain("Online");
  });
});

describe("buildJobPreviewTags", () => {
  it("names the job as the card's headline and points back at the shared link", () => {
    const tags = buildJobPreviewTags(job, SITE);

    expect(tags).toContain(`<meta property="og:title" content="${job.title}" />`);
    expect(tags).toContain(`<meta property="og:url" content="${SITE}/job-board?job=6945" />`);
    expect(tags).toContain(`<meta property="og:image" content="${SITE}/pwa-512x512.png" />`);
    expect(tags).toContain(`<meta name="twitter:card" content="summary" />`);
  });

  it("escapes anything a title or place could use to break out of the tag", () => {
    const hostile = buildJobPreviewTags({ ...job, title: `A "quoted" <b>&</b> title`, locationLabel: `<script>alert(1)</script>` }, SITE);

    expect(hostile).not.toContain("<script>");
    expect(hostile).not.toContain("<b>");
    expect(hostile).toContain("A &quot;quoted&quot; &lt;b&gt;&amp;&lt;/b&gt; title");
    expect(escapeHtml(`'`)).toBe("&#39;");
  });
});

describe("injectJobPreview", () => {
  it("puts the tags in the head and retitles the page for the job, leaving the body alone", () => {
    const html = injectJobPreview(INDEX, job, SITE);

    expect(html).toContain(`<title>${job.title} | Connect Tutors</title>`);
    expect(html).toContain(`<meta name="description" content="Mirpur 10, Dhaka · 8,000 Taka · Job ID 6945" />`);
    expect(html.indexOf(`og:title`)).toBeLessThan(html.indexOf("</head>"));
    expect(html).toContain(`<body><div id="root"></div></body>`);
    expect(html).not.toContain("Build your learning connection");
  });
});

describe("GET /job-board?job=<ID>", () => {
  const findJob = vi.fn();
  const readIndexHtml = vi.fn();

  function app() {
    const server = express();
    registerJobLinkPreview(server, "unused", { findJob, readIndexHtml, publicSiteUrl: () => SITE });
    // What the single-page app does for every address nobody else answered.
    server.use("*", (_request, response) => response.type("html").send("<html>plain index</html>"));
    return server;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    readIndexHtml.mockReturnValue(INDEX);
    findJob.mockResolvedValue(job);
  });

  it("answers a live tuition's link with the page and that tuition's preview tags", async () => {
    const response = await request(app()).get("/job-board?job=6945").expect(200);

    expect(findJob).toHaveBeenCalledWith("6945");
    expect(response.text).toContain(`og:title" content="${job.title}"`);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.headers["cache-control"]).toBe("no-cache");
  });

  it("leaves the plain Job Board alone", async () => {
    const response = await request(app()).get("/job-board").expect(200);

    expect(response.text).toBe("<html>plain index</html>");
    expect(findJob).not.toHaveBeenCalled();
  });

  it("does not look anything up for a value that is not a Job ID", async () => {
    for (const bad of ["abc", "69'45", "", "6945&job=1"]) {
      const response = await request(app()).get(`/job-board?job=${encodeURIComponent(bad)}`).expect(200);
      expect(response.text).toBe("<html>plain index</html>");
    }
    expect(findJob).not.toHaveBeenCalled();
  });

  it("ignores a repeated job parameter instead of picking one", async () => {
    const response = await request(app()).get("/job-board?job=6945&job=6946").expect(200);

    expect(response.text).toBe("<html>plain index</html>");
    expect(findJob).not.toHaveBeenCalled();
  });

  it("falls through to the normal page when the tuition is no longer live", async () => {
    findJob.mockResolvedValue(null);

    const response = await request(app()).get("/job-board?job=6945").expect(200);

    expect(response.text).toBe("<html>plain index</html>");
  });

  it("still opens the page when the lookup or the file read fails", async () => {
    findJob.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:3306"));
    const first = await request(app()).get("/job-board?job=6945").expect(200);
    expect(first.text).toBe("<html>plain index</html>");

    findJob.mockResolvedValue(job);
    readIndexHtml.mockImplementation(() => { throw new Error("ENOENT"); });
    const second = await request(app()).get("/job-board?job=6945").expect(200);
    expect(second.text).toBe("<html>plain index</html>");
    expect(second.text).not.toContain("10.0.0.5");
  });
});
