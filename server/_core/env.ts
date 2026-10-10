function parseTrustedProxyHops(value: string | undefined) {
  const hops = Number.parseInt(value ?? "", 10);
  return Number.isInteger(hops) && hops >= 0 && hops <= 5 ? hops : 1;
}

export const ENV = {
  // The session verifier rejects a token whose appId is empty, so an unset VITE_APP_ID
  // would sign every Admin in and then fail to recognise them. Any non-empty value works.
  appId: process.env.VITE_APP_ID?.trim() || "connect-tutors-bd",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // How many web servers of ours sit in front of the app and add the visitor's address to X-Forwarded-For.
  // 1 = the host's web server alone; 2 = a service such as Cloudflare in front of that; 0 = ignore the header.
  trustedProxyHops: parseTrustedProxyHops(process.env.TRUSTED_PROXY_HOPS),
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
  // The secret the host's scheduler sends to run the daily payment reminders (scripts/run-payment-reminders.sh).
  // With none set the address does not exist and no reminder is sent.
  cronSecret: process.env.CRON_SECRET ?? "",
  publicSiteUrl: (process.env.PUBLIC_SITE_URL ?? "https://connecttutorsbd.com").replace(/\/+$/, ""),
};
