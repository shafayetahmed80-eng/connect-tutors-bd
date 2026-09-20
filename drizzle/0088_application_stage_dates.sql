ALTER TABLE `tutor_requests` ADD `cancelledAt` timestamp;
--> statement-breakpoint
ALTER TABLE `tutor_job_interests` ADD `shortlistedAt` timestamp;
--> statement-breakpoint
ALTER TABLE `tutor_job_interests` ADD `endedAt` timestamp;
--> statement-breakpoint
-- The stages already happened; their dates are recovered from the row's own
-- last change, which for a row resting at that stage is when it got there.
UPDATE `tutor_job_interests` SET `shortlistedAt` = `updatedAt` WHERE `status` = 'shortlisted';
--> statement-breakpoint
UPDATE `tutor_job_interests` SET `endedAt` = `updatedAt` WHERE `status` in ('declined', 'withdrawn');
--> statement-breakpoint
UPDATE `tutor_requests` SET `cancelledAt` = `lastActivityAt` WHERE `status` = 'closed' OR `publicationState` = 'closed';
