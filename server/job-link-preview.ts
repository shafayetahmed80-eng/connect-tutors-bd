import type { Express } from "express";
import fs from "fs";
import { isJobIdNumber } from "@shared/job-id";
import { formatLocation } from "@shared/job-card";
import { formatSalaryAmount } from "@shared/salary-amount";
import { buildJobShareUrl } from "@shared/job-share";
import { ENV } from "./_core/env";
import { listPublishedTutorJobs } from "./db";

/** What a link preview needs to know about one live tuition; all of it is already public on the Job Board. */
export type PreviewJob = {
  jobId: string;
  title: string;
  tuitionType: string;
  locationLabel: string | null;
  budgetAmount: number | null;
};

const SITE_NAME = "Connect Tutors";

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** "Mirpur 10, Dhaka · 8,000 Taka · Job ID 6945": the line under the headline in a chat app. */
export function buildJobPreviewDescription(job: PreviewJob): string {
  const parts: string[] = [];
  if (job.tuitionType === "online" || job.locationLabel?.trim()) parts.push(formatLocation({ tuitionType: job.tuitionType, locationLabel: job.locationLabel }));
  if (job.budgetAmount !== null && Number.isFinite(job.budgetAmount)) parts.push(formatSalaryAmount(job.budgetAmount));
  parts.push(`Job ID ${job.jobId}`);
  return parts.join(" · ");
}

/** The tags a chat app reads to draw a card for the link. */
export function buildJobPreviewTags(job: PreviewJob, publicSiteUrl: string): string {
  const title = escapeHtml(job.title);
  const description = escapeHtml(buildJobPreviewDescription(job));
  const url = escapeHtml(buildJobShareUrl(publicSiteUrl, job.jobId));
  const image = escapeHtml(`${publicSiteUrl}/pwa-512x512.png`);
  return [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="512" />`,
    `<meta property="og:image:height" content="512" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
  ].join("\n    ");
}

/** The page's own title and description follow the job too, for a search result or a browser tab. */
export function injectJobPreview(html: string, job: PreviewJob, publicSiteUrl: string): string {
  const title = `${escapeHtml(job.title)} | ${SITE_NAME}`;
  return html
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${title}</title>`)
    .replace(/<meta name="description"[^>]*>/, () => `<meta name="description" content="${escapeHtml(buildJobPreviewDescription(job))}" />`)
    .replace("</head>", () => `    ${buildJobPreviewTags(job, publicSiteUrl)}\n  </head>`);
}

type LinkPreviewDependencies = {
  readIndexHtml: () => string;
  findJob: (jobId: string) => Promise<PreviewJob | null>;
  publicSiteUrl: () => string;
};

async function findLiveJob(jobId: string): Promise<PreviewJob | null> {
  const { items } = await listPublishedTutorJobs({ page: 1, pageSize: 1, jobId });
  const job = items.find(item => item.jobId === jobId);
  return job ?? null;
}

/**
 * A shared `/job-board?job=<ID>` link answers with the page's own HTML plus
 * preview tags for that job, so WhatsApp and the like draw a card with the
 * tuition's name instead of the site's generic title. Anyone else gets the same
 * page they always did; a job that is gone, or an ID that is not one, falls
 * through to it untouched.
 *
 * Registered before the single-page app's catch-all, which would otherwise
 * answer first.
 */
export function registerJobLinkPreview(app: Express, indexPath: string, overrides: Partial<LinkPreviewDependencies> = {}) {
  const dependencies: LinkPreviewDependencies = {
    readIndexHtml: () => fs.readFileSync(indexPath, "utf-8"),
    findJob: findLiveJob,
    publicSiteUrl: () => ENV.publicSiteUrl,
    ...overrides,
  };

  app.get("/job-board", async (request, response, next) => {
    const jobId = request.query.job;
    if (typeof jobId !== "string" || !isJobIdNumber(jobId)) return next();
    try {
      const job = await dependencies.findJob(jobId);
      if (!job) return next();
      const html = injectJobPreview(dependencies.readIndexHtml(), job, dependencies.publicSiteUrl());
      // The page itself changes with every deploy, so it is revalidated, not kept.
      response.status(200).set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" }).send(html);
    } catch {
      // The preview is a nicety; the page must still open.
      next();
    }
  });
}
