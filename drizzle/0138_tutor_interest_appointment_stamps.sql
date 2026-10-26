ALTER TABLE `tutor_job_interests` ADD `appointedAt` timestamp;
--> statement-breakpoint
ALTER TABLE `tutor_job_interests` ADD `appointmentConfirmedAt` timestamp;
--> statement-breakpoint
UPDATE `tutor_job_interests` tji
INNER JOIN `tutor_jobs` tj ON tji.`tutorJobId` = tj.`id`
INNER JOIN `tutor_requests` tr ON tj.`tutorRequestId` = tr.`id`
SET tji.`appointedAt` = tr.`appointedAt`,
    tji.`appointmentConfirmedAt` = tr.`appointmentConfirmedAt`
WHERE tr.`tutorId` = tji.`tutorId` AND tr.`appointedAt` IS NOT NULL;
