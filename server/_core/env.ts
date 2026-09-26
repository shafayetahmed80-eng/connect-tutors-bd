export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? "",
  // SMS gateway (BulkSMSBD). With no key outside production, codes are only
  // printed to the terminal; OTP_DEV_LOG=true forces that even with a key.
  smsApiUrl: process.env.SMS_API_URL ?? "https://bulksmsbd.net/api/smsapi",
  smsApiKey: process.env.SMS_API_KEY ?? "",
  smsSenderId: process.env.SMS_SENDER_ID ?? "",
  otpDevLog: process.env.OTP_DEV_LOG === "true",
  // Where the public site lives, for links printed on paper - the QR code on a
  // Confirmation Letter. No trailing slash.
  publicSiteUrl: (process.env.PUBLIC_SITE_URL ?? "https://connecttutorsbd.com").replace(/\/+$/, ""),
};
