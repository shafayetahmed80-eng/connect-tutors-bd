import { describe, expect, it } from "vitest";

const telegramConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_CHAT_ID);

// Telegram is optional. Only assert the credential shape when at least one of
// the variables is present (CI / a configured deployment); skip on a bare
// local checkout where notifications are simply not wired up.
describe.skipIf(!telegramConfigured)("Telegram notification credentials", () => {
  it("validates the configured credential shape without requiring network access", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    expect(token, "TELEGRAM_BOT_TOKEN must be configured").toBeTruthy();
    expect(chatId, "TELEGRAM_CHAT_ID must be configured").toBeTruthy();
    expect(token).toMatch(/^\d+:[A-Za-z0-9_-]+$/);
    expect(chatId).toMatch(/^-?\d+$/);

    if (process.env.TELEGRAM_LIVE_CHECK !== "1") return;

    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: AbortSignal.timeout(10_000),
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      result?: { is_bot?: boolean };
    };

    expect(response.ok).toBe(true);
    expect(payload.ok).toBe(true);
    expect(payload.result?.is_bot).toBe(true);
  }, 15_000);
});
