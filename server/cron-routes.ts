import { createHash, timingSafeEqual } from "node:crypto";
import type { Express } from "express";
import { isReminderHour } from "@shared/payment-reminders";
import { ENV } from "./_core/env";
import { purgeExpiredTutorAdminChatMessages, runPaymentReminders } from "./db";

/** A shorter secret is not one worth trusting, so it is treated as no secret at all. */
const MIN_SECRET_LENGTH = 24;

type CronDependencies = {
  secret: () => string;
  now: () => Date;
  runPaymentReminders: typeof runPaymentReminders;
  purgeExpiredTutorAdminChatMessages: typeof purgeExpiredTutorAdminChatMessages;
};

const digest = (value: string) => createHash("sha256").update(value).digest();

let chatPurgeSchedulerTimer: NodeJS.Timeout | null = null;

/**
 * Starts an in-process daily scheduler for purging expired (> 30 days) chat messages.
 * Uses unref() so process exits cleanly in test or CLI runners.
 */
export function startChatPurgeScheduler(intervalMs = 24 * 60 * 60 * 1000) {
  if (chatPurgeSchedulerTimer) return;
  const initialDelayMs = 60 * 1000;
  const initialTimer = setTimeout(() => {
    void purgeExpiredTutorAdminChatMessages().catch(error => console.error("[scheduler] chat purge failed:", error));
    chatPurgeSchedulerTimer = setInterval(() => {
      void purgeExpiredTutorAdminChatMessages().catch(error => console.error("[scheduler] chat purge failed:", error));
    }, intervalMs);
    chatPurgeSchedulerTimer.unref();
  }, initialDelayMs);
  initialTimer.unref();
}

/**
 * The address the host's scheduler calls to run the day's payment reminders
 * (scripts/run-payment-reminders.sh) and chat message retention purges.
 */
export function registerCronRoutes(app: Express, overrides: Partial<CronDependencies> = {}) {
  const dependencies: CronDependencies = {
    secret: () => ENV.cronSecret,
    now: () => new Date(),
    runPaymentReminders,
    purgeExpiredTutorAdminChatMessages,
    ...overrides,
  };

  app.post("/api/cron/payment-reminders", async (request, response) => {
    response.set("Cache-Control", "no-store");
    const secret = dependencies.secret();
    if (secret.length < MIN_SECRET_LENGTH) {
      response.status(404).json({ error: "Not found" });
      return;
    }
    // Both sides are hashed first so the comparison takes the same time whatever the guess.
    if (!timingSafeEqual(digest(request.header("x-cron-secret") ?? ""), digest(secret))) {
      response.status(401).json({ error: "Unauthorized" });
      return;
    }

    const now = dependencies.now();
    const dryRun = request.query.dryRun === "1";
    if (!dryRun && !isReminderHour(now)) {
      response.json({ skipped: "outside 08:00-20:59 Dhaka time" });
      return;
    }
    try {
      response.json(await dependencies.runPaymentReminders({ now, dryRun }));
    } catch (error) {
      console.error("[cron] payment reminders failed:", error);
      response.status(500).json({ error: "The reminders could not be run." });
    }
  });

  app.post("/api/cron/purge-expired-chat", async (request, response) => {
    response.set("Cache-Control", "no-store");
    const secret = dependencies.secret();
    if (secret.length < MIN_SECRET_LENGTH) {
      response.status(404).json({ error: "Not found" });
      return;
    }
    if (!timingSafeEqual(digest(request.header("x-cron-secret") ?? ""), digest(secret))) {
      response.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const days = typeof request.query.days === "string" ? parseInt(request.query.days, 10) || 30 : 30;
      const result = await dependencies.purgeExpiredTutorAdminChatMessages(days);
      response.json(result);
    } catch (error) {
      console.error("[cron] chat purge failed:", error);
      response.status(500).json({ error: "Failed to purge expired chat messages." });
    }
  });
}

