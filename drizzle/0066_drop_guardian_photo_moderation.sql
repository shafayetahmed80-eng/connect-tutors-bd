-- Guardian profile photos go live on upload; the moderation step is removed.
-- Drops the append-only events table and every moderation column on the photo
-- row, leaving just the storage-key reference. Destructive and one-way; the
-- site is pre-launch with only demo data.
DROP TABLE `guardian_profile_photo_events`;--> statement-breakpoint

ALTER TABLE `guardian_profile_photos` DROP FOREIGN KEY `guardian_profile_photos_moderatedByAdminId_users_id_fk`;--> statement-breakpoint
DROP INDEX `guardian_profile_photos_moderatedByAdminId_users_id_fk` ON `guardian_profile_photos`;--> statement-breakpoint
DROP INDEX `guardian_profile_photos_status_updated_idx` ON `guardian_profile_photos`;--> statement-breakpoint

ALTER TABLE `guardian_profile_photos`
  DROP COLUMN `status`,
  DROP COLUMN `rejectionReason`,
  DROP COLUMN `moderationNote`,
  DROP COLUMN `moderatedByAdminId`,
  DROP COLUMN `moderatedAt`;
