ALTER TABLE `tutor_requests` ADD `lastActivityAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
CREATE INDEX `tutor_requests_last_activity_idx` ON `tutor_requests` (`lastActivityAt`);
