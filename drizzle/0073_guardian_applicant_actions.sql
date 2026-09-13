-- A Guardian's own marks on an application, kept apart from `status`, which is
-- the Admin's: a Guardian shortlisting a Tutor must not move them in the Admin's
-- queue, and an Admin decision must not wipe the Guardian's list.
ALTER TABLE `tutor_job_interests` ADD COLUMN `guardianShortlistedAt` timestamp NULL DEFAULT NULL;--> statement-breakpoint
ALTER TABLE `tutor_job_interests` ADD COLUMN `appointmentRequestedAt` timestamp NULL DEFAULT NULL;
