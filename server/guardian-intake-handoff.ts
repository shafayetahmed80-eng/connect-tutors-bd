import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const VERSION = "v1";

type HandoffPayload = {
  token: string;
  expiresAtMs: number;
};

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function createSignature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(`${VERSION}.${payload}`).digest("base64url");
}

function parsePayload(encodedPayload: string): HandoffPayload | null {
  try {
    const parsed = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<HandoffPayload>;
    const expiresAtMs = parsed.expiresAtMs;
    if (
      typeof parsed.token !== "string" ||
      !/^[A-Za-z0-9_-]{32,}$/.test(parsed.token) ||
      typeof expiresAtMs !== "number" ||
      !Number.isSafeInteger(expiresAtMs)
    ) {
      return null;
    }
    return { token: parsed.token, expiresAtMs };
  } catch {
    return null;
  }
}

function signaturesMatch(expected: string, received: string) {
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

export function createGuardianIntakeHandoff(input: {
  secret: string;
  now?: Date;
  ttlMs: number;
}) {
  if (!input.secret) throw new Error("Guardian intake handoff signing secret is required.");
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + input.ttlMs);
  const token = randomBytes(32).toString("base64url");
  const payload = base64UrlEncode(JSON.stringify({ token, expiresAtMs: expiresAt.getTime() }));
  const signature = createSignature(payload, input.secret);

  return {
    cookieValue: `${VERSION}.${payload}.${signature}`,
    tokenHash: createHash("sha256").update(token).digest("hex"),
    expiresAt,
  };
}

export function verifyGuardianIntakeHandoff(
  cookieValue: string | undefined,
  input: { secret: string; now?: Date }
) {
  if (!cookieValue || !input.secret) return null;
  const [version, payload, receivedSignature, ...remainingParts] = cookieValue.split(".");
  if (version !== VERSION || !payload || !receivedSignature || remainingParts.length > 0) return null;

  const expectedSignature = createSignature(payload, input.secret);
  if (!signaturesMatch(expectedSignature, receivedSignature)) return null;

  const decoded = parsePayload(payload);
  if (!decoded || decoded.expiresAtMs <= (input.now ?? new Date()).getTime()) return null;

  return {
    tokenHash: createHash("sha256").update(decoded.token).digest("hex"),
  };
}
