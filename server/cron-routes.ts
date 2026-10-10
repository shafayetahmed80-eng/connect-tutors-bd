import { createHash, timingSafeEqual } from "node:crypto";
import type { Express } from "express";
import { isReminderHour } from "@shared/payment-reminders";
import { ENV } from "./_core/env";
import { runPaymentReminders } from "./db";

/** A shorter secret is not one worth trusting, so it is treated as no secret at all. */
const MIN_SECRET_LENGTH = 24;

type CronDependencies = {
  secret: () => string;
  now: () => Date;
  runPaymentReminders: typeof runPaymentReminders;
};

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * The address the host's scheduler calls to run the day's payment reminders
 * (scripts/run-payment-reminders.sh). It answers only to the secret in CRON_SECRET,
 * sent as the `x-cron-secret` header; with none set it does not exist. The run is
 * safe to repeat - a reminder is sent once - so the scheduler can call it every
 * hour, and outside 08:00-20:59 Dhaka time it does nothing at all.
 * `?dryRun=1` only counts what a run would send.
 */
export function registerCronRoutes(app: Express, overrides: Partial<CronDependencies> = {}) {
  const dependencies: CronDependencies = {
    secret: () => ENV.cronSecret,
    now: () => new Date(),
    runPaymentReminders,
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
}
