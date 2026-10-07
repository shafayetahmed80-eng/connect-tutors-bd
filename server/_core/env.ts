export const ENV = {
  // The session verifier rejects a token whose appId is empty, so an unset VITE_APP_ID
  // would sign every Admin in and then fail to recognise them. Any non-empty value works.
  appId: process.env.VITE_APP_ID?.trim() || "connect-tutors-bd",
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
  // The last line of a code SMS, "@host #1234", is what lets Android and iPhone fill the code into the page by themselves.
  // Set OTP_DOMAIN_LINE=false to send the plain wording again if the SMS provider ever turns the extra line away.
  otpDomainLine: process.env.OTP_DOMAIN_LINE !== "false",
  // Web push (phone lock-screen alerts). Both keys, or push stays off: the settings toggle is hidden and nothing is sent.
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  // Where the public site lives, for links printed on paper - the QR code on a
  // Confirmation Letter. No trailing slash.
  publicSiteUrl: (process.env.PUBLIC_SITE_URL ?? "https://connecttutorsbd.com").replace(/\/+$/, ""),
};
