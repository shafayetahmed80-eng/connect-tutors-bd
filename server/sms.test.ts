import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV } from "./_core/env";
import * as telegram from "./telegram-notification";
import { getSmsBalance, sendSms, smsNumber } from "./sms";

const saved = { ...ENV };

function providerReplies(body: unknown) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

beforeEach(() => {
  Object.assign(ENV, { smsApiKey: "test-key", smsSenderId: "8809617623229", smsApiUrl: "https://bulksmsbd.net/api/smsapi", otpDevLog: false, isProduction: true });
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(telegram, "sendTelegramAdminText").mockResolvedValue(true);
});
afterEach(() => {
  Object.assign(ENV, saved);
  vi.restoreAllMocks();
});

describe("sendSms (BulkSMSBD)", () => {
  it("posts the key, sender and number without the plus, and treats 202 as sent", async () => {
    const fetchImpl = providerReplies({ response_code: 202, success_message: "SMS Submitted Successfully" });

    await expect(sendSms("+8801712345678", "Your Connect Tutors OTP is 1234", fetchImpl)).resolves.toEqual({ sent: true, devLogged: false });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://bulksmsbd.net/api/smsapi");
    const body = new URLSearchParams(String(init!.body));
    expect(Object.fromEntries(body)).toEqual({ api_key: "test-key", type: "text", number: "8801712345678", senderid: "8809617623229", message: "Your Connect Tutors OTP is 1234" });
  });

  it("reports any other code as not sent", async () => {
    await expect(sendSms("+8801712345678", "x", providerReplies({ response_code: 1001 }))).resolves.toMatchObject({ sent: false, providerCode: 1001 });
    expect(telegram.sendTelegramAdminText).not.toHaveBeenCalled();
  });

  it("tells the Admin chat when the Owner has to act - balance used up, IP not whitelisted", async () => {
    await expect(sendSms("+8801712345678", "x", providerReplies({ response_code: 1007 }))).resolves.toMatchObject({ sent: false, providerCode: 1007, reason: "SMS balance is used up" });
    await expect(sendSms("+8801712345678", "x", providerReplies({ response_code: "1032" }))).resolves.toMatchObject({ sent: false, providerCode: 1032 });
    expect(telegram.sendTelegramAdminText).toHaveBeenCalledTimes(2);
    expect(vi.mocked(telegram.sendTelegramAdminText).mock.calls[1]![0]).toContain("not whitelisted");
  });

  it("only prints the message with OTP_DEV_LOG, even with a key", async () => {
    ENV.otpDevLog = true;
    const fetchImpl = providerReplies({ response_code: 202 });

    await expect(sendSms("+8801712345678", "Your Connect Tutors OTP is 1234", fetchImpl)).resolves.toEqual({ sent: true, devLogged: true });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith("[sms-dev] to 8801712345678: Your Connect Tutors OTP is 1234");
  });

  it("refuses in production without a key instead of pretending", async () => {
    ENV.smsApiKey = "";
    await expect(sendSms("+8801712345678", "x", providerReplies({ response_code: 202 }))).resolves.toMatchObject({ sent: false, reason: "SMS is not configured on this server." });
  });

  it("logs instead of sending on a developer machine with no key", async () => {
    Object.assign(ENV, { smsApiKey: "", isProduction: false });
    await expect(sendSms("+8801712345678", "x", providerReplies({ response_code: 202 }))).resolves.toEqual({ sent: true, devLogged: true });
  });

  it("reads the balance from the provider's balance API", async () => {
    const fetchImpl = providerReplies({ response_code: 202, balance: 523.75 });
    await expect(getSmsBalance(fetchImpl)).resolves.toEqual({ configured: true, balance: 523.75 });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://bulksmsbd.net/api/getBalanceApi");
    expect(Object.fromEntries(new URLSearchParams(String(init!.body)))).toEqual({ api_key: "test-key" });
  });

  it("accepts a balance sent as text", async () => {
    await expect(getSmsBalance(providerReplies({ balance: "98.50" }))).resolves.toEqual({ configured: true, balance: 98.5 });
  });

  it("explains a refused balance request instead of showing a number", async () => {
    await expect(getSmsBalance(providerReplies({ response_code: 1032 }))).resolves.toEqual({ configured: true, balance: null, problem: "this server's IP is not whitelisted at the SMS provider" });
  });

  it("says not set up without a key, and asks nothing", async () => {
    ENV.smsApiKey = "";
    const fetchImpl = providerReplies({ balance: 1 });
    await expect(getSmsBalance(fetchImpl)).resolves.toEqual({ configured: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("strips only the plus from the number", () => {
    expect(smsNumber("+8801712345678")).toBe("8801712345678");
  });
});
