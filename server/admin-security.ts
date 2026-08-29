import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { Secret, TOTP } from "otpauth";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const RECOVERY_CODE_COUNT = 10;

function deriveEncryptionKey(keyMaterial: string) {
  if (!keyMaterial) {
    throw new Error("Admin security encryption key material is not configured");
  }

  return createHash("sha256").update(`connect-tutors-admin-2fa:${keyMaterial}`).digest();
}

function timingSafeTextEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * Encrypts the TOTP seed at rest. The authentication key is deliberately
 * derived from server-only JWT material and is never returned to a client.
 */
export function encryptAdminSecret(secret: string, keyMaterial: string) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, deriveEncryptionKey(keyMaterial), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64url"), authTag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptAdminSecret(encryptedSecret: string, keyMaterial: string) {
  const [ivEncoded, authTagEncoded, ciphertextEncoded, ...extraParts] = encryptedSecret.split(".");
  if (!ivEncoded || !authTagEncoded || !ciphertextEncoded || extraParts.length > 0) {
    throw new Error("Stored Admin two-factor secret is invalid");
  }

  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    deriveEncryptionKey(keyMaterial),
    Buffer.from(ivEncoded, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagEncoded, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function generateAdminInviteToken() {
  return randomBytes(32).toString("hex");
}

export function hashAdminInviteToken(token: string, keyMaterial: string) {
  return createHmac("sha256", deriveEncryptionKey(keyMaterial)).update(token).digest("hex");
}

/**
 * Creates a tamper-evident, short-lived proof that a specific Admin completed
 * the current session's second factor. The proof contains no credential data.
 */
export function createAdminTwoFactorSessionProof(userId: number, keyMaterial: string, expiresAtMs: number) {
  const payload = `${userId}.${expiresAtMs}`;
  const signature = createHmac("sha256", deriveEncryptionKey(keyMaterial)).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAdminTwoFactorSessionProof(proof: string | undefined, userId: number, keyMaterial: string, nowMs = Date.now()) {
  if (!proof) return false;
  const [claimedUserId, expiresAtText, signature, ...extraParts] = proof.split(".");
  if (!claimedUserId || !expiresAtText || !signature || extraParts.length > 0) return false;
  const expiresAtMs = Number(expiresAtText);
  if (claimedUserId !== String(userId) || !Number.isSafeInteger(expiresAtMs) || expiresAtMs <= nowMs) return false;
  const payload = `${claimedUserId}.${expiresAtText}`;
  const expectedSignature = createHmac("sha256", deriveEncryptionKey(keyMaterial)).update(payload).digest("base64url");
  return timingSafeTextEqual(signature, expectedSignature);
}

export function generateRecoveryCodes() {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const raw = randomBytes(8).toString("hex").toUpperCase();
    return raw.match(/.{1,4}/g)?.join("-") ?? raw;
  });
}

export function normalizeRecoveryCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashRecoveryCode(code: string, keyMaterial: string) {
  return createHmac("sha256", deriveEncryptionKey(keyMaterial))
    .update(normalizeRecoveryCode(code))
    .digest("hex");
}

/** Returns a matching index; callers must delete that exact hash transactionally. */
export function consumeRecoveryCode(code: string, storedHashes: string[], keyMaterial: string) {
  const candidateHash = hashRecoveryCode(code, keyMaterial);
  const index = storedHashes.findIndex(storedHash => timingSafeTextEqual(storedHash, candidateHash));
  return index >= 0 ? index : null;
}

export function generateAdminTotpSecret() {
  return new Secret({ size: 20 }).base32;
}

export function createAdminTotp(secret: string, issuer: string, accountName: string) {
  return new TOTP({
    issuer,
    label: accountName,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
}

export function validateAdminTotpCode(secret: string, code: string, issuer: string, accountName: string) {
  const token = code.trim();
  if (!/^\d{6}$/.test(token)) return false;

  return createAdminTotp(secret, issuer, accountName).validate({ token, window: 1 }) !== null;
}
