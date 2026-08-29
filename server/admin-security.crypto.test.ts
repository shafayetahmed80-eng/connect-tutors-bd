import { describe, expect, it } from "vitest";
import {
  createAdminTwoFactorSessionProof,
  consumeRecoveryCode,
  createAdminTotp,
  decryptAdminSecret,
  encryptAdminSecret,
  generateAdminInviteToken,
  generateRecoveryCodes,
  hashAdminInviteToken,
  hashRecoveryCode,
  validateAdminTotpCode,
  verifyAdminTwoFactorSessionProof,
} from "./admin-security";

const TEST_KEY = "a stable test-only key material that is long enough for encryption";

describe("Admin security cryptographic helpers", () => {
  it("encrypts a TOTP secret without retaining it in plaintext and decrypts only with the correct key", () => {
    const encrypted = encryptAdminSecret("JBSWY3DPEHPK3PXP", TEST_KEY);

    expect(encrypted).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptAdminSecret(encrypted, TEST_KEY)).toBe("JBSWY3DPEHPK3PXP");
    expect(() => decryptAdminSecret(encrypted, "another key material")).toThrow();
  });

  it("creates HMAC-bound invitation tokens that can be checked without storing the raw invitation link", () => {
    const token = generateAdminInviteToken();
    const storedHash = hashAdminInviteToken(token, TEST_KEY);

    expect(token).toHaveLength(64);
    expect(storedHash).not.toContain(token);
    expect(hashAdminInviteToken(token, TEST_KEY)).toBe(storedHash);
    expect(hashAdminInviteToken(`${token}x`, TEST_KEY)).not.toBe(storedHash);
  });

  it("allows each recovery code to be consumed exactly once", () => {
    const codes = generateRecoveryCodes();
    const storedHashes = codes.map(code => hashRecoveryCode(code, TEST_KEY));

    const consumed = consumeRecoveryCode(codes[0], storedHashes, TEST_KEY);
    expect(consumed).toBe(0);

    const remainingHashes = storedHashes.filter((_, index) => index !== consumed);
    expect(consumeRecoveryCode(codes[0], remainingHashes, TEST_KEY)).toBeNull();
    expect(consumeRecoveryCode(codes[1], remainingHashes, TEST_KEY)).toBe(0);
  });

  it("accepts a current authenticator-app TOTP code and rejects an unrelated code", () => {
    const totp = createAdminTotp("JBSWY3DPEHPK3PXP", "Connect Tutors BD", "admin@example.com");
    const currentCode = totp.generate();

    expect(validateAdminTotpCode("JBSWY3DPEHPK3PXP", currentCode, "Connect Tutors BD", "admin@example.com")).toBe(true);
    expect(validateAdminTotpCode("JBSWY3DPEHPK3PXP", "000000", "Connect Tutors BD", "admin@example.com")).toBe(false);
  });

  it("binds a short-lived two-factor session proof to one Admin account", () => {
    const now = Date.now();
    const proof = createAdminTwoFactorSessionProof(42, TEST_KEY, now + 60_000);

    expect(verifyAdminTwoFactorSessionProof(proof, 42, TEST_KEY, now)).toBe(true);
    expect(verifyAdminTwoFactorSessionProof(proof, 43, TEST_KEY, now)).toBe(false);
    expect(verifyAdminTwoFactorSessionProof(`${proof}tampered`, 42, TEST_KEY, now)).toBe(false);
    expect(verifyAdminTwoFactorSessionProof(proof, 42, TEST_KEY, now + 60_001)).toBe(false);
  });
});
