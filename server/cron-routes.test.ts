import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ runPaymentReminders: vi.fn() }));

import { registerCronRoutes } from "./cron-routes";

const SECRET = "s".repeat(40);
const midday = new Date("2026-10-10T06:00:00Z"); // 12:00 in Dhaka
const lateNight = new Date("2026-10-10T20:00:00Z"); // 02:00 the next day in Dhaka
const run = vi.fn();
let secret = SECRET;
let now = midday;

function app() {
  const server = express();
  registerCronRoutes(server, { secret: () => secret, now: () => now, runPaymentReminders: run });
  // What the single-page app does for every address nobody else answered.
  server.use("*", (_request, response) => response.type("html").send("<html>index</html>"));
  return server;
}

beforeEach(() => {
  vi.clearAllMocks();
  secret = SECRET;
  now = midday;
  run.mockResolvedValue({ checked: 4, sent: 2, counts: { window: 1, second: 0, overdue: 1 }, dryRun: false });
});

describe("/api/cron/payment-reminders", () => {
  it("runs the reminders for a caller that knows the secret, and tells them what went out", async () => {
    const response = await request(app()).post("/api/cron/payment-reminders").set("x-cron-secret", SECRET).expect(200);

    expect(response.body).toEqual({ checked: 4, sent: 2, counts: { window: 1, second: 0, overdue: 1 }, dryRun: false });
    expect(run).toHaveBeenCalledWith({ now: midday, dryRun: false });
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("turns away a missing or wrong secret without running anything", async () => {
    await request(app()).post("/api/cron/payment-reminders").expect(401);
    await request(app()).post("/api/cron/payment-reminders").set("x-cron-secret", "w".repeat(40)).expect(401);
    await request(app()).post("/api/cron/payment-reminders").set("x-cron-secret", SECRET.slice(0, -1)).expect(401);
    expect(run).not.toHaveBeenCalled();
  });

  it("does not exist while no secret, or a short one, is set", async () => {
    for (const unset of ["", "short"]) {
      secret = unset;
      const response = await request(app()).post("/api/cron/payment-reminders").set("x-cron-secret", unset).expect(404);
      expect(response.body).toEqual({ error: "Not found" });
    }
    expect(run).not.toHaveBeenCalled();
  });

  it("answers a plain browser visit like any other missing page, not as a way in", async () => {
    const response = await request(app()).get("/api/cron/payment-reminders").set("x-cron-secret", SECRET);
    expect(response.text).toContain("index");
    expect(run).not.toHaveBeenCalled();
  });

  it("does nothing in the small hours, so an hourly schedule is safe", async () => {
    now = lateNight;

    const response = await request(app()).post("/api/cron/payment-reminders").set("x-cron-secret", SECRET).expect(200);

    expect(response.body).toEqual({ skipped: "outside 08:00-20:59 Dhaka time" });
    expect(run).not.toHaveBeenCalled();
  });

  it("only counts, at any hour, when asked for a dry run", async () => {
    now = lateNight;
    run.mockResolvedValue({ checked: 4, sent: 2, counts: { window: 1, second: 0, overdue: 1 }, dryRun: true });

    const response = await request(app()).post("/api/cron/payment-reminders?dryRun=1").set("x-cron-secret", SECRET).expect(200);

    expect(response.body.dryRun).toBe(true);
    expect(run).toHaveBeenCalledWith({ now: lateNight, dryRun: true });
  });

  it("reports a failure as a failure, without the reason", async () => {
    run.mockRejectedValue(new Error("connection refused on 10.0.0.5"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await request(app()).post("/api/cron/payment-reminders").set("x-cron-secret", SECRET).expect(500);

    expect(response.body).toEqual({ error: "The reminders could not be run." });
    expect(JSON.stringify(response.body)).not.toContain("10.0.0.5");
  });
});
