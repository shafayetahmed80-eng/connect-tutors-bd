/**
 * Sends one SMS through BulkSMSBD (non-masking sender for now).
 *
 * Two safety valves keep development cheap and honest:
 * - with no API key outside production, or with OTP_DEV_LOG=true, the message
 *   is printed to the terminal instead of sent;
 * - in production with no key it refuses, so a missing setting shows up as an
 *   error instead of codes silently going nowhere.
 *
 * The provider answers `{ response_code: 202 }` on success; every other code is
 * a failure (see OTP_AND_EMAIL_VERIFICATION_SETUP_BN.md for the table).
 */
import { ENV } from "./_core/env";
import { sendTelegramAdminText } from "./telegram-notification";

export type SmsResult = { sent: true; devLogged: boolean } | { sent: false; providerCode: number | null; reason: string };

/** Provider codes that mean the account can send nothing until the Owner acts. */
const OWNER_ACTION_CODES: Record<number, string> = {
  1006: "SMS balance validity has ended",
  1007: "SMS balance is used up",
  1031: "the SMS account is not verified",
  1032: "this server's IP is not whitelisted at the SMS provider",
};

/** BulkSMSBD wants 8801XXXXXXXXX - our canonical form without the plus. */
export function smsNumber(phone: string) {
  return phone.replace(/^\+/, "");
}

export type SmsBalance =
  | { configured: false }
  | { configured: true; balance: number }
  | { configured: true; balance: null; problem: string };

/** The Taka left on the BulkSMSBD account, for the Owner's sign-in report. */
export async function getSmsBalance(fetchImpl: typeof fetch = fetch): Promise<SmsBalance> {
  if (!ENV.smsApiKey) return { configured: false };
  const url = ENV.smsApiUrl.replace(/\/smsapi\/?$/, "/getBalanceApi");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetchImpl(url, { method: "POST", body: new URLSearchParams({ api_key: ENV.smsApiKey }), signal: controller.signal });
    const payload = await response.json().catch(() => null) as { balance?: unknown; response_code?: unknown } | null;
    const balance = typeof payload?.balance === "number" ? payload.balance : Number.parseFloat(String(payload?.balance ?? ""));
    if (Number.isFinite(balance)) return { configured: true, balance };
    const code = Number(payload?.response_code ?? NaN);
    const known = Number.isFinite(code) ? OWNER_ACTION_CODES[code] : undefined;
    return { configured: true, balance: null, problem: known ?? (Number.isFinite(code) ? `BulkSMSBD answered ${code}` : "BulkSMSBD gave no balance") };
  } catch {
    return { configured: true, balance: null, problem: "BulkSMSBD could not be reached" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendSms(phone: string, message: string, fetchImpl: typeof fetch = fetch): Promise<SmsResult> {
  if (ENV.otpDevLog || (!ENV.smsApiKey && !ENV.isProduction)) {
    console.info(`[sms-dev] to ${smsNumber(phone)}: ${message}`);
    return { sent: true, devLogged: true };
  }
  if (!ENV.smsApiKey || !ENV.smsSenderId) return { sent: false, providerCode: null, reason: "SMS is not configured on this server." };

  const body = new URLSearchParams({ api_key: ENV.smsApiKey, type: "text", number: smsNumber(phone), senderid: ENV.smsSenderId, message });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetchImpl(ENV.smsApiUrl, { method: "POST", body, signal: controller.signal });
    const payload = await response.json().catch(() => null) as { response_code?: unknown } | null;
    const code = typeof payload?.response_code === "number" ? payload.response_code : Number(payload?.response_code ?? NaN);
    if (code === 202) return { sent: true, devLogged: false };
    const providerCode = Number.isFinite(code) ? code : null;
    const ownerAction = providerCode !== null ? OWNER_ACTION_CODES[providerCode] : undefined;
    if (ownerAction) void sendTelegramAdminText(`Connect Tutors: verification SMS failed - ${ownerAction} (BulkSMSBD code ${providerCode}).`);
    return { sent: false, providerCode, reason: ownerAction ?? `SMS provider answered ${providerCode ?? response.status}.` };
  } catch (error) {
    return { sent: false, providerCode: null, reason: error instanceof Error && error.name === "AbortError" ? "SMS provider did not answer in time." : "SMS provider could not be reached." };
  } finally {
    clearTimeout(timeout);
  }
}
