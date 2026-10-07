import { describe, expect, it } from "vitest";
import { productionSettingsProblems } from "./production-check";

const good = {
  cookieSecret: "a".repeat(48),
  databaseUrl: "mysql://user:pass@localhost:3306/app",
  ownerOpenId: "owner-open-id",
  smsApiKey: "key",
  smsSenderId: "sender",
  otpDevLog: false,
  vapidPublicKey: "public-key",
  vapidPrivateKey: "private-key",
};

describe("production settings check", () => {
  it("lets a fully configured server start without a word", () => {
    expect(productionSettingsProblems(good)).toEqual({ fatal: [], warnings: [] });
  });

  it("refuses to start without a database or with a guessable session secret", () => {
    expect(productionSettingsProblems({ ...good, databaseUrl: "" }).fatal).toEqual(["DATABASE_URL is not set."]);
    expect(productionSettingsProblems({ ...good, cookieSecret: "" }).fatal[0]).toContain("JWT_SECRET");
    expect(productionSettingsProblems({ ...good, cookieSecret: "short" }).fatal[0]).toContain("JWT_SECRET");
  });

  it("starts but warns when the Owner id, the SMS settings or the dev log are wrong", () => {
    const result = productionSettingsProblems({ ...good, ownerOpenId: "", smsApiKey: "", otpDevLog: true });
    expect(result.fatal).toEqual([]);
    expect(result.warnings).toHaveLength(3);
    expect(productionSettingsProblems({ ...good, vapidPrivateKey: "" }).warnings.join(" ")).toContain("VAPID");
    expect(result.warnings.join(" ")).toContain("OWNER_OPEN_ID");
    expect(result.warnings.join(" ")).toContain("SMS_API_KEY");
    expect(result.warnings.join(" ")).toContain("OTP_DEV_LOG");
  });
});
