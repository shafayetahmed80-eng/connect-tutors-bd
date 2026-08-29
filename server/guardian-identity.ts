const OPAQUE_GUARDIAN_ID_TOKEN = /^[A-Z0-9]{8}$/;

export class GuardianIdentityError extends Error {
  constructor(message = "Guardian ID token is invalid") {
    super(message);
    this.name = "GuardianIdentityError";
  }
}

/**
 * Converts a cryptographically generated opaque token into the Guardian-facing
 * support ID. The token must never be derived from a user or request primary key.
 */
export function guardianIdFromOpaqueToken(token: string) {
  const normalized = token.trim().toUpperCase();
  if (!OPAQUE_GUARDIAN_ID_TOKEN.test(normalized)) {
    throw new GuardianIdentityError();
  }
  return `GDN-${normalized}`;
}
