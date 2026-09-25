import { describe, expect, it } from "vitest";
import { confirmationLetterVerifyPath, formatLetterVerificationCode, normalizeLetterVerificationCode } from "@shared/confirmation-letter";
import { ENV } from "./_core/env";
import { letterVerificationCode, letterVerificationUrl, matchesLetterVerificationCode } from "./confirmation-letter-verification";

const secret = "test-secret";

describe("a letter's verification code", () => {
  it("is ten symbols that cannot be misread as each other", () => {
    const code = letterVerificationCode("CTB-2026-000019-V1", secret);
    expect(code).toMatch(/^[2-9A-HJ-NP-Z]{10}$/);
  });

  it("is the same every time for the same letter, and different for every other", () => {
    expect(letterVerificationCode("CTB-2026-000019-V1", secret)).toBe(letterVerificationCode("CTB-2026-000019-V1", secret));
    expect(letterVerificationCode("CTB-2026-000019-V2", secret)).not.toBe(letterVerificationCode("CTB-2026-000019-V1", secret));
    expect(letterVerificationCode("CTB-2026-000019-V1", "another-secret")).not.toBe(letterVerificationCode("CTB-2026-000019-V1", secret));
  });

  it("accepts the code however someone types it, and nothing else", () => {
    const code = letterVerificationCode("CTB-2026-000019-V1", secret);
    expect(matchesLetterVerificationCode("CTB-2026-000019-V1", code, secret)).toBe(true);
    expect(matchesLetterVerificationCode("CTB-2026-000019-V1", ` ${formatLetterVerificationCode(code).toLowerCase()} `, secret)).toBe(true);
    expect(matchesLetterVerificationCode("CTB-2026-000019-V2", code, secret)).toBe(false);
    expect(matchesLetterVerificationCode("CTB-2026-000019-V1", code.slice(0, 9), secret)).toBe(false);
    expect(matchesLetterVerificationCode("CTB-2026-000019-V1", "", secret)).toBe(false);
  });

  it("refuses to make codes without the server's secret", () => {
    expect(() => letterVerificationCode("CTB-2026-000019-V1", "")).toThrow(/JWT_SECRET/);
  });

  it("goes into a link on the public site", () => {
    const code = letterVerificationCode("CTB-2026-000019-V1", secret);
    expect(letterVerificationUrl("CTB-2026-000019-V1", secret)).toBe(`${ENV.publicSiteUrl}/verify/CTB-2026-000019-V1/${code}`);
  });
});

describe("printing and reading codes", () => {
  it("prints a code in two halves and reads it back whatever the case or dashes", () => {
    expect(formatLetterVerificationCode("ABCDEFGHJK")).toBe("ABCDE-FGHJK");
    expect(normalizeLetterVerificationCode(" abcde-fghjk ")).toBe("ABCDEFGHJK");
  });

  it("builds the check page's address from a typed Letter ID and code", () => {
    expect(confirmationLetterVerifyPath(" ctb-2026-000019-v1 ", "abcde-fghjk")).toBe("/verify/CTB-2026-000019-V1/ABCDEFGHJK");
  });
});
