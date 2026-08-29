# WhatsApp Notification Setup Notes

Guardian tutor request submit হওয়ার পরে Admin WhatsApp notification পাঠাতে official **WhatsApp Cloud API** ব্যবহার করা হবে। এটি server-side থেকে request submission event-এ সরাসরি API call করবে; কোনো polling বা persistent background process প্রয়োজন নেই।

## Required Meta configuration

| Configuration | Purpose |
|---|---|
| Meta app with WhatsApp use case | Business message sending capability |
| WhatsApp Business Account and sending phone-number ID | Outbound sender identity and API endpoint |
| Permanent system-user access token | Server-only bearer authentication |
| Admin WhatsApp recipient number | New request alert destination |
| Approved utility template name and language | Reliable alerts outside a WhatsApp customer-service window |

The server should keep the permanent token, phone-number ID, recipient number, template name, and template language in secrets/environment configuration. It must never expose the token to the browser or commit it to source control.

## Delivery behavior

The request should first be stored in MySQL. The server then calls the Cloud API Messages endpoint with a concise utility-template payload containing only the information needed for the Admin to act: request ID, subject, class/level, tuition mode, and area. The UI must show a successful tutor-request submission even if the notification call has a temporary failure; the server should log the failure and return notification status separately.

Meta documentation distinguishes API acceptance from confirmed delivery. Actual delivered/read status requires the optional status webhook; this can be added as a later phase.

## Cost note as of August 2026

The standalone WhatsApp Business mobile app is free to use. Meta's WhatsApp Business Platform documentation says service messages and utility messages sent in response to users are currently not charged, but Meta has announced pricing updates effective August 1 and October 1, 2026. A Guardian tutor-request alert sent to the Admin is an outbound operational notification, so it should be implemented with an approved utility template and its precise charge must be checked in Meta's live pricing dashboard before production launch. Setup of a Meta app and initial test messaging can be done without a website subscription fee, but a production integration can incur provider/API charges depending on the applicable message type, recipient country, and policy window.

## References

- [WhatsApp Cloud API Get Started](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started) — setup, test sender, permanent system-user token, and required permissions.
- [Service messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages) — message endpoint, customer-service window, and delivery-status webhook behavior.
- [Template fundamentals](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview) — approved templates for sending outside the customer-service window and template variables.
- [WhatsApp Business Platform pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) — current pricing and announced August/October 2026 updates.
