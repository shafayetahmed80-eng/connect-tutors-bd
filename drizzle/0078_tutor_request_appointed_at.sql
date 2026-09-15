ALTER TABLE `tutor_requests` ADD COLUMN `appointedAt` timestamp NULL;--> statement-breakpoint
-- An appointment already made: the Admin's appointment event when there is one, else the request's last activity.
UPDATE `tutor_requests` r SET r.`appointedAt` = COALESCE((SELECT MAX(e.`createdAt`) FROM `tutor_request_operation_events` e WHERE e.`tutorRequestId` = r.`id` AND e.`action` = 'admin_appointed'), r.`lastActivityAt`) WHERE r.`status` = 'matched' AND r.`tutorId` IS NOT NULL;
