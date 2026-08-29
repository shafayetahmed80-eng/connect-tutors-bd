const BANGLADESH_MOBILE_PATTERN = /^\+8801[3-9]\d{8}$/;

export class GuardianIntakeValidationError extends Error {
  constructor(message = "Enter a valid Bangladesh mobile number.") {
    super(message);
    this.name = "GuardianIntakeValidationError";
  }
}

/**
 * Converts a Bangladeshi local or international mobile value into the single
 * private storage form used by Guardian intake records. This capture does not
 * verify ownership of the phone number.
 */
export function normalizeBangladeshMobile(value: string): string {
  const compact = value.trim().replace(/[\s-]/g, "");
  const canonical = compact.startsWith("01")
    ? `+880${compact.slice(1)}`
    : compact;

  if (!BANGLADESH_MOBILE_PATTERN.test(canonical)) {
    throw new GuardianIntakeValidationError();
  }

  return canonical;
}
