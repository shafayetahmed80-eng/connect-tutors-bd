type Settings = {
  cookieSecret: string;
  databaseUrl: string;
  ownerOpenId: string;
  smsApiKey: string;
  smsSenderId: string;
  otpDevLog: boolean;
};

/** Short enough to guess is short enough to forge a session with. */
const MIN_SECRET_LENGTH = 32;

/**
 * What a production start-up must have before it is allowed to serve anyone.
 * `fatal` stops the server with a plain message; `warnings` are things that
 * leave the site up but break one feature (a missing SMS key means no sign-up
 * code ever arrives), so they are shouted in the log instead.
 */
export function productionSettingsProblems(settings: Settings) {
  const fatal: string[] = [];
  const warnings: string[] = [];

  if (!settings.databaseUrl) fatal.push("DATABASE_URL is not set.");
  if (settings.cookieSecret.length < MIN_SECRET_LENGTH) {
    fatal.push(`JWT_SECRET must be set to a random string of at least ${MIN_SECRET_LENGTH} characters; it signs every session and every sign-in code.`);
  }

  if (!settings.ownerOpenId) warnings.push("OWNER_OPEN_ID is not set, so nobody can open the Owner-only Admin pages.");
  if (!settings.smsApiKey || !settings.smsSenderId) warnings.push("SMS_API_KEY / SMS_SENDER_ID are not set, so no sign-up, sign-in or password-reset code can be sent.");
  if (settings.otpDevLog) warnings.push("OTP_DEV_LOG is true, so codes are printed to this log instead of being texted. Remove it.");

  return { fatal, warnings };
}
