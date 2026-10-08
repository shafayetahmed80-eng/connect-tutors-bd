-- Every time the app has written until now is stored six hours early on this host.
--
-- The database server keeps its own clock in Asia/Dhaka, and the app used to
-- connect in that same zone while writing UTC clock text, so a Date it wrote
-- was read back correctly but stored as a moment six hours before the real one.
-- From now on the app connects in UTC (server/database-connection.ts), and a
-- stored TIMESTAMP is then the real moment, which is also what the database's
-- own defaults (createdAt, updatedAt) have always stored. This moves the
-- columns the APP wrote forward by the server's offset from UTC, once.
--
-- The offset is read from the server itself (TIMESTAMPDIFF over UTC_TIMESTAMP()
-- and NOW(), both in this session's zone), so a database that already keeps UTC
-- gets an offset of 0 and nothing moves. Columns the database filled by default
-- are already right and are left alone, as are DATE columns, which have no
-- zone. updatedAt is set to itself so the shift does not look like an edit.
-- users.sessionsValidFrom is left alone: migration 0110 stored it with NOW(),
-- which is already the real moment.
--
-- Not shifted, because their rows cannot be told apart: notification rows whose
-- createdAt the app wrote on a repeat send (a day of rows at most on the live
-- site).
UPDATE `account_change_requests` SET `decidedAt` = DATE_ADD(`decidedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `updatedAt` = `updatedAt`;
--> statement-breakpoint
UPDATE `admin_two_factor_recovery_codes` SET `usedAt` = DATE_ADD(`usedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND);
--> statement-breakpoint
UPDATE `admin_two_factor_settings` SET `enabledAt` = DATE_ADD(`enabledAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `lastVerifiedAt` = DATE_ADD(`lastVerifiedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `smsPhoneVerifiedAt` = DATE_ADD(`smsPhoneVerifiedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `updatedAt` = `updatedAt`;
--> statement-breakpoint
UPDATE `confirmation_letters` SET `reviewedAt` = DATE_ADD(`reviewedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `issuedAt` = DATE_ADD(`issuedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `supersededAt` = DATE_ADD(`supersededAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND);
--> statement-breakpoint
UPDATE `guardian_phone_intakes` SET `handoffExpiresAt` = DATE_ADD(`handoffExpiresAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `phoneVerifiedAt` = DATE_ADD(`phoneVerifiedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `completedAt` = DATE_ADD(`completedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `updatedAt` = `updatedAt`;
--> statement-breakpoint
UPDATE `guardian_profiles` SET `verifiedAt` = DATE_ADD(`verifiedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `updatedAt` = `updatedAt`;
--> statement-breakpoint
UPDATE `guardian_request_notifications` SET `readAt` = DATE_ADD(`readAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND);
--> statement-breakpoint
UPDATE `guardian_tuition_requests` SET `decidedAt` = DATE_ADD(`decidedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `updatedAt` = `updatedAt`;
--> statement-breakpoint
UPDATE `password_reset_links` SET `expiresAt` = DATE_ADD(`expiresAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `usedAt` = DATE_ADD(`usedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `revokedAt` = DATE_ADD(`revokedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND);
--> statement-breakpoint
UPDATE `phone_verification_codes` SET `expiresAt` = DATE_ADD(`expiresAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `consumedAt` = DATE_ADD(`consumedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND);
--> statement-breakpoint
UPDATE `tuition_payments` SET `paidAt` = DATE_ADD(`paidAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `decidedAt` = DATE_ADD(`decidedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `updatedAt` = `updatedAt`;
--> statement-breakpoint
UPDATE `tutor_admin_chat_messages` SET `tutorReactedAt` = DATE_ADD(`tutorReactedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `adminReactedAt` = DATE_ADD(`adminReactedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND);
--> statement-breakpoint
UPDATE `tutor_admin_chat_threads` SET `lastMessageAt` = DATE_ADD(`lastMessageAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `tutorLastReadAt` = DATE_ADD(`tutorLastReadAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `adminLastReadAt` = DATE_ADD(`adminLastReadAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `archivedAt` = DATE_ADD(`archivedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND);
--> statement-breakpoint
UPDATE `tutor_confirmation_letter_notifications` SET `readAt` = DATE_ADD(`readAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND);
--> statement-breakpoint
UPDATE `tutor_job_interests` SET `shortlistedAt` = DATE_ADD(`shortlistedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `endedAt` = DATE_ADD(`endedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `guardianShortlistedAt` = DATE_ADD(`guardianShortlistedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `appointmentRequestedAt` = DATE_ADD(`appointmentRequestedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `updatedAt` = `updatedAt`;
--> statement-breakpoint
UPDATE `tutor_jobs` SET `publishedAt` = DATE_ADD(`publishedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `expiresAt` = DATE_ADD(`expiresAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `deactivatedAt` = DATE_ADD(`deactivatedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `updatedAt` = `updatedAt`;
--> statement-breakpoint
UPDATE `tutor_notifications` SET `readAt` = DATE_ADD(`readAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND);
--> statement-breakpoint
UPDATE `tutor_portal_sessions` SET `expiresAt` = DATE_ADD(`expiresAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `revokedAt` = DATE_ADD(`revokedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `lastSeenAt` = DATE_ADD(`lastSeenAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND);
--> statement-breakpoint
UPDATE `tutor_requests` SET `guardianConfirmedAt` = DATE_ADD(`guardianConfirmedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `guardianReconfirmedAt` = DATE_ADD(`guardianReconfirmedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `appointmentConfirmedAt` = DATE_ADD(`appointmentConfirmedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `appointedAt` = DATE_ADD(`appointedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `cancelledAt` = DATE_ADD(`cancelledAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `lastActivityAt` = DATE_ADD(`lastActivityAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND);
--> statement-breakpoint
UPDATE `tutor_reviews` SET `hiddenAt` = DATE_ADD(`hiddenAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `updatedAt` = `updatedAt`;
--> statement-breakpoint
UPDATE `tutor_university_id_documents` SET `uploadedAt` = DATE_ADD(`uploadedAt`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `updatedAt` = `updatedAt`;
--> statement-breakpoint
UPDATE `users` SET `lastSignedIn` = DATE_ADD(`lastSignedIn`, INTERVAL TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) SECOND), `updatedAt` = `updatedAt`;
