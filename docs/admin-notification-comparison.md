# Admin notification decision: Telegram vs transactional email

## Decision

The project uses **Telegram Bot notifications** for new Guardian tutor requests. The product owner approved the decision as **T (Telegram)**. WhatsApp request-alert delivery is superseded for this release; the existing WhatsApp contact action remains available for direct user contact.

## Comparison

| Criterion | Telegram Bot | Transactional email |
|---|---|---|
| Cost for the approved small-volume workflow | No per-message provider fee; requires a BotFather token and destination chat ID | Usually requires an email provider, verified sender/domain, and provider quota or paid plan beyond free limits |
| Setup | One bot token plus one private destination chat ID | SMTP/API credentials, sender configuration, domain verification, and deliverability setup |
| Delivery speed | Near-real-time message delivery in the admin's existing Telegram app | Fast when delivered, but subject to provider and mailbox processing delays |
| Privacy boundary | Server sends a minimal request alert to one configured private chat; Guardian phone/email and request details are excluded from the message | Requires a third-party mail provider and sender infrastructure; message content must also be minimized and provider privacy reviewed |
| Failure handling | Bot API errors are caught and represented as non-blocking notification status; request persistence remains successful | Provider/API failure handling would require retries, bounce handling, and sender/deliverability monitoring |
| Operational trade-off | Admin must keep the bot destination private and maintain the token/chat ID | Email is more universal, but operational setup and deliverability maintenance are higher for this stage |

## Safety controls implemented

Telegram credentials are stored only as server-side secrets named `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. The message builder uses an allowlisted, privacy-minimized request summary and never includes Guardian phone, email, raw request notes, or other sensitive personal data. Telegram delivery is best-effort and does not roll back a successfully stored Guardian request when the Bot API is unavailable.

## Deferred alternative

Transactional email can be added later if the operating model requires mailbox-based notifications, multiple recipients, delivery receipts, or audit-friendly email threads. That would require a separately approved integration and provider credentials; it is not part of the current Telegram milestone.
